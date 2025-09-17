import { Op } from 'sequelize';
import { FriendLink } from '../../models/FriendLink';
import { User } from '../../models/User';

interface FriendRequestResult {
  message: string;
  friend: { id: number; name: string };
}

interface FriendStateResult {
  message: string;
  friendLink: { askerId: number; receiverId: number; state: number };
}

export async function sendFriendRequest(askerId: number, friendName: string): Promise<FriendRequestResult> {
  const pendingFriendName = friendName.trim();
  if (!pendingFriendName) {
    throw new Error('Friend name is required.');
  }

  const friend = await User.findOne({ where: { name: pendingFriendName } });
  if (!friend) {
    throw new Error('Cannot ask this user as friend.');
  }

  if (friend.id === askerId) {
    throw new Error('You cannot send a friend request to yourself.');
  }

  const friendLink = await FriendLink.findOne({
    where: {
      [Op.or]: [
        { askerId, receiverId: friend.id },
        { askerId: friend.id, receiverId: askerId },
      ],
    },
  });

  if (friendLink) {
    throw new Error('You already asked this user as friend.');
  }

  await FriendLink.create({ askerId, receiverId: friend.id, state: 0 });

  return {
    message: 'Friend request sent.',
    friend: { id: friend.id, name: friend.name },
  };
}

const VALID_STATES = new Set([0, 1, 2]);

export async function updateFriendState(receiverId: number, friendId: number, newState: number): Promise<FriendStateResult> {
  if (!Number.isInteger(friendId) || friendId <= 0) {
    throw new Error('A valid friend identifier is required.');
  }

  if (!VALID_STATES.has(newState)) {
    throw new Error('Invalid friendship state.');
  }

  const friendLink = await FriendLink.findOne({
    where: { askerId: friendId, receiverId },
  });

  if (!friendLink) {
    throw new Error('This user has not sent you a friend request.');
  }

  friendLink.state = newState;
  await friendLink.save();

  return {
    message: 'Friendship state updated.',
    friendLink: {
      askerId: friendLink.askerId,
      receiverId: friendLink.receiverId,
      state: friendLink.state,
    },
  };
}
