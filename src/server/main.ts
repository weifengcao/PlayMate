import { createServer } from './vite-server'
import bodyParser from 'body-parser'
import cors, { CorsOptions } from 'cors'

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
import UserRoutes from './routes/users'
import { populateDatabase, ensureDefaultUsers } from './initData'

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

  const escapeRegex = (value: string) => value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');

  const allowedOrigins = appConfig.cors.origins.map((origin) => {
    const trimmed = origin.trim();
    if (trimmed.includes('*')) {
      const parts = trimmed.split('*').map(escapeRegex);
      const pattern = '^' + parts.join('.*') + '$';
      return new RegExp(pattern);
    }
    return trimmed;
  });

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      const isAllowed = allowedOrigins.some((allowed) =>
        allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
      );
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
      }
    },
    credentials: true,
  };

  app.use(cors(corsOptions));

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
  app.use('/api/users', UserRoutes);
  app.use('/auth', AuthRoutes);

  await sequelize.sync({ alter: true });
  await populateDatabase();
  await ensureDefaultUsers();
  agentTaskWorker.start();
  serve()

}

start();
