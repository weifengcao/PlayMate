export async function getMyDogs() {
  const resp = await fetch("/api/dogs/mydogs");
  if (resp.ok) {
    const dogs = await resp.json();
    return dogs;
  }
  throw new Error("Unable to fetch dogs list");
}

export async function getMyDogwalkPoint() {
  const resp = await fetch("/api/dogwalkpoint/latlong");
  if (resp.ok) {
    const point = await resp.json();
    return point;
  }
  throw new Error("Unable to fetch dogwalk point");
}

export async function setMyDogwalkPoint(latit: number, longi: number) {
  const resp = await fetch("/api/dogwalkpoint/latlong", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dogwalk_latit: latit, dogwalk_longi: longi }),
  });
  if (resp.ok) {
    return true;
  }
  const failDetails = await resp.json();
  throw new Error(failDetails.message);
}

export async function getFriendshipAsker() {
  const resp = await fetch("/api/friends/askingforme");
  if (resp.ok) {
    return await resp.json();
  }
  throw new Error("Unable to fetch friends asking for me");
}

export async function getFriendsConfirmed() {
  const resp = await fetch("/api/friends/confirmed");
  if (resp.ok) {
    return await resp.json();
  }
  throw new Error("Unable to fetch friends");
}

export async function getFriendsPending() {
  const resp = await fetch("/api/friends/pending");
  if (resp.ok) {
    return await resp.json();
  }
  throw new Error("Unable to fetch pending friends");
}

export async function setFriendState(friendId: number, state) {
  const resp = await fetch("/api/friends/setstate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ friendId: friendId, friendshipState: state }),
  });
  if (resp.ok) {
    return true;
  }
  throw new Error("Unable to set friend state");
}

export async function AskForFriend(friendname: string) {
  const resp = await fetch("/api/friends/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ friendname: friendname }),
  });
  if (resp.ok) {
    return true;
  }
  const failDetails = await resp.json();
  throw new Error(failDetails.message);
}
