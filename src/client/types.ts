export enum FriendshipState {
  PENDING = 0,
  ACCEPTED = 1,
  REFUSED = 2,
}

export interface Kid {
  id: number;
  name: string;
  favoriteActivity: string;
  age: number;
  guardianId: number;
}

export interface Friend {
  id: number;
  name: string;
}

export interface PlaydateCoordinates {
  playdate_latit: number;
  playdate_longi: number;
}
