import { Sequelize } from 'sequelize'
import { appConfig } from './config/env'

const sequelize = new Sequelize({
  dialect: appConfig.db.dialect as 'postgres',
  database: appConfig.db.database,
  username: appConfig.db.username,
  password: appConfig.db.password,
  host: appConfig.db.host,
  port: appConfig.db.port,
})

export default sequelize
