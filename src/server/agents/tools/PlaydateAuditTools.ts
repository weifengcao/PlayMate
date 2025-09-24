import { Op } from 'sequelize';
import { User } from '../../models/User';
import Kid from '../../models/Kids';
import { FriendLink } from '../../models/FriendLink';
import Playdate from '../../models/Playdate';
import { PlaydateParticipant } from '../../models/PlaydateParticipant';

export type AuditTone = 'positive' | 'caution' | 'neutral';

export interface AuditFactor {
  label: string;
  detail: string;
  tone: AuditTone;
}

export interface AuditKidHighlight {
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
  kidHighlights: AuditKidHighlight[];
  factors: AuditFactor[];
}

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceKmBetween = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const EARTH_RADIUS_KM = 6371;
  const dLat = toRadians(bLat - aLat);
  const dLon = toRadians(bLng - aLng);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return EARTH_RADIUS_KM * c;
};

const captureFriendIds = (links: FriendLink[], targetUserId: number) => {
  const friendIds = new Set<number>();
  for (const link of links) {
    if (link.state !== 1) {
      continue;
    }
    if (link.askerId === targetUserId) {
      friendIds.add(link.receiverId);
    } else if (link.receiverId === targetUserId) {
      friendIds.add(link.askerId);
    }
  }
  return friendIds;
};

