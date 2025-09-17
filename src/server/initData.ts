import { User } from './models/User';
import Kid from './models/Kids';
import { FriendLink } from './models/FriendLink';

export async function populateDatabase() {
  const userCount = await User.count();
  if (userCount === 0) {
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
  if (kidCount === 0) {
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
  if (friendLinkCount === 0) {
    await FriendLink.create({
      askerId: 1,
      receiverId: 2,
      state: 0,
    });
  }
}
