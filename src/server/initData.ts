import { User } from './models/User';
import Kid from './models/Kids';
import { FriendLink } from './models/FriendLink';
import Playdate from './models/Playdate';
import PlaydateParticipant from './models/PlaydateParticipant';

export { ensureDefaultUsers } from './models/InitData';

export async function populateDatabase() {
  const userCount = await User.count();
  if (userCount === 0) {
    await User.create({
      name: 'jill',
      password: 'a',
      email: 'jill@jungle.com',
      playdate_latit: 51.51,
      playdate_longi: -0.09,
      mfaVerified: true,
      lastLoginAt: new Date(),
    });
    await User.create({
      name: 'brad',
      password: 'b',
      email: 'brad@foursfield.com',
      playdate_latit: 51.505,
      playdate_longi: -0.0888,
      mfaVerified: true,
      lastLoginAt: new Date(),
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
      state: 1,
    });
  } else {
    await FriendLink.update({ state: 1 }, { where: { askerId: 1, receiverId: 2 } });
    await FriendLink.update({ state: 1 }, { where: { askerId: 2, receiverId: 1 } });
  }

  const playdateCount = await Playdate.count();
  if (playdateCount === 0) {
    const now = new Date();
    const inTwoDays = new Date(now.getTime() + 1000 * 60 * 60 * 48);
    const inTwoDaysEnd = new Date(inTwoDays.getTime() + 1000 * 60 * 90);

    const playdate = await Playdate.create({
      hostId: 1,
      title: 'Picnic in the Park',
      activity: 'Outdoor games & picnic',
      description: 'Bring snacks and favorite outdoor toys. Light lunch provided.',
      locationName: 'Hyde Park North Meadow',
      startTime: inTwoDays,
      endTime: inTwoDaysEnd,
      status: 'scheduled',
      maxGuests: 4,
      notes: 'Shade tents encouraged. Park at the north entrance.',
    });

    await PlaydateParticipant.create({
      playdateId: playdate.id,
      userId: 1,
      role: 'host',
      status: 'approved',
      joinedAt: now,
    });

    await PlaydateParticipant.create({
      playdateId: playdate.id,
      userId: 2,
      role: 'guest',
      status: 'approved',
      joinedAt: now,
    });

    const bradStart = new Date(now.getTime() + 1000 * 60 * 60 * 72);
    const bradEnd = new Date(bradStart.getTime() + 1000 * 60 * 120);
    const bradPlaydate = await Playdate.create({
      hostId: 2,
      title: 'Lego Builders Hangout',
      activity: 'Creative Lego session',
      description: 'Collaborative Lego builds with snacks provided by Brad.',
      locationName: 'Redwood City Maker Space',
      startTime: bradStart,
      endTime: bradEnd,
      status: 'scheduled',
      maxGuests: 5,
      notes: 'Bring favorite mini figures. Parking validated.',
    });

    await PlaydateParticipant.create({
      playdateId: bradPlaydate.id,
      userId: 2,
      role: 'host',
      status: 'approved',
      joinedAt: now,
    });
  }

  const bradPlaydateExists = await Playdate.findOne({ where: { hostId: 2 } });
  if (!bradPlaydateExists) {
    const now = new Date();
    const start = new Date(now.getTime() + 1000 * 60 * 60 * 96);
    const end = new Date(start.getTime() + 1000 * 60 * 120);
    const bradPlaydate = await Playdate.create({
      hostId: 2,
      title: 'Brad\'s STEM Lab',
      activity: 'Robotics & LEGO STEM challenges',
      description: 'Hands-on builds, sensor demos, and snack break included.',
      locationName: 'Redwood City Maker Space',
      startTime: start,
      endTime: end,
      status: 'scheduled',
      maxGuests: 6,
      notes: 'Bring curiosity and indoor shoes.',
    });

    await PlaydateParticipant.create({
      playdateId: bradPlaydate.id,
      userId: 2,
      role: 'host',
      status: 'approved',
      joinedAt: now,
    });
  }
}
