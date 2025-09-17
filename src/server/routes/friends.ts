import { Router, Request, Response } from 'express'
import { Verify } from '../middleware/verify'
import { AuthenticatedRequest } from '../middleware/AuthenticatedRequest'
import { User } from '../models/User'
import { FriendLink } from '../models/FriendLink'
import { friendSetState } from './friend_setstate'
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
    const friendsFromMe2 = friendsFromMe1.map(link => link.receiver);
    const friendsFromOther1 = await FriendLink.findAll({
      where: {receiverId: user.id, state: 1},
      include: [{
        model: User,
        as: 'asker',
        required: true,
        attributes: ['id', 'name'],
      }]
    });
    const friendsFromOther2 = friendsFromOther1.map(link => link.asker);
    //const mergedFriends = [...friendsFromMe2, ...friendsFromOther2];
    const mergedFriends = Array.from(new Set([...friendsFromMe2, ...friendsFromOther2].map(f => f.id)))
  .map(id => [...friendsFromMe2, ...friendsFromOther2].find(f => f.id === id));
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
    const pendingFriendName = typeof req.body.friendname === 'string' ? req.body.friendname.trim() : '';
    if (!pendingFriendName) {
      res.status(400).json({
        status: "failed",
        data: [],
        message: "Friend name is required.",
      });
      return;
    }
    const friend = await User.findOne({ where: {name: pendingFriendName}});
    if (!friend) {
      res.status(404).json({
        status: "failed",
        data: [],
        message: "Cannot ask this user as friend.",
      });
      return;
    }
    if (friend.id === user.id) {
      res.status(400).json({
        status: "failed",
        data: [],
        message: "You cannot send a friend request to yourself.",
      });
      return;
    }
    console.log(friend);
    /*
    const friendLink = await FriendLink.findOne({
      where: {askerId: user.id, receiverId: friend.id}
    });
    */
    const friendLink = await FriendLink.findOne({
      where: {
        [Op.or]: [
          { askerId: user.id, receiverId: friend.id },
          { askerId: friend.id, receiverId: user.id }
        ]
      }
    });
    if (friendLink) {
      res.status(401).json({
        status: "failed",
        data: [],
        message: "You already asked this user as friend.",
      });
      return;
    }
    console.log("creating friend link", user.id, " ", friend.id);
    await FriendLink.create({
      askerId: user.id,
      receiverId: friend.id,
      state: 0,
    });
    res.status(201).json({
      status: "success",
      data: [{ id: friend.id, name: friend.name }],
      message: "Friend request sent.",
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send(error.message);
    } else {
      res.status(500).send("unknown error");
    }
  }
});

router.post('/setstate', Verify, async (req, res) => {
  return friendSetState(req, res);
});

export default router
