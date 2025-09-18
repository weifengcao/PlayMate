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

const parseStringList = (value: string | undefined, fallback: string[] = []): string[] => {
  if (!value) {
    return fallback;
  }
  const list = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length > 0 ? list : fallback;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }
  const normalised = value.trim().toLowerCase();
  if (normalised === 'true') return true;
  if (normalised === 'false') return false;
  return fallback;
};

export const appConfig = {
  jwtSecret: process.env.JWT_SECRET ?? 'abcdef0123456789',
  db: {
    dialect: 'postgres',
    connectionString: process.env.DATABASE_URL,
    database: process.env.DB_NAME ?? 'postgres',
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: parseNumber(process.env.DB_PORT, 5432),
    ssl: parseBoolean(process.env.DB_SSL, false),
  },
  cors: {
    origins: parseStringList(process.env.CORS_ORIGINS, [
      'http://localhost:3000',
      'http://localhost:5173',
    ]),
  },
  agentLogLevel: parseLogLevel(process.env.AGENT_LOG_LEVEL, 'info'),
};