export async function buildPlaydateApplicantAudit(
  hostId: number,
  playdateId: number,
  applicantId: number
): Promise<PlaydateApplicantAudit | null> {
  if (hostId === applicantId) {
    return null;
  }

  const [host, applicant] = await Promise.all([
    User.findByPk(hostId),
    User.findByPk(applicantId),
  ]);

  if (!host || !applicant) {
    return null;
  }

  const [hostLinks, applicantLinks, hostKids, applicantKids] = await Promise.all([
    FriendLink.findAll({
      where: {
        [Op.or]: [
          { askerId: hostId, state: 1 },
          { receiverId: hostId, state: 1 },
        ],
      },
    }),
    FriendLink.findAll({
      where: {
        [Op.or]: [
          { askerId: applicantId, state: 1 },
          { receiverId: applicantId, state: 1 },
        ],
      },
    }),
    Kid.findAll({ where: { guardianId: hostId } }),
    Kid.findAll({ where: { guardianId: applicantId } }),
  ]);

  const hostFriendIds = captureFriendIds(hostLinks, hostId);
  const applicantFriendIds = captureFriendIds(applicantLinks, applicantId);

  let mutualFriends = 0;
  for (const id of applicantFriendIds) {
    if (hostFriendIds.has(id)) {
      mutualFriends += 1;
    }
  }

  const directFriendship = hostFriendIds.has(applicantId);

  const [pastPlaydatesTogether, upcomingSameHost] = await Promise.all([
    PlaydateParticipant.count({
      where: {
        userId: applicantId,
        status: 'approved',
      },
      include: [
        {
          model: Playdate,
          as: 'playdate',
          required: true,
          where: {
            hostId,
            endTime: { [Op.lt]: new Date() },
          },
        },
      ],
    }),
    PlaydateParticipant.count({
      where: {
        userId: applicantId,
        status: 'approved',
      },
      include: [
        {
          model: Playdate,
          as: 'playdate',
          required: true,
          where: {
            hostId,
            id: { [Op.ne]: playdateId },
            endTime: { [Op.gte]: new Date() },
          },
        },
      ],
    }),
  ]);

  let distanceKm: number | null = null;
  if (
    host.playdate_latit != null &&
    host.playdate_longi != null &&
    applicant.playdate_latit != null &&
    applicant.playdate_longi != null
  ) {
    distanceKm = distanceKmBetween(
      host.playdate_latit,
      host.playdate_longi,
      applicant.playdate_latit,
      applicant.playdate_longi
    );
  }

  const kidHighlights: AuditKidHighlight[] = applicantKids.map((kid) => {
    const overlapActivity = hostKids.some((hostKid) => hostKid.favoriteActivity === kid.favoriteActivity);
    return {
      kidName: kid.name,
      age: kid.age,
      favoriteActivity: kid.favoriteActivity,
      overlapActivity,
    };
  });

  const factors: AuditFactor[] = [];

  if (directFriendship) {
    factors.push({
      label: 'Direct connection',
      detail: 'Applicant is already in your trusted circle on PlayMate.',
      tone: 'positive',
    });
  }

  if (mutualFriends > 0 && !directFriendship) {
    factors.push({
      label: 'Mutual friends',
      detail: `You share ${mutualFriends} mutual friend${mutualFriends === 1 ? '' : 's'} on PlayMate.`,
      tone: 'positive',
    });
  }

  if (pastPlaydatesTogether > 0) {
    factors.push({
      label: 'Past playdates',
      detail: `Hosted ${pastPlaydatesTogether} playdate(s) together before.`,
      tone: 'positive',
    });
  }

  if (upcomingSameHost > 0) {
    factors.push({
      label: 'Upcoming plans',
      detail: `Already approved for ${upcomingSameHost} of your upcoming playdate(s).`,
      tone: 'neutral',
    });
  }

  const overlappingKids = kidHighlights.filter((kid) => kid.overlapActivity);
  if (overlappingKids.length > 0) {
    const activityList = overlappingKids.map((kid) => kid.favoriteActivity).join(', ');
    factors.push({
      label: 'Shared kid interests',
      detail: `Kids share love for ${activityList}.`,
      tone: 'positive',
    });
  }

  if (distanceKm != null) {
    if (distanceKm <= 5) {
      factors.push({
        label: 'Close by',
        detail: `Lives about ${distanceKm.toFixed(1)}km away from your playdate point.`,
        tone: 'positive',
      });
    } else if (distanceKm <= 20) {
      factors.push({
        label: 'Moderate travel distance',
        detail: `Roughly ${distanceKm.toFixed(1)}km away. Confirm travel plans if needed.`,
        tone: 'neutral',
      });
    } else {
      factors.push({
        label: 'Long travel distance',
        detail: `About ${distanceKm.toFixed(1)}km away. Ensure timing works for their commute.`,
        tone: 'caution',
      });
    }
  } else {
    factors.push({
      label: 'Missing location data',
      detail: 'Applicant has not set a preferred playdate location yet.',
      tone: 'caution',
    });
  }

  let trustScore = 52;
  if (directFriendship) {
    trustScore += 22;
  }
  trustScore += Math.min(mutualFriends * 6, 18);
  trustScore += Math.min(pastPlaydatesTogether * 8, 16);
  if (overlappingKids.length > 0) {
    trustScore += 6;
  }
  if (distanceKm != null) {
    trustScore += distanceKm <= 5 ? 10 : distanceKm <= 20 ? 4 : -6;
  } else {
    trustScore -= 8;
  }
  trustScore = Math.max(20, Math.min(95, trustScore));

  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  if (trustScore >= 75) {
    riskLevel = 'low';
  } else if (trustScore < 55) {
    riskLevel = 'high';
  }

  const summaryParts: string[] = [];
  if (directFriendship) {
    summaryParts.push('Already in your trusted contacts.');
  } else if (mutualFriends > 0) {
    summaryParts.push(`Shares ${mutualFriends} mutual connection${mutualFriends === 1 ? '' : 's'}.`);
  }
  if (pastPlaydatesTogether > 0) {
    summaryParts.push('Positive history hosting together.');
  }
  if (overlappingKids.length > 0) {
    summaryParts.push('Kids enjoy similar activities.');
  }
  if (distanceKm != null && distanceKm > 20) {
    summaryParts.push('Longer travel distance than average.');
  }

  if (summaryParts.length === 0) {
    summaryParts.push('Limited signal so far — consider chatting before approving.');
  }

  return {
    applicantId,
    applicantName: applicant.name,
    summary: summaryParts.join(' '),
    trustScore,
    riskLevel,
    distanceKm,
    mutualFriends,
    directFriendship,
    pastPlaydatesTogether,
    upcomingSameHost,
    kidHighlights,
    factors,
  };
}
