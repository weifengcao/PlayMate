import { FriendshipState, Kid, PlaydateCoordinates, Friend } from "./types";

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

export async function getMyKids(): Promise<Kid[]> {
  return fetchApi<Kid[]>("/api/kids/mykids");
}

export async function getMyPlaydatePoint(): Promise<PlaydateCoordinates> {
  return fetchApi<PlaydateCoordinates>("/api/playdate-point/coordinates");
}

export async function setMyPlaydatePoint(
  latitude: number,
  longitude: number
): Promise<PlaydateCoordinates> {
  return fetchApi<PlaydateCoordinates>("/api/playdate-point/coordinates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playdate_latit: latitude, playdate_longi: longitude }),
  });
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
  await fetchApi("/api/friends/setstate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ friendId: friendId, friendshipState: state }),
  });
}

export async function askForFriend(friendname: string): Promise<void> {
  await fetchApi("/api/friends/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ friendname: friendname }),
  });
}
