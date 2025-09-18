import { Sequelize } from 'sequelize'
import { appConfig } from './config/env'

const commonOptions = {
  dialect: appConfig.db.dialect as 'postgres',
  logging: false,
  dialectOptions: appConfig.db.ssl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : undefined,
} as const;

const sequelize = appConfig.db.connectionString
  ? new Sequelize(appConfig.db.connectionString, {
      ...commonOptions,
    })
  : new Sequelize({
      ...commonOptions,
      database: appConfig.db.database,
      username: appConfig.db.username,
      password: appConfig.db.password,
      host: appConfig.db.host,
      port: appConfig.db.port,
    });

export default sequelize
