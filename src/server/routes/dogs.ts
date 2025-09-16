import { Router } from 'express'
import { Verify } from '../middleware/verify'
import { AuthenticatedRequest } from '../middleware/AuthenticatedRequest'
import { Dog } from '../models/Dog'

const router = Router()


router.get('/dogs', async (req, res) => {
  try {
    const dogs = await Dog.findAll();
    res.json(dogs);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send(error.message);
    } else {
      res.status(500).send("unknown error");
    }
  }
});


router.get('/mydogs', Verify, async (req, res) => {
  console.log("paf mydogs")
  try {
    const user = (req as AuthenticatedRequest).user;
    console.log(user)
    const dogs = await Dog.findAll({ where: {ownerId: user.id}});
    res.json(dogs);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send(error.message);
    } else {
      res.status(500).send("unknown error");
    }
  }
});


export default router