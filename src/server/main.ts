import { createServer } from './vite-server'
import bodyParser from 'body-parser'

import sequelize from './initSeq'
import { User, initUser } from './models/User'
import { Dog, initDog, defineAssociations as defDogAsso } from './models/Dog'
import { FriendLink, initFriendLink, defineAssociations as defFriendAsso } from './models/FriendLink'
import APIDogRoutes from './routes/dogs'
import APIFriendRoutes from './routes/friends'
import DogwalkPointRoutes from './routes/dogwalk_point'
import AuthRoutes from './routes/auth'
import { initData } from './models/InitData'


const start = async () => {
  
  initUser(sequelize);
  initDog(sequelize);
  defDogAsso();
  initFriendLink(sequelize);
  defFriendAsso();

  const { serve, app } = await createServer();

  app.get('/test', (_, res) => {
    res.json({ hello: 'worlddd' });
  });

  app.use(bodyParser.json());
  app.use('/api/dogs', APIDogRoutes);
  app.use('/api/friends', APIFriendRoutes);
  app.use('/api/dogwalkpoint', DogwalkPointRoutes);  
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
        dogwalk_latit: 51.51,
        dogwalk_longi: -0.09,
      });
      await User.create({
        name: 'brad',
        password: 'b',
        email: 'brad@foursfield.com',
        dogwalk_latit: 51.505,
        dogwalk_longi: -0.0888,
      });
    }
    const dogCount = await Dog.count();
    console.log("dogCount", dogCount);
    if (dogCount == 0) {
      console.log("must create dog");
      await Dog.create({
        name: 'Fido',
        breed: 'saint bernard',
        ownerId: 1,
      });
      await Dog.create({
        name: 'Serge',
        breed: 'labrador',
        ownerId: 1,
      });      
      await Dog.create({
        name: 'Spot',
        breed: 'poodle',
        ownerId: 2,
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
    initData(User, bodyParser, FriendLink, Dog);
    
    serve()
  })

}

start();
