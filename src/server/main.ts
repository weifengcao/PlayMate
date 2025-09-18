import { createServer } from './vite-server'
import bodyParser from 'body-parser'
import cors from 'cors'

import sequelize from './initSeq'
import { User, initUser } from './models/User'
import Kid, { initKid, defineKidAssociations } from './models/Kids'
import { FriendLink, initFriendLink, defineAssociations as defFriendAsso } from './models/FriendLink'
import { AgentTask, initAgentTask } from './models/AgentTask'
import APIKidRoutes from './routes/kids'
import APIFriendRoutes from './routes/friends'
import PlaydatePointRoutes from './routes/playdate_point'
import TaskRoutes from './routes/tasks'
import TaskEventRoutes from './routes/task_events'
import RecommendationRoutes from './routes/recommendations'
import AuthRoutes from './routes/auth'
import { populateDatabase } from './initData'

import './orchestrator/handlers'
import { agentTaskWorker } from './orchestrator/AgentTaskWorker'
import { appConfig } from './config/env'


const start = async () => {
  
  initUser(sequelize);
  initKid(sequelize);
  defineKidAssociations();
  initFriendLink(sequelize);
  defFriendAsso();
  initAgentTask(sequelize);

  const { serve, app } = await createServer();

  app.use(cors({
    origin: appConfig.cors.origins,
    credentials: true,
  }));

  app.get('/test', (_, res) => {
    res.json({ hello: 'worlddd' });
  });

  app.use(bodyParser.json());
  app.use('/api/kids', APIKidRoutes);
  app.use('/api/friends', APIFriendRoutes);
  app.use('/api/playdate-point', PlaydatePointRoutes);  
  app.use('/api/tasks', TaskRoutes);
  app.use('/api/task-events', TaskEventRoutes);
  app.use('/api/recommendations', RecommendationRoutes);
  app.use('/auth', AuthRoutes);

  await sequelize.sync();
  await populateDatabase();
  agentTaskWorker.start();
  serve()

}

start();
