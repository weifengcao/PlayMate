import Kid from '../../models/Kids';
import { User } from '../../models/User';

export interface FriendRecommendationDetail {
  kidId: number;
  kidName: string;
  matchName: string;
  matchActivity: string;
  compatibilityScore: number;
  suggestedSlot: string;
}

export interface FriendRecommendationPayload {
  headline: string;
  recommendations: FriendRecommendationDetail[];
  friendId: number;
  friendName: string;
  friendLatitude?: number | null;
  friendLongitude?: number | null;
}

const WEEKLY_SLOTS = [
  'Saturday 09:00 – 11:00',
  'Saturday 14:00 – 16:00',
  'Sunday 10:00 – 12:00',
  'Wednesday 16:30 – 18:00',
  'Friday 17:00 – 19:00',
];

const scoreMatch = (ageA: number, ageB: number, activityMatch: boolean): number => {
  const ageScore = Math.max(0, 10 - Math.abs(ageA - ageB));
  return ageScore + (activityMatch ? 10 : 0);
};

export async function buildFriendRecommendations(userId: number, friendId: number): Promise<FriendRecommendationPayload | null> {
  const [user, friend] = await Promise.all([
    User.findByPk(userId),
    User.findByPk(friendId),
  ]);

  if (!user || !friend) {
    return null;
  }

  const [userKids, friendKids] = await Promise.all([
    Kid.findAll({ where: { guardianId: userId } }),
    Kid.findAll({ where: { guardianId: friendId } }),
  ]);

  if (userKids.length === 0 || friendKids.length === 0) {
    return null;
  }

  const seenMatches = new Set<string>();

  const recommendations: FriendRecommendationDetail[] = [];

  userKids.forEach((kid, index) => {
    let bestMatch = friendKids[0];
    let bestScore = -Infinity;
    friendKids.forEach((candidate) => {
      const activityMatch = candidate.favoriteActivity === kid.favoriteActivity;
      const score = scoreMatch(kid.age, candidate.age, activityMatch);
      const compositeKey = `${kid.id}:${candidate.id}`;
      if (score > bestScore && !seenMatches.has(compositeKey)) {
        bestScore = score;
        bestMatch = candidate;
      }
    });

    const slot = WEEKLY_SLOTS[index % WEEKLY_SLOTS.length];
    const compositeKey = `${kid.id}:${bestMatch.id}`;
    seenMatches.add(compositeKey);
    recommendations.push({
      kidId: kid.id,
      kidName: kid.name,
      matchName: bestMatch.name,
      matchActivity: bestMatch.favoriteActivity,
      compatibilityScore: Math.max(bestScore, 0),
      suggestedSlot: slot,
    });
  });

  return {
    headline: `Playdate ideas with ${friend.name}`,
    recommendations,
    friendId: friend.id,
    friendName: friend.name,
    friendLatitude: friend.playdate_latit ?? null,
    friendLongitude: friend.playdate_longi ?? null,
  };
}
