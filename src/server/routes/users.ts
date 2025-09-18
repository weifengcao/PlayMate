import { Router } from 'express';
import { Op } from 'sequelize';

import { User } from '../models/User';

const router = Router();

const userAttributes = [
  'id',
  'name',
  'email',
  'mfaVerified',
  'lastLoginAt',
  'createdAt',
  'updatedAt',
] as const;

router.get('/', async (_req, res) => {
  try {
    const users = await User.findAll({ attributes: [...userAttributes] });
    res.json({ status: 'success', data: users });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Unable to fetch users.',
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ status: 'failed', message: 'Invalid user id.' });
      return;
    }
    const user = await User.findByPk(id, { attributes: [...userAttributes] });
    if (!user) {
      res.status(404).json({ status: 'failed', message: 'User not found.' });
      return;
    }
    res.json({ status: 'success', data: user });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Unable to fetch user.',
    });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ status: 'failed', message: 'Invalid user id.' });
      return;
    }

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ status: 'failed', message: 'User not found.' });
      return;
    }

    const updates: {
      name?: string;
      email?: string;
      password?: string;
      mfaVerified?: boolean;
    } = {};
    const { name, email, password, mfaVerified } = req.body ?? {};

    if (typeof name === 'string' && name.trim()) {
      updates.name = name.trim();
    }
    if (typeof email === 'string' && email.trim()) {
      updates.email = email.trim().toLowerCase();
    }
    if (typeof password === 'string' && password.trim()) {
      updates.password = password.trim();
    }
    if (typeof mfaVerified === 'boolean') {
      updates.mfaVerified = mfaVerified;
    }

    if (updates.email) {
      const existing = await User.findOne({
        where: {
          id: { [Op.ne]: id },
          email: updates.email,
        },
      });
      if (existing) {
        res.status(409).json({
          status: 'failed',
          message: 'Another account already uses that email address.',
        });
        return;
      }
    }

    Object.assign(user, updates);
    if (updates.mfaVerified) {
      user.lastLoginAt = user.lastLoginAt ?? new Date();
    }
    await user.save();

    const payload = await User.findByPk(id, { attributes: [...userAttributes] });
    res.json({ status: 'success', data: payload });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Unable to update user.',
    });
  }
});

export default router;
