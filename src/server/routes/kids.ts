import { Router } from 'express';
import Kid from '../models/Kids';

const router = Router();

router.get('/', async (req, res) => {
  const kids = await Kid.findAll();
  res.json(kids);
});

router.get('/:id', async (req, res) => {
  const kid = await Kid.findByPk(req.params.id);
  res.json(kid);
});

export default router;
