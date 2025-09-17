import { Op } from 'sequelize';
import Kid from '../../models/Kids';
import { User } from '../../models/User';
import { FriendLink } from '../../models/FriendLink';

const EARTH_RADIUS_KM = 6371;

const deg2rad = (deg: number) => (deg * Math.PI) / 180;

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

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

export type LeaderboardSort = 'popularity' | 'distance' | 'alphabetical';

export async function buildActivityLeaderboard(userId: number, sort: LeaderboardSort = 'popularity'): Promise<ActivityLeaderboardItem[]> {
  const user = await User.findByPk(userId);
  if (!user) {
    return [];
  }

  const confirmedLinks = await FriendLink.findAll({
    where: {
      [Op.or]: [
        { askerId: userId, state: 1 },
        { receiverId: userId, state: 1 },
      ],
    },
  });

  const friendIds = new Set<number>();
  confirmedLinks.forEach((link) => {
    if (link.askerId !== userId) {
      friendIds.add(link.askerId);
    }
    if (link.receiverId !== userId) {
      friendIds.add(link.receiverId);
    }
  });

  if (friendIds.size === 0) {
    return [];
  }

  const friends = await User.findAll({ where: { id: Array.from(friendIds) } });
  const kids = await Kid.findAll({ where: { guardianId: Array.from(friendIds) } });

  const friendIndex = new Map<number, User>();
  friends.forEach((friend) => friendIndex.set(friend.id, friend));

  const activityMap = new Map<string, {
    kidCount: number;
    totalDistance: number;
    distanceSamples: number;
    closestFriend?: string;
    closestDistance?: number;
    friendLat?: number | null;
    friendLng?: number | null;
    friendName?: string;
    friendId?: number;
  }>();

  kids.forEach((kid) => {
    const friend = friendIndex.get(kid.guardianId);
    if (!friend || friend.playdate_latit == null || friend.playdate_longi == null || user.playdate_latit == null || user.playdate_longi == null) {
      const entry = activityMap.get(kid.favoriteActivity) ?? { kidCount: 0, totalDistance: 0, distanceSamples: 0 };
      entry.kidCount += 1;
      entry.friendId = entry.friendId ?? kid.guardianId;
      entry.friendName = entry.friendName ?? (friend ? friend.name : 'Unknown');
      activityMap.set(kid.favoriteActivity, entry);
      return;
    }

    const distance = haversine(user.playdate_latit, user.playdate_longi, friend.playdate_latit, friend.playdate_longi);
    const entry = activityMap.get(kid.favoriteActivity) ?? { kidCount: 0, totalDistance: 0, distanceSamples: 0 };
    entry.kidCount += 1;
    entry.totalDistance += distance;
    entry.distanceSamples += 1;
    entry.friendId = entry.friendId ?? kid.guardianId;
    entry.friendName = entry.friendName ?? friend.name;
    if (!entry.closestDistance || distance < entry.closestDistance) {
      entry.closestDistance = distance;
      entry.closestFriend = friend.name;
      entry.friendLat = friend.playdate_latit ?? null;
      entry.friendLng = friend.playdate_longi ?? null;
      entry.friendName = friend.name;
    }
    activityMap.set(kid.favoriteActivity, entry);
  });

  const items: ActivityLeaderboardItem[] = Array.from(activityMap.entries()).map(([activity, data]) => ({
    activity,
    kidCount: data.kidCount,
    avgDistanceKm: data.distanceSamples > 0 ? Number((data.totalDistance / data.distanceSamples).toFixed(2)) : null,
    closestFriend: data.closestFriend,
    friendId: data.friendId ?? 0,
    friendName: data.friendName ?? '',
    friendLatitude: data.friendLat ?? null,
    friendLongitude: data.friendLng ?? null,
  }));

  const sorter: Record<LeaderboardSort, (a: ActivityLeaderboardItem, b: ActivityLeaderboardItem) => number> = {
    popularity: (a, b) => b.kidCount - a.kidCount || a.activity.localeCompare(b.activity),
    distance: (a, b) => {
      const distA = a.avgDistanceKm ?? Number.POSITIVE_INFINITY;
      const distB = b.avgDistanceKm ?? Number.POSITIVE_INFINITY;
      if (distA === distB) {
        return a.activity.localeCompare(b.activity);
      }
      return distA - distB;
    },
    alphabetical: (a, b) => a.activity.localeCompare(b.activity),
  };

  return items
    .filter((item) => item.friendId > 0)
    .sort(sorter[sort]);
}
