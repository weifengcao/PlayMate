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

    // TODO : this should go in a separate function

    // Populating database with default data.
    const userCount = await User.count();
    if (userCount == 0) {
      await User.create({
        name: 'jill',
        password: 'a',
        email: 'jill@jungle.com',
        playdate_latit: 51.51,
        playdate_longi: -0.09,
      });
      await User.create({
        name: 'brad',
        password: 'b',
        email: 'brad@foursfield.com',
        playdate_latit: 51.505,
        playdate_longi: -0.0888,
      });
    }
    const kidCount = await Kid.count();
    console.log("kidCount", kidCount);
    if (kidCount == 0) {
      console.log("must create kid");
      await Kid.create({
        name: 'Liam',
        favoriteActivity: 'Soccer',
        age: 7,
        guardianId: 1,
      });
      await Kid.create({
        name: 'Mia',
        favoriteActivity: 'Painting',
        age: 5,
        guardianId: 1,
      });      
      await Kid.create({
        name: 'Noah',
        favoriteActivity: 'Lego building',
        age: 6,
        guardianId: 2,
      });
    }
    const friendLinkCount = await FriendLink.count();
    if (friendLinkCount == 0) {
      await FriendLink.create({
        askerId: 1,
        receiverId: 2,
        state: 0,
      });
    }
    initData(User, bodyParser, FriendLink, Kid);
    
    serve()
  })

}

start();
