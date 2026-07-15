export const FREE_LIMITS = {
  maxAffirmations: 5,
  maxChars: 500,
  maxDurationMin: 2,
  maxSavedAudios: 1,
  downloadAllowed: false,
};

export const PRO_LIMITS = {
  maxAffirmations: Infinity,
  maxChars: Infinity,
  maxDurationMin: 120,
  maxSavedAudios: Infinity,
  downloadAllowed: true,
};

export function limitsFor(plan: "free" | "pro" | null | undefined) {
  return plan === "pro" ? PRO_LIMITS : FREE_LIMITS;
}