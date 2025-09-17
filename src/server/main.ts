import { createServer } from './vite-server'
import bodyParser from 'body-parser'

import sequelize from './initSeq'
import { User, initUser } from './models/User'
import Kid, { initKid, defineKidAssociations } from './models/Kids'
import { FriendLink, initFriendLink, defineAssociations as defFriendAsso } from './models/FriendLink'
import APIKidRoutes from './routes/kids'
import APIFriendRoutes from './routes/friends'
import PlaydatePointRoutes from './routes/playdate_point'
import AuthRoutes from './routes/auth'
import { initData } from './models/InitData'


const start = async () => {
  
  initUser(sequelize);
  initKid(sequelize);
  defineKidAssociations();
  initFriendLink(sequelize);
  defFriendAsso();

  const { serve, app } = await createServer();

  app.get('/test', (_, res) => {
    res.json({ hello: 'worlddd' });
  });

  app.use(bodyParser.json());
  app.use('/api/kids', APIKidRoutes);
  app.use('/api/friends', APIFriendRoutes);
  app.use('/api/playdate-point', PlaydatePointRoutes);  
  app.use('/auth', AuthRoutes);

  sequelize.sync().then(async () => {
    await populateDatabase();
    serve()
  })

}

start();
