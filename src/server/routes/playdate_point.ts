import { Router } from 'express'
import { Verify } from '../middleware/verify'
import { AuthenticatedRequest } from '../middleware/AuthenticatedRequest'
import { User } from '../models/User'

const router = Router()

const clampLatitude = (value: number) => {
  const clamped = Math.max(-90, Math.min(90, value))
  return Number(clamped.toFixed(5))
}

const normaliseLongitude = (value: number) => {
  const normalised = ((value + 180) % 360 + 360) % 360 - 180
  return Number(normalised.toFixed(5))
}

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

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      res.status(400).json({ message: 'Latitude and longitude must be valid numbers.' })
      return
    }

    const nextLatitude = clampLatitude(latitude)
    const nextLongitude = normaliseLongitude(longitude)

    const [updatedCount] = await User.update(
      { playdate_latit: nextLatitude, playdate_longi: nextLongitude },
      { where: { id: req_user.id } }
    )

    if (updatedCount === 0) {
      res.status(404).json({ message: 'User not found' })
      return
    }

    res.status(200).json({
      playdate_latit: nextLatitude,
      playdate_longi: nextLongitude
    })
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send(error.message)
    } else {
      res.status(500).send('unknown error')
    }
  }
})

export default router
