import { Router } from 'express'
import { Verify } from '../middleware/verify'
import { AuthenticatedRequest } from '../middleware/AuthenticatedRequest'
import { User } from '../models/User'
import { agentOrchestrator } from '../orchestrator/AgentOrchestrator'

const router = Router()

router.get('/coordinates', Verify, async (req, res) => {
  try {
    const req_user = (req as AuthenticatedRequest).user
    const user = await User.findByPk(req_user.id)
    if (!user) {
      res.status(404).json({ message: 'User not found' })
      return
    }
    const userDetailsToReturn = {
      playdate_latit: user.playdate_latit,
      playdate_longi: user.playdate_longi
    }
    res.json(userDetailsToReturn)
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send(error.message)
    } else {
      res.status(500).send('unknown error')
    }
  }
})

router.post('/coordinates', Verify, async (req, res) => {
  try {
    const req_user = (req as AuthenticatedRequest).user
    const latitude = Number(req.body.playdate_latit)
    const longitude = Number(req.body.playdate_longi)

    const task = await agentOrchestrator.submit({
      type: 'location.playdate.update',
      payload: { userId: req_user.id, latitude, longitude },
      ownerId: req_user.id
    })

    res.status(202).json({ taskId: task.id, status: task.status })
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send(error.message)
    } else {
      res.status(500).send('unknown error')
    }
  }
})

export default router
