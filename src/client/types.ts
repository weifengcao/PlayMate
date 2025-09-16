export interface Kid {
  id: number;
  name: string;
  favoriteActivity: string;
  age: number;
  guardianId: number;
}

export interface PlaydatePointResponse {
  playdate_latit: number;
  playdate_longi: number;
}
