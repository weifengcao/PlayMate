import { Router } from 'express'
import { Verify } from '../middleware/verify'
import { AuthenticatedRequest } from '../middleware/AuthenticatedRequest'
import { User } from '../models/User'
import { agentOrchestrator } from '../orchestrator/AgentOrchestrator'
import { buildActivityLeaderboard } from '../agents/tools/ActivityLeaderboardTools'
import { buildFriendRecommendations } from '../agents/tools/FriendRecommendationTools'
import { findPlaymatesForUser } from '../agents/tools/PlaymateFilterTools'

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

router.get('/recommendations', Verify, async (req, res) => {
  try {
    const req_user = (req as AuthenticatedRequest).user
    const sortParam = typeof req.query.sort === 'string' ? req.query.sort : 'popularity'
    const sort = ['popularity', 'distance', 'alphabetical'].includes(sortParam) ? sortParam : 'popularity'

    const activityFilter = typeof req.query.activity === 'string' ? req.query.activity : undefined
    const minAge = req.query.minAge ? Number(req.query.minAge) : undefined
    const maxAge = req.query.maxAge ? Number(req.query.maxAge) : undefined

    const leaderboard = await buildActivityLeaderboard(req_user.id, sort as any)

    const uniqueFriendIds = Array.from(new Set(leaderboard.map((item) => item.friendId))).filter((id) => Number.isInteger(id) && id > 0) as number[]

    const friendRecommendations = await Promise.all(
      uniqueFriendIds.map(async (friendId) => {
        const payload = await buildFriendRecommendations(req_user.id, friendId)
        return payload ?? null
      })
    )

    const filteredPlaymates = await findPlaymatesForUser(req_user.id, {
      activity: activityFilter,
      minAge: minAge && Number.isFinite(minAge) ? minAge : undefined,
      maxAge: maxAge && Number.isFinite(maxAge) ? maxAge : undefined,
    })

    res.json({
      sort,
      leaderboard,
      friendRecommendations: friendRecommendations.filter((item) => item && item.recommendations && item.recommendations.length > 0),
      playmates: filteredPlaymates,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build playdate recommendations'
    res.status(500).json({ message })
  }
})

export default router
