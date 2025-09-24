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
  suggestedSlot: string;
}

export interface FriendRecommendationPayload {
  headline?: string;
  message?: string;
  recommendations?: FriendRecommendationDetail[];
  friendId?: number;
  friendName?: string;
  friendLatitude?: number | null;
  friendLongitude?: number | null;
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

export type PlaydateParticipantRole = 'host' | 'guest';
export type PlaydateParticipantStatus = 'pending' | 'approved' | 'rejected' | 'left';

export interface PlaydateParticipantSummary {
  id: number;
  userId: number;
  role: PlaydateParticipantRole;
  status: PlaydateParticipantStatus;
  joinedAt: string | null;
  decisionNote: string | null;
  user?: {
    id: number;
    name: string;
  };
}

export interface PlaydateMetrics {
  approvedGuests: number;
  pendingGuests: number;
}

export interface PlaydateHostSummary {
  id: number;
  title: string;
  activity: string;
  description: string | null;
  locationName: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'closed';
  maxGuests: number | null;
  notes: string | null;
  participants: PlaydateParticipantSummary[];
  metrics: PlaydateMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface JoinedPlaydateSummary {
  playdateId: number;
  participantId: number;
  role: PlaydateParticipantRole;
  status: PlaydateParticipantStatus;
  joinedAt: string | null;
  decisionNote: string | null;
  playdate: {
    id: number;
    title: string;
    activity: string;
    description: string | null;
    locationName: string;
    startTime: string;
    endTime: string;
    status: 'scheduled' | 'closed';
    maxGuests: number | null;
    notes: string | null;
    host?: {
      id: number;
      name: string;
    };
  };
}

export interface PlaydatesOverview {
  hosted: PlaydateHostSummary[];
  joined: JoinedPlaydateSummary[];
}

export interface SchedulePlaydateRequest {
  title: string;
  activity: string;
  locationName: string;
  startTime: string;
  endTime: string;
  description?: string | null;
  maxGuests?: number | null;
  notes?: string | null;
}

export type UpdatePlaydateRequest = Partial<SchedulePlaydateRequest & { status: 'scheduled' | 'closed' }>;

export interface PlaydateJoinResponse {
  participant: PlaydateParticipantSummary;
  message?: string;
}

export type AuditTone = 'positive' | 'caution' | 'neutral';

export interface PlaydateAuditFactor {
  label: string;
  detail: string;
  tone: AuditTone;
}

export interface PlaydateAuditKidHighlight {
  kidName: string;
  age: number;
  favoriteActivity: string;
  overlapActivity: boolean;
}

export interface PlaydateApplicantAudit {
  applicantId: number;
  applicantName: string;
  summary: string;
  trustScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  distanceKm: number | null;
  mutualFriends: number;
  directFriendship: boolean;
  pastPlaydatesTogether: number;
  upcomingSameHost: number;
  kidHighlights: PlaydateAuditKidHighlight[];
  factors: PlaydateAuditFactor[];
}

export interface AgentInboxItem<T = unknown> {
  id: string;
  type: string;
  result: T;
  updatedAt: string;
}

export type LeaderboardSort = 'popularity' | 'distance' | 'alphabetical';

export interface ActivityLeaderboardItem {
  activity: string;
  kidCount: number;
  avgDistanceKm: number | null;
  closestFriend?: string;
  friendId: number;
  friendName: string;
  friendLatitude?: number | null;
  friendLongitude?: number | null;
}

export interface FriendRecommendationEnvelope {
  sort: LeaderboardSort;
  leaderboard: ActivityLeaderboardItem[];
  friendRecommendations: FriendRecommendationPayload[];
  playmates: PlaymateCandidate[];
}

export interface PlaymateCandidate {
  kidId: number;
  kidName: string;
  age: number;
  favoriteActivity: string;
  guardianId: number;
  guardianName: string;
}
