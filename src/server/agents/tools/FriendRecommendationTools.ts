import Kid from '../../models/Kids';
import { User } from '../../models/User';

interface Recommendation {
  kidId: number;
  kidName: string;
  matchName: string;
  matchActivity: string;
  compatibilityScore: number;
}

export interface FriendRecommendationPayload {
  headline: string;
  recommendations: Recommendation[];
}

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

  const recommendations: Recommendation[] = userKids.map((kid) => {
    let bestMatch = friendKids[0];
    let bestScore = -Infinity;
    friendKids.forEach((candidate) => {
      const activityMatch = candidate.favoriteActivity === kid.favoriteActivity;
      const score = scoreMatch(kid.age, candidate.age, activityMatch);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    });

    return {
      kidId: kid.id,
      kidName: kid.name,
      matchName: bestMatch.name,
      matchActivity: bestMatch.favoriteActivity,
      compatibilityScore: Math.max(bestScore, 0),
    };
  });

  return {
    headline: `Playdate ideas with ${friend.name}`,
    recommendations,
  };
}
