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

export interface FriendRecommendationDetail {
  kidId: number;
  kidName: string;
  matchName: string;
  matchActivity: string;
  compatibilityScore: number;
}

export interface FriendRecommendationPayload {
  headline?: string;
  message?: string;
  recommendations?: FriendRecommendationDetail[];
}

export interface AvailabilitySuggestion {
  kidName: string;
  suggestedDay: string;
  suggestedSlot: string;
  activityHint: string;
}

export interface AvailabilityPlan {
  message: string;
  suggestions: AvailabilitySuggestion[];
}

export interface LocalInsightAction {
  label: string;
  description: string;
}

export interface LocalInsight {
  headline: string;
  summary: string;
  actions: LocalInsightAction[];
}

export interface PlaydateUpdatePayload {
  message: string;
  coordinates: PlaydateCoordinates;
  availabilityPlan?: AvailabilityPlan | null;
  localInsight?: LocalInsight;
}

export interface AgentInboxItem<T = unknown> {
  id: string;
  type: string;
  result: T;
  updatedAt: string;
}
