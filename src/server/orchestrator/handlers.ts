import { agentOrchestrator } from './AgentOrchestrator';
import { sendFriendRequest, updateFriendState, deleteFriendship } from '../agents/tools/FriendTools';
import { updatePlaydatePoint } from '../agents/tools/LocationTools';
import { buildFriendRecommendations } from '../agents/tools/FriendRecommendationTools';

const sleep = (durationMs: number) => new Promise((resolve) => setTimeout(resolve, durationMs));

agentOrchestrator.registerHandler('echo', async (payload) => {
  await sleep(200);
  return {
    message: 'Echo complete',
    received: payload,
  };
});

agentOrchestrator.registerHandler('demo.plan', async (payload) => {
  await sleep(400);
  return {
    summary: 'Demo handler executed',
    payload,
  };
});

agentOrchestrator.registerHandler('friend.ask', async (rawPayload) => {
  const payload = rawPayload as { askerId?: number; friendName?: string } | undefined;
  const askerId = typeof payload?.askerId === 'number' ? payload.askerId : NaN;
  const friendName = typeof payload?.friendName === 'string' ? payload.friendName : '';
  if (!Number.isFinite(askerId)) {
    throw new Error('A valid asker identifier is required.');
  }
  return sendFriendRequest(askerId, friendName);
});

agentOrchestrator.registerHandler('friend.setState', async (rawPayload) => {
  const payload = rawPayload as { receiverId?: number; friendId?: number; state?: number } | undefined;
  const receiverId = typeof payload?.receiverId === 'number' ? payload.receiverId : NaN;
  const friendId = typeof payload?.friendId === 'number' ? payload.friendId : NaN;
  const state = typeof payload?.state === 'number' ? payload.state : NaN;
  if (!Number.isFinite(receiverId)) {
    throw new Error('A valid receiver identifier is required.');
  }
  const result = await updateFriendState(receiverId, friendId, state);
  if (result.friendLink.state === 1) {
    await agentOrchestrator.submit({
      type: 'friend.recommendations',
      ownerId: result.friendLink.askerId,
      payload: { userId: result.friendLink.askerId, friendId: result.friendLink.receiverId },
      maxAttempts: 2,
    });
    await agentOrchestrator.submit({
      type: 'friend.recommendations',
      ownerId: result.friendLink.receiverId,
      payload: { userId: result.friendLink.receiverId, friendId: result.friendLink.askerId },
      maxAttempts: 2,
    });
  }
  return result;
});

agentOrchestrator.registerHandler('location.playdate.update', async (rawPayload) => {
  const payload = rawPayload as { userId?: number; latitude?: number; longitude?: number } | undefined;
  const userId = typeof payload?.userId === 'number' ? payload.userId : NaN;
  const latitude = typeof payload?.latitude === 'number' ? payload.latitude : NaN;
  const longitude = typeof payload?.longitude === 'number' ? payload.longitude : NaN;
  if (!Number.isFinite(userId)) {
    throw new Error('A valid user identifier is required.');
  }
  return updatePlaydatePoint(userId, latitude, longitude);
});

agentOrchestrator.registerHandler('friend.recommendations', async (rawPayload) => {
  const payload = rawPayload as { userId?: number; friendId?: number } | undefined;
  const userId = typeof payload?.userId === 'number' ? payload.userId : NaN;
  const friendId = typeof payload?.friendId === 'number' ? payload.friendId : NaN;
  if (!Number.isFinite(userId) || !Number.isFinite(friendId)) {
    throw new Error('Recommendation task requires both userId and friendId.');
  }
  const recommendations = await buildFriendRecommendations(userId, friendId);
  if (!recommendations || !recommendations.recommendations || recommendations.recommendations.length === 0) {
    return {
      message: 'No friend matches yet. Add more playmate details and try again later.',
      recommendations: [],
    };
  }
  return recommendations;
});

agentOrchestrator.registerHandler('friend.delete', async (rawPayload) => {
  const payload = rawPayload as { userId?: number; friendId?: number } | undefined;
  const userId = typeof payload?.userId === 'number' ? payload.userId : NaN;
  const friendId = typeof payload?.friendId === 'number' ? payload.friendId : NaN;
  if (!Number.isFinite(userId) || !Number.isFinite(friendId)) {
    throw new Error('Friend deletion requires both userId and friendId.');
  }
  return deleteFriendship(userId, friendId);
});
