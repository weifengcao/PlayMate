import express from 'express';
import { Sequelize } from 'sequelize';
import { initKid } from './models/Kids';
import { initPlaydateLocation } from './models/PlaydateLocation';
import { initUser } from './models/User';
import { initFriendLink } from './models/FriendLink';
import kidsRouter from './routes/kids';
import playdateLocationRouter from './routes/playdate_location';
import authRouter from './routes/auth';
import friendsRouter from './routes/friends';
import friendSetStateRouter from './routes/friend_setstate';
import viteServer from './vite-server';

const app = express();
const port = 3000;

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
});

initKid(sequelize);
initPlaydateLocation(sequelize);
initUser(sequelize);
initFriendLink(sequelize);

app.use(express.json());

app.use('/api/kids', kidsRouter);
app.use('/api/playdate-locations', playdateLocationRouter);
app.use('/api/auth', authRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/friend-set-state', friendSetStateRouter);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
} else {
  app.use(viteServer);
}

sequelize.sync().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
});
