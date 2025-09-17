import { Op } from 'sequelize';
import Kid from '../../models/Kids';
import { FriendLink } from '../../models/FriendLink';
import { User } from '../../models/User';

export interface PlaymateFilterOptions {
  activity?: string;
  minAge?: number;
  maxAge?: number;
}

export interface PlaymateCandidate {
  kidId: number;
  kidName: string;
  age: number;
  favoriteActivity: string;
  guardianId: number;
  guardianName: string;
}

export async function findPlaymatesForUser(userId: number, options: PlaymateFilterOptions): Promise<PlaymateCandidate[]> {
  const filters: Record<string, unknown> = {};

  if (options.activity) {
    filters.favoriteActivity = options.activity;
  }

  if (options.minAge != null || options.maxAge != null) {
    filters.age = {};
    if (options.minAge != null) {
      (filters.age as any)[Op.gte] = options.minAge;
    }
    if (options.maxAge != null) {
      (filters.age as any)[Op.lte] = options.maxAge;
    }
  }

  const friends = await FriendLink.findAll({
    where: {
      state: 1,
      [Op.or]: [
        { askerId: userId },
        { receiverId: userId },
      ],
    },
  });

  const friendIds = new Set<number>();
  friends.forEach((link) => {
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

  const candidates = await Kid.findAll({
    where: {
      ...filters,
      guardianId: Array.from(friendIds),
    },
  });

  if (candidates.length === 0) {
    return [];
  }

  const guardians = await User.findAll({ where: { id: Array.from(friendIds) } });
  const guardianIndex = new Map<number, User>();
  guardians.forEach((guardian) => guardianIndex.set(guardian.id, guardian));

  return candidates.map((kid) => ({
    kidId: kid.id,
    kidName: kid.name,
    age: kid.age,
    favoriteActivity: kid.favoriteActivity,
    guardianId: kid.guardianId,
    guardianName: guardianIndex.get(kid.guardianId)?.name ?? 'Unknown guardian',
  }));
}
