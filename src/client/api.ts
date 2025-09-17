import { FriendshipState, Kid, PlaydateCoordinates, Friend, PlaydateUpdatePayload, AgentInboxItem, FriendRecommendationPayload, ActivityLeaderboardItem, LeaderboardSort, FriendRecommendationEnvelope } from "./types";
import { subscribeToTask, TaskUpdate, subscribeToAllTasks } from "./taskEvents";

type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead-letter';

interface TaskEnvelope<T = unknown> {
  id: string;
  status: TaskStatus;
  type?: string;
  attempts?: number;
  maxAttempts?: number;
  nextRunAt?: string;
  result?: T;
  error?: string;
}

async function fetchApi<T = unknown>(url: string, options: RequestInit = {}) {
  const resp = await fetch(url, {
    ...options,
    credentials: "include",
  });

  const text = await resp.text();

  if (resp.ok) {
    if (!text) {
      return {} as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return {} as T;
    }
  }

  let message = resp.statusText || "Request failed";
  if (text) {
    try {
      const failDetails = JSON.parse(text);
      if (failDetails?.message) {
        message = failDetails.message;
      }
    } catch {
      message = text;
    }
  }
  throw new Error(message);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForTaskResult<T = unknown>(taskId: string, maxAttempts = 20, intervalMs = 300): Promise<T> {
  let settled = false;
  let attempt = 0;

  return new Promise<T>((resolve, reject) => {
    const resolveOnce = (value: T) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(value);
    };

    const rejectOnce = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    let unsubscribe: (() => void) | undefined;
    const pollTask = async () => {
      while (!settled && attempt < maxAttempts) {
        try {
          const task = await fetchApi<TaskEnvelope<T>>(`/api/tasks/${taskId}`);
          if (task.status === 'completed') {
            resolveOnce((task.result ?? {}) as T);
            return;
          }
          if (task.status === 'failed' || task.status === 'dead-letter') {
            rejectOnce(new Error(task.error || 'Task failed.'));
            return;
          }
        } catch (error) {
          rejectOnce(error instanceof Error ? error : new Error('Task polling failed.'));
          return;
        }
        attempt += 1;
        await delay(intervalMs);
      }
      if (!settled) {
        rejectOnce(new Error('Task did not complete in time.'));
      }
    };

    const cleanup = () => {
      unsubscribe?.();
    };

    unsubscribe = subscribeToTask<T>(taskId, (update: TaskUpdate<T>) => {
      if (update.status === 'completed') {
        resolveOnce((update.result ?? {}) as T);
      } else if (update.status === 'failed' || update.status === 'dead-letter') {
        rejectOnce(new Error(update.error || 'Task failed.'));
      }
    });

    pollTask();
  });
}

export async function getMyKids(): Promise<Kid[]> {
  return fetchApi<Kid[]>("/api/kids/mykids");
}

export async function getMyPlaydatePoint(): Promise<PlaydateCoordinates> {
  return fetchApi<PlaydateCoordinates>("/api/playdate-point/coordinates");
}

export async function setMyPlaydatePoint(
  latitude: number,
  longitude: number
): Promise<PlaydateUpdatePayload> {
  const submission = await fetchApi<{ taskId: string }>("/api/playdate-point/coordinates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playdate_latit: latitude, playdate_longi: longitude }),
  });
  if (!submission?.taskId) {
    throw new Error('Unexpected response when submitting location task.');
  }
  return waitForTaskResult<PlaydateUpdatePayload>(submission.taskId);
}

export async function getAllKids(): Promise<Kid[]> {
  return fetchApi<Kid[]>("/api/kids");
}

export async function getFriendshipAsker(): Promise<Friend[]> {
  return fetchApi<Friend[]>("/api/friends/askingforme");
}

export async function getFriendsConfirmed(): Promise<Friend[]> {
  return fetchApi<Friend[]>("/api/friends/confirmed");
}

export async function getFriendsPending(): Promise<Friend[]> {
  return fetchApi<Friend[]>("/api/friends/pending");
}

export async function setFriendState(
  friendId: number,
  state: FriendshipState
): Promise<void> {
  const submission = await fetchApi<{ taskId: string }>("/api/friends/setstate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ friendId: friendId, friendshipState: state }),
  });
  if (!submission?.taskId) {
    throw new Error('Unexpected response when submitting friendship task.');
  }
  await waitForTaskResult(submission.taskId);
}

export async function askForFriend(friendname: string): Promise<void> {
  const submission = await fetchApi<{ taskId: string }>("/api/friends/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ friendname: friendname }),
  });
  if (!submission?.taskId) {
    throw new Error('Unexpected response when submitting friend request task.');
  }
  await waitForTaskResult(submission.taskId);
}

export async function getAgentInbox(): Promise<AgentInboxItem<FriendRecommendationPayload>[]> {
  const response = await fetchApi<{ items: AgentInboxItem<FriendRecommendationPayload>[] }>("/api/tasks/inbox");
  return response.items ?? [];
}

export const subscribeToAllTaskUpdates = subscribeToAllTasks;

export async function deleteFriend(friendId: number): Promise<void> {
  const submission = await fetchApi<{ taskId: string }>("/api/friends/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ friendId }),
  });
  if (!submission?.taskId) {
    throw new Error('Unexpected response when submitting delete friend task.');
  }
  await waitForTaskResult(submission.taskId);
}

export async function getActivityLeaderboard(sort: LeaderboardSort = 'popularity'): Promise<{ sort: LeaderboardSort; items: ActivityLeaderboardItem[] }> {
  const query = new URLSearchParams({ sort }).toString();
  return fetchApi<{ sort: LeaderboardSort; items: ActivityLeaderboardItem[] }>(`/api/recommendations/leaderboard?${query}`);
}

interface PlaydateRecommendationParams {
  sort?: LeaderboardSort;
  activity?: string;
  minAge?: number;
  maxAge?: number;
}

export async function getPlaydateRecommendations(params: PlaydateRecommendationParams = {}): Promise<FriendRecommendationEnvelope> {
  const searchParams = new URLSearchParams();
  if (params.sort) {
    searchParams.set('sort', params.sort);
  }
  if (params.activity) {
    searchParams.set('activity', params.activity);
  }
  if (typeof params.minAge === 'number' && Number.isFinite(params.minAge)) {
    searchParams.set('minAge', String(params.minAge));
  }
  if (typeof params.maxAge === 'number' && Number.isFinite(params.maxAge)) {
    searchParams.set('maxAge', String(params.maxAge));
  }
  const query = searchParams.toString();
  const url = query ? `/api/playdate-point/recommendations?${query}` : '/api/playdate-point/recommendations';
  return fetchApi<FriendRecommendationEnvelope>(url);
}
