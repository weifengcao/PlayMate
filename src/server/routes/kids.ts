import { Router } from 'express';
import { Verify } from '../middleware/verify';
import { AuthenticatedRequest } from '../middleware/AuthenticatedRequest';
import Kid from '../models/Kids';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const kids = await Kid.findAll();
    res.json(kids);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send(error.message);
    } else {
      res.status(500).send('unknown error');
    }
  }
});

router.get('/mykids', Verify, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const kids = await Kid.findAll({ where: { guardianId: user.id } });
    res.json(kids);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send(error.message);
    } else {
      res.status(500).send('unknown error');
    }
  }
});

export default router;
