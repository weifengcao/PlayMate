import { User } from '../../models/User';
import { featureFlags } from '../../config/featureFlags';
import { buildAvailabilityPlan } from './AvailabilityTools';
import { generateLocalInsight, LocalInsight } from './KnowledgeTools';

const clampLatitude = (value: number) => {
  const clamped = Math.max(-90, Math.min(90, value));
  return Number(clamped.toFixed(5));
};

const normaliseLongitude = (value: number) => {
  const normalised = ((value + 180) % 360 + 360) % 360 - 180;
  return Number(normalised.toFixed(5));
};

interface PlaydateUpdateResult {
  message: string;
  coordinates: { playdate_latit: number; playdate_longi: number };
  availabilityPlan?: Awaited<ReturnType<typeof buildAvailabilityPlan>>;
  localInsight?: LocalInsight;
}

export async function updatePlaydatePoint(userId: number, latitude: number, longitude: number): Promise<PlaydateUpdateResult> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Latitude and longitude must be valid numbers.');
  }

  const nextLatitude = clampLatitude(latitude);
  const nextLongitude = normaliseLongitude(longitude);

  const [updatedCount] = await User.update(
    { playdate_latit: nextLatitude, playdate_longi: nextLongitude },
    { where: { id: userId } }
  );

  if (updatedCount === 0) {
    throw new Error('User not found.');
  }

  const result: PlaydateUpdateResult = {
    message: 'Playdate location saved.',
    coordinates: {
      playdate_latit: nextLatitude,
      playdate_longi: nextLongitude,
    },
  };

  if (featureFlags.availabilityAgent) {
    result.availabilityPlan = await buildAvailabilityPlan(userId);
  }
  if (featureFlags.knowledgeAgent) {
    result.localInsight = generateLocalInsight(nextLatitude, nextLongitude);
  }

  return result;
}
