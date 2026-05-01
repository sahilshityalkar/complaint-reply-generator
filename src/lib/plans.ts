export const PLAN_LIMITS: Record<string, number> = {
  free:    10,
  starter: 100,
  pro:     -1, // -1 = unlimited
};

export const EMAIL_SEND_LIMITS: Record<string, number> = {
  free:    5,
  starter: 50,
  pro:     -1, // -1 = unlimited
};

export function isUnderLimit(plan: string, currentCount: number): boolean {
  const limit = PLAN_LIMITS[plan];
  if (limit === -1) return true;
  return currentCount < limit;
}

export function isEmailUnderLimit(plan: string, currentCount: number): boolean {
  const limit = EMAIL_SEND_LIMITS[plan];
  if (limit === -1) return true;
  return currentCount < limit;
}
