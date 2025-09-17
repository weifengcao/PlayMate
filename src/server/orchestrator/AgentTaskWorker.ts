import { agentOrchestrator } from './AgentOrchestrator';
import { logger } from '../utils/logger';

class AgentTaskWorker {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly intervalMs = 500) {}

  start(): void {
    if (this.timer) {
      return;
    }
    logger.info('Agent task worker starting');
    this.timer = setInterval(() => this.tick(), this.intervalMs);
    agentOrchestrator.onQueued(this.handleQueueSignal);
    void this.tick();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    agentOrchestrator.offQueued(this.handleQueueSignal);
    logger.info('Agent task worker stopped');
  }

  private handleQueueSignal = () => {
    this.tick();
  };

  private async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      while (true) {
        const task = await agentOrchestrator.claimNextReadyTask();
        if (!task) {
          break;
        }
        await agentOrchestrator.runTask(task);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Agent task worker tick failed', { error: message });
    } finally {
      this.running = false;
    }
  }
}

export const agentTaskWorker = new AgentTaskWorker();
