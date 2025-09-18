const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const buildUrl = (path: string) => {
  if (API_BASE) {
    if (!path.startsWith("/")) {
      return `${API_BASE}/${path}`;
    }
    return `${API_BASE}${path}`;
  }
  return path.startsWith("/") ? path : `/${path}`;
};

type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead-letter';

export interface TaskUpdate<T = unknown> {
  id: string;
  status: TaskStatus;
  type?: string;
  ownerId?: number;
  attempts?: number;
  maxAttempts?: number;
  nextRunAt?: string;
  result?: T;
  error?: string;
  updatedAt?: string;
}

type TaskListener<T = unknown> = (update: TaskUpdate<T>) => void;

const listeners = new Map<string, Set<TaskListener>>();
const globalListeners = new Set<TaskListener>();
let eventSource: EventSource | null = null;
let isConnecting = false;

const isBrowser = typeof window !== 'undefined' && typeof window.EventSource !== 'undefined';

function ensureConnection() {
  if (!isBrowser) {
    return;
  }
  if (eventSource || isConnecting) {
    return;
  }
  isConnecting = true;
  eventSource = new EventSource(buildUrl('/api/task-events'), {
    withCredentials: true,
  });

  eventSource.addEventListener('task-update', (event) => {
    try {
      const data = JSON.parse((event as MessageEvent<string>).data) as TaskUpdate;
      dispatch(data);
    } catch (err) {
      console.error('Failed to parse task update event', err);
    }
  });

  const handleError = () => {
    closeConnection();
    if (listeners.size > 0) {
      setTimeout(() => {
        isConnecting = false;
        ensureConnection();
      }, 2000);
    }
  };

  eventSource.addEventListener('error', handleError);
  eventSource.addEventListener('close', handleError as EventListener);

  eventSource.addEventListener('connected', () => {
    isConnecting = false;
  });
  eventSource.addEventListener('keep-alive', () => {
    // no-op, used to keep connection open
  });
}

function dispatch(update: TaskUpdate) {
  const taskListeners = listeners.get(update.id);
  if (!taskListeners || taskListeners.size === 0) {
    // fall through to global listeners
  } else {
    for (const listener of taskListeners) {
      try {
        listener(update);
      } catch (err) {
        console.error('Task listener failed', err);
      }
    }
  }
  if (globalListeners.size === 0) {
    return;
  }
  for (const listener of globalListeners) {
    try {
      listener(update);
    } catch (err) {
      console.error('Task listener failed', err);
    }
  }
}

function closeConnection() {
  if (eventSource) {
    eventSource.close();
  }
  eventSource = null;
  isConnecting = false;
}

export function subscribeToTask<T = unknown>(taskId: string, listener: TaskListener<T>): () => void {
  if (!isBrowser) {
    return () => {};
  }
  ensureConnection();
  const taskListeners = listeners.get(taskId) ?? new Set<TaskListener>();
  taskListeners.add(listener as TaskListener);
  listeners.set(taskId, taskListeners);

  return () => {
    const current = listeners.get(taskId);
    if (current) {
      current.delete(listener as TaskListener);
      if (current.size === 0) {
        listeners.delete(taskId);
      }
    }
    if (listeners.size === 0) {
      closeConnection();
    }
  };
}

export function shutdownTaskEvents() {
  listeners.clear();
  globalListeners.clear();
  closeConnection();
}

export function subscribeToAllTasks<T = unknown>(listener: TaskListener<T>): () => void {
  if (!isBrowser) {
    return () => {};
  }
  ensureConnection();
  globalListeners.add(listener as TaskListener);
  return () => {
    globalListeners.delete(listener as TaskListener);
    if (listeners.size === 0 && globalListeners.size === 0) {
      closeConnection();
    }
  };
}
