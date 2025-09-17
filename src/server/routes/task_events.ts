import { Router } from 'express';
import { agentOrchestrator, TaskRecord } from '../orchestrator/AgentOrchestrator';
import { logger } from '../utils/logger';
import { Verify } from '../middleware/verify';
import { AuthenticatedRequest } from '../middleware/AuthenticatedRequest';

const router = Router();

router.get('/', Verify, (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  logger.debug('SSE task stream opened', { userId: user.id });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
  (res as any).flush?.();

  const sendKeepAlive = () => {
    res.write(`event: keep-alive\n`);
    res.write(`data: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
  };

  const keepAliveInterval = setInterval(sendKeepAlive, 25000);

  const listener = (task: TaskRecord) => {
    if (!task.ownerId || task.ownerId === user.id) {
      res.write(`event: task-update\n`);
      res.write(`data: ${JSON.stringify(task)}\n\n`);
      (res as any).flush?.();
    }
  };

  agentOrchestrator.onUpdate(listener);

  const cleanup = () => {
    clearInterval(keepAliveInterval);
    agentOrchestrator.offUpdate(listener);
    logger.debug('SSE task stream closed', { userId: user.id });
    res.end();
  };

  req.on('close', cleanup);
  res.on('close', cleanup);
  res.on('finish', cleanup);
});

export default router;
