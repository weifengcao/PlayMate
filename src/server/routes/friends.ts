import { Router, Request, Response } from 'express'
import { Verify } from '../middleware/verify'
import { AuthenticatedRequest } from '../middleware/AuthenticatedRequest'
import { User } from '../models/User'
import { FriendLink } from '../models/FriendLink'
import { agentOrchestrator } from '../orchestrator/AgentOrchestrator'
import { Op } from 'sequelize';

const router = Router()

router.get('/pending', Verify, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const pendingFriendLinks = await FriendLink.findAll({
      where: {askerId: user.id, state: 0},
      include: [{
        model: User,
        as: 'receiver',
        required: true,
        attributes: ['id', 'name'],
      }]
    });
    const pendingFriends = pendingFriendLinks.map(link => link.receiver);
    res.json(pendingFriends);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send(error.message);
    } else {
      res.status(500).send("unknown error");
    }
  }
});

router.get('/askingforme', Verify, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const friendAskingLinks = await FriendLink.findAll({
      where: {receiverId: user.id, state: 0},
      include: [{
        model: User,
        as: 'asker',
        required: true,
        attributes: ['id', 'name'],
      }]
    });
    const friendsAsking = friendAskingLinks.map(link => link.asker);
    res.json(friendsAsking);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send(error.message);
    } else {
      res.status(500).send("unknown error");
    }
  }
});

router.get('/confirmed', Verify, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const friendsFromMe1 = await FriendLink.findAll({
      where: {askerId: user.id, state: 1},
      include: [{
        model: User,
        as: 'receiver',
        required: true,
        attributes: ['id', 'name'],
      }]
    });
    const friendsFromMe2 = friendsFromMe1
      .map(link => link.receiver)
      .filter((friend): friend is User => Boolean(friend));
    const friendsFromOther1 = await FriendLink.findAll({
      where: {receiverId: user.id, state: 1},
      include: [{
        model: User,
        as: 'asker',
        required: true,
        attributes: ['id', 'name'],
      }]
    });
    const friendsFromOther2 = friendsFromOther1
      .map(link => link.asker)
      .filter((friend): friend is User => Boolean(friend));
    const combined = [...friendsFromMe2, ...friendsFromOther2];
    const mergedFriends = Array.from(new Set(combined.map(f => f.id)))
      .map(id => combined.find(f => f.id === id))
      .filter((friend): friend is User => Boolean(friend));
    res.json(mergedFriends);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send(error.message);
    } else {
      res.status(500).send("unknown error");
    }
  }
});

router.post('/ask', Verify, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const friendname = typeof req.body.friendname === 'string' ? req.body.friendname : '';
    const task = await agentOrchestrator.submit({
      type: 'friend.ask',
      payload: { askerId: user.id, friendName: friendname },
      ownerId: user.id,
    });
    res.status(202).json({ taskId: task.id, status: task.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    res.status(400).json({ message });
  }
});

router.post('/setstate', Verify, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const friendId = Number(req.body.friendId);
    const friendshipState = Number(req.body.friendshipState);
    const task = await agentOrchestrator.submit({
      type: 'friend.setState',
      payload: { receiverId: user.id, friendId, state: friendshipState },
      ownerId: user.id,
    });
    res.status(202).json({ taskId: task.id, status: task.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    res.status(400).json({ message });
  }
});

export default router
