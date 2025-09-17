import { Router } from 'express';
import { agentOrchestrator } from '../orchestrator/AgentOrchestrator';
import { Verify } from '../middleware/verify';
import { AuthenticatedRequest } from '../middleware/AuthenticatedRequest';
import { AgentTask } from '../models/AgentTask';
import { Op } from 'sequelize';

const router = Router();

router.post('/', Verify, async (req, res) => {
  try {
    const type = typeof req.body?.type === 'string' ? req.body.type : '';
    if (!type) {
      res.status(400).json({ message: 'Task type is required.' });
      return;
    }

    const user = (req as AuthenticatedRequest).user;
    const maxAttemptsRaw = req.body?.maxAttempts;
    const maxAttempts = Number(maxAttemptsRaw);
    const task = await agentOrchestrator.submit({
      type,
      payload: req.body?.payload,
      ownerId: user.id,
      maxAttempts: Number.isFinite(maxAttempts) && maxAttempts > 0 ? maxAttempts : undefined,
    });
    res.status(202).json({ id: task.id, status: task.status, attempts: task.attempts, maxAttempts: task.maxAttempts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit task.';
    res.status(400).json({ message });
  }
});

router.get('/inbox', Verify, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const tasks = await AgentTask.findAll({
    where: {
      ownerId: user.id,
      status: 'completed',
      type: {
        [Op.in]: ['friend.recommendations'],
      },
    },
    order: [['updatedAt', 'DESC']],
    limit: 10,
  });

  const data = tasks.map(task => ({
    id: task.id,
    type: task.type,
    result: task.result,
    updatedAt: task.updatedAt,
  }));

  res.json({ items: data });
});

router.get('/:id', Verify, async (req, res) => {
  const task = await agentOrchestrator.getTask(req.params.id);
  if (!task) {
    res.status(404).json({ message: 'Task not found.' });
    return;
  }

  const user = (req as AuthenticatedRequest).user;
  if (task.ownerId && task.ownerId !== user.id) {
    res.status(403).json({ message: 'Not authorised to view this task.' });
    return;
  }
  res.json({
    id: task.id,
    type: task.type,
    status: task.status,
    result: task.result,
    error: task.error,
    attempts: task.attempts,
    maxAttempts: task.maxAttempts,
    nextRunAt: task.nextRunAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  });
});

export default router;
