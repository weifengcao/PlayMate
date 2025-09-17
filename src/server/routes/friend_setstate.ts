import { Request, Response } from 'express';
import { FriendLink } from '../models/FriendLink';
import { AuthenticatedRequest } from '../middleware/AuthenticatedRequest';

const VALID_STATES = new Set([0, 1, 2]);

export async function friendSetState(req: Request, res: Response) {
  try {
    const { user } = req as AuthenticatedRequest;
    if (!user) {
      res.status(401).json({ status: 'failed', data: [], message: 'Please login.' });
      return;
    }

    const friendIdRaw = req.body.friendId;
    const stateRaw = req.body.friendshipState;

    const friendId = Number(friendIdRaw);
    const newState = Number(stateRaw);

    if (!Number.isInteger(friendId) || friendId <= 0) {
      res.status(400).json({
        status: 'failed',
        data: [],
        message: 'A valid friend identifier is required.',
      });
      return;
    }

    if (!VALID_STATES.has(newState)) {
      res.status(400).json({
        status: 'failed',
        data: [],
        message: 'Invalid friendship state.',
      });
      return;
    }

    const friendLink = await FriendLink.findOne({
      where: { askerId: friendId, receiverId: user.id },
    });

    if (!friendLink) {
      res.status(404).json({
        status: 'failed',
        data: [],
        message: 'This user has not sent you a friend request.',
      });
      return;
    }

    friendLink.state = newState;
    await friendLink.save();

    res.status(200).json({
      status: 'success',
      data: [{ askerId: friendLink.askerId, receiverId: friendLink.receiverId, state: friendLink.state }],
      message: 'Friendship state updated.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    res.status(500).json({ status: 'error', code: 500, data: [], message });
  }
}
