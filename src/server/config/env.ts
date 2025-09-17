export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

const parseLogLevel = (value: string | undefined, fallback: LogLevel): LogLevel => {
  if (!value) {
    return fallback;
  }
  const normalised = value.toLowerCase() as LogLevel;
  return levels.includes(normalised) ? normalised : fallback;
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const appConfig = {
  jwtSecret: process.env.JWT_SECRET ?? 'abcdef0123456789',
  db: {
    dialect: 'postgres',
    database: process.env.DB_NAME ?? 'postgres',
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: parseNumber(process.env.DB_PORT, 5432),
  },
  agentLogLevel: parseLogLevel(process.env.AGENT_LOG_LEVEL, 'info'),
};
