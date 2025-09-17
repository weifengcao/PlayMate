interface LocalInsightAction {
  label: string;
  description: string;
}

export interface LocalInsight {
  headline: string;
  summary: string;
  actions: LocalInsightAction[];
}

const regions = [
  {
    name: 'temperate-north',
    latMin: 40,
    latMax: 90,
    summary: 'Expect cooler mornings and earlier sunsets in your area.',
    actions: [
      { label: 'Bring light jackets', description: 'Layer up for evening playdates to stay comfortable.' },
      { label: 'Schedule earlier', description: 'Morning playdates capture the warmest part of the day.' },
    ],
  },
  {
    name: 'temperate-south',
    latMin: -40,
    latMax: 40,
    summary: 'Warm weather keeps parks lively throughout the day.',
    actions: [
      { label: 'Stay hydrated', description: 'Pack water and sunscreen for mid-day outings.' },
      { label: 'Shade matters', description: 'Look for locations with tree cover during peak sun.' },
    ],
  },
  {
    name: 'cooler-south',
    latMin: -90,
    latMax: -40,
    summary: 'Breezy afternoons are common—plan accordingly.',
    actions: [
      { label: 'Add windbreakers', description: 'Comfortable layers keep kids focused on fun.' },
      { label: 'Pick indoor backups', description: 'Have a cozy indoor activity ready if weather changes.' },
    ],
  },
];

export function generateLocalInsight(latitude: number, longitude: number): LocalInsight {
  const region = regions.find((item) => latitude >= item.latMin && latitude <= item.latMax) ?? regions[1];

  const headline = `Fresh tips for playdates near (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;

  return {
    headline,
    summary: region.summary,
    actions: region.actions,
  };
}
