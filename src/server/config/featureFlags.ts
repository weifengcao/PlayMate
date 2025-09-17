const truthyValues = new Set(['1', 'true', 'yes', 'on']);

const isTruthy = (value: string | undefined, defaultValue = true) => {
  if (value === undefined) {
    return defaultValue;
  }
  return truthyValues.has(value.toLowerCase());
};

export const featureFlags = {
  availabilityAgent: isTruthy(process.env.FEATURE_AVAILABILITY_AGENT, true),
  knowledgeAgent: isTruthy(process.env.FEATURE_KNOWLEDGE_AGENT, true),
};
