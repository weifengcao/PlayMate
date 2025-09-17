import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { Op, Transaction } from 'sequelize';

import sequelize from '../initSeq';
import { AgentTask } from '../models/AgentTask';
import { logger } from '../utils/logger';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead-letter';

export interface TaskRequest {
  type: string;
  payload?: unknown;
  ownerId?: number;
  maxAttempts?: number;
  scheduleAt?: Date;
}

export interface TaskRecord {
  id: string;
  type: string;
  status: TaskStatus;
  ownerId?: number;
  payload?: unknown;
  result?: unknown;
  error?: string;
  attempts: number;
  maxAttempts: number;
  nextRunAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskHandler = (payload: unknown) => unknown | Promise<unknown>;

class AgentOrchestrator {
  private handlers = new Map<string, TaskHandler>();
  private emitter = new EventEmitter();
  private queueEmitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
    this.queueEmitter.setMaxListeners(0);
  }

  registerHandler(type: string, handler: TaskHandler): void {
    this.handlers.set(type, handler);
  }

  async submit(request: TaskRequest): Promise<TaskRecord> {
    const handler = this.handlers.get(request.type);
    if (!handler) {
      throw new Error(`No handler registered for task type "${request.type}"`);
    }

    const record = await AgentTask.create({
      id: randomUUID(),
      type: request.type,
      status: 'pending',
      ownerId: request.ownerId ?? null,
      payload: request.payload ?? null,
      maxAttempts: request.maxAttempts ?? 3,
      nextRunAt: request.scheduleAt ?? new Date(),
    });

    const task = this.mapRecord(record);
    logger.info('Task submitted', {
      id: task.id,
      type: task.type,
      ownerId: task.ownerId,
      maxAttempts: task.maxAttempts,
    });
    this.queueEmitter.emit('queued');

    return task;
  }

  async getTask(id: string): Promise<TaskRecord | undefined> {
    const record = await AgentTask.findByPk(id);
    return record ? this.mapRecord(record) : undefined;
  }

  onUpdate(listener: (task: TaskRecord) => void): void {
    this.emitter.on('update', listener);
  }

  offUpdate(listener: (task: TaskRecord) => void): void {
    this.emitter.off('update', listener);
  }

  onQueued(listener: () => void): void {
    this.queueEmitter.on('queued', listener);
  }

  offQueued(listener: () => void): void {
    this.queueEmitter.off('queued', listener);
  }

  async claimNextReadyTask(): Promise<TaskRecord | null> {
    return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async (transaction) => {
      const record = await AgentTask.findOne({
        where: {
          status: 'pending',
          nextRunAt: { [Op.lte]: new Date() },
        },
        order: [['createdAt', 'ASC']],
        lock: transaction.LOCK.UPDATE,
        skipLocked: true,
        transaction,
      });

      if (!record) {
        return null;
      }

      await record.update({
        status: 'processing',
        attempts: record.attempts + 1,
      }, { transaction });

      const task = this.mapRecord(record);
      logger.debug('Task claimed for processing', {
        id: task.id,
        type: task.type,
        attempts: task.attempts,
      });
      this.emitter.emit('update', task);
      return task;
    });
  }

  async runTask(task: TaskRecord): Promise<void> {
    const handler = this.handlers.get(task.type);
    if (!handler) {
      logger.error('Task handler missing at execution time', {
        id: task.id,
        type: task.type,
      });
      await AgentTask.update({ status: 'dead-letter', error: `Unknown handler for ${task.type}` }, { where: { id: task.id } });
      const updated = await this.getTask(task.id);
      if (updated) {
        this.emitter.emit('update', updated);
      }
      return;
    }

    try {
      const result = await handler(task.payload ?? undefined);
      await AgentTask.update({ status: 'completed', result: result ?? null, error: null }, { where: { id: task.id } });
      const refreshed = await this.getTask(task.id);
      if (refreshed) {
        logger.info('Task completed', {
          id: task.id,
          type: task.type,
          attempts: refreshed.attempts,
        });
        this.emitter.emit('update', refreshed);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const record = await AgentTask.findByPk(task.id);
      if (!record) {
        logger.error('Task disappeared after failure', { id: task.id, type: task.type });
        return;
      }

      if (record.attempts >= record.maxAttempts) {
        await record.update({ status: 'dead-letter', error: message });
        logger.error('Task moved to dead-letter', {
          id: task.id,
          type: task.type,
          attempts: record.attempts,
          error: message,
        });
        this.emitter.emit('update', this.mapRecord(record));
        return;
      }

      const backoffMs = this.computeBackoff(record.attempts);
      await record.update({
        status: 'pending',
        error: message,
        nextRunAt: new Date(Date.now() + backoffMs),
      });
      logger.warn('Task scheduled for retry', {
        id: task.id,
        type: task.type,
        attempts: record.attempts,
        nextRunAt: record.nextRunAt.toISOString(),
        error: message,
      });
      this.emitter.emit('update', this.mapRecord(record));
      this.queueEmitter.emit('queued');
    }
  }

  private computeBackoff(attempt: number): number {
    const base = 500;
    return base * Math.pow(2, Math.max(0, attempt - 1));
  }

  private mapRecord(record: AgentTask): TaskRecord {
    return {
      id: record.id,
      type: record.type,
      status: record.status,
      ownerId: record.ownerId ?? undefined,
      payload: record.payload ?? undefined,
      result: record.result ?? undefined,
      error: record.error ?? undefined,
      attempts: record.attempts,
      maxAttempts: record.maxAttempts,
      nextRunAt: record.nextRunAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}

export const agentOrchestrator = new AgentOrchestrator();
