import { FriendshipState } from "./types";

async function fetchApi(url: string, options: RequestInit = {}) {
  const resp = await fetch(url, {
    ...options,
    credentials: "include",
  });

  if (resp.ok) {
    return resp.json();
  }

  const failDetails = await resp.json();
  throw new Error(failDetails.message);
}

export async function getMyKids(): Promise<any> {
  return fetchApi("/api/kids/mykids");
}

export async function getMyPlaydatePoint(): Promise<any> {
  return fetchApi("/api/playdate-point/coordinates");
}

export async function setMyPlaydatePoint(
  latitude: number,
  longitude: number
): Promise<boolean> {
  return fetchApi("/api/playdate-point/coordinates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playdate_latit: latitude, playdate_longi: longitude }),
  });
}

export async function getFriendshipAsker(): Promise<any> {
  return fetchApi("/api/friends/askingforme");
}

export async function getFriendsConfirmed(): Promise<any> {
  return fetchApi("/api/friends/confirmed");
}

export async function getFriendsPending(): Promise<any> {
  return fetchApi("/api/friends/pending");
}

export async function setFriendState(
  friendId: number,
  state: FriendshipState
): Promise<boolean> {
  return fetchApi("/api/friends/setstate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ friendId: friendId, friendshipState: state }),
  });
}

export async function askForFriend(friendname: string): Promise<boolean> {
  return fetchApi("/api/friends/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ friendname: friendname }),
  });
}