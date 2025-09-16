import { Router } from 'express';
import PlaydateLocation from '../models/PlaydateLocation';

const router = Router();

router.get('/', async (req, res) => {
  const locations = await PlaydateLocation.findAll();
  res.json(locations);
});

router.post('/', async (req, res) => {
  const location = await PlaydateLocation.create(req.body);
  res.json(location);
});

export default router;
