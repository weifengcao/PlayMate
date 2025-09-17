import { DataTypes, Model, Sequelize } from 'sequelize';

export class AgentTask extends Model {
  declare id: string;
  declare type: string;
  declare status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead-letter';
  declare ownerId?: number | null;
  declare payload?: Record<string, unknown> | null;
  declare result?: Record<string, unknown> | null;
  declare error?: string | null;
  declare attempts: number;
  declare maxAttempts: number;
  declare nextRunAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initAgentTask(sequelize: Sequelize) {
  AgentTask.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      type: {
      type: DataTypes.STRING,
      allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'dead-letter'),
        allowNull: false,
        defaultValue: 'pending',
      },
      ownerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'owner_id',
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      maxAttempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
        field: 'max_attempts',
      },
      nextRunAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'next_run_at',
      },
      payload: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      result: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'agent_tasks',
    }
  );
}
