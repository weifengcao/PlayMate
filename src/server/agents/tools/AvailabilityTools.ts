import Kid from '../../models/Kids';

interface AvailabilitySuggestion {
  kidName: string;
  suggestedDay: string;
  suggestedSlot: string;
  activityHint: string;
}

export interface AvailabilityPlan {
  message: string;
  suggestions: AvailabilitySuggestion[];
}

const WEEKLY_SLOTS = [
  { day: 'Saturday', slot: '09:00 – 11:00', activity: 'Park meetup' },
  { day: 'Saturday', slot: '14:00 – 16:00', activity: 'STEM lab time' },
  { day: 'Sunday', slot: '10:00 – 12:00', activity: 'Arts & crafts brunch' },
  { day: 'Wednesday', slot: '16:30 – 18:00', activity: 'Mid-week playground break' },
];

export async function buildAvailabilityPlan(guardianId: number): Promise<AvailabilityPlan | null> {
  const kids = await Kid.findAll({ where: { guardianId } });
  if (kids.length === 0) {
    return null;
  }

  const suggestions: AvailabilitySuggestion[] = kids.map((kid, index) => {
    const baseSlot = WEEKLY_SLOTS[index % WEEKLY_SLOTS.length];
    return {
      kidName: kid.name,
      suggestedDay: baseSlot.day,
      suggestedSlot: baseSlot.slot,
      activityHint: kid.favoriteActivity || baseSlot.activity,
    };
  });

  return {
    message: 'Availability plan tailored to your household.',
    suggestions,
  };
}
