import { appConfig, LogLevel } from '../config/env';

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLevel = LEVELS[appConfig.agentLogLevel];

const format = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ?? {}),
  };
  return JSON.stringify(payload);
};

const shouldLog = (level: LogLevel) => LEVELS[level] >= currentLevel;

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('debug')) {
      console.debug(format('debug', message, meta));
    }
  },
  info(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('info')) {
      console.info(format('info', message, meta));
    }
  },
  warn(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('warn')) {
      console.warn(format('warn', message, meta));
    }
  },
  error(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('error')) {
      console.error(format('error', message, meta));
    }
  },
};
