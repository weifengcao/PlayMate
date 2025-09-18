import crypto from 'crypto';

interface Challenge {
  code: string;
  expiresAt: number;
}

const CODE_TTL_MS = 5 * 60 * 1000;
const challenges = new Map<number, Challenge>();

const generateCode = () => {
  return (crypto.randomInt(0, 1_000_000) + 1_000_000)
    .toString()
    .slice(-6);
};

export const createChallenge = (userId: number) => {
  const code = generateCode();
  challenges.set(userId, { code, expiresAt: Date.now() + CODE_TTL_MS });
  return code;
};

export const verifyChallenge = (userId: number, attempt: string) => {
  const entry = challenges.get(userId);
  if (!entry) {
    return false;
  }
  const isValid = entry.expiresAt > Date.now() && entry.code === attempt.trim();
  if (isValid) {
    challenges.delete(userId);
  }
  return isValid;
};

export const clearChallenge = (userId: number) => {
  challenges.delete(userId);
};

export const hasActiveChallenge = (userId: number) => {
  const entry = challenges.get(userId);
  if (!entry) {
    return false;
  }
  if (entry.expiresAt <= Date.now()) {
    challenges.delete(userId);
    return false;
  }
  return true;
};
