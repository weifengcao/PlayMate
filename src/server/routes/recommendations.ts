import { Router } from 'express';
import { Verify } from '../middleware/verify';
import { AuthenticatedRequest } from '../middleware/AuthenticatedRequest';
import { buildActivityLeaderboard, LeaderboardSort } from '../agents/tools/ActivityLeaderboardTools';

const router = Router();

router.get('/leaderboard', Verify, async (req, res) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const sortParam = typeof req.query.sort === 'string' ? req.query.sort : 'popularity';
    const sort = ['popularity', 'distance', 'alphabetical'].includes(sortParam)
      ? (sortParam as LeaderboardSort)
      : 'popularity';

    const leaderboard = await buildActivityLeaderboard(user.id, sort);
    res.json({ sort, items: leaderboard });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build leaderboard';
    res.status(500).json({ message });
  }
});

export default router;
