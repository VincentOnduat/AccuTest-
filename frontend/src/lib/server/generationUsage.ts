import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Free-tier monthly cap on AI test-package generation (api/ai/generate-test-package
 * only — not api/ai/parse-atrd, a separate AI feature with its own cost
 * profile). One constant, imported everywhere it's needed, so it's easy to
 * change once there's real usage data to tune it against.
 */
export const FREE_GENERATIONS_PER_MONTH = 5;

export const UPGRADE_CONTACT_EMAIL = 'support@accutest.tech';

export interface UsageStatus {
  used: number;
  limit: number;
  remaining: number;
  /** ISO timestamp for the start of next month, when the count resets. */
  resetsAt: string;
}

function startOfCurrentMonthUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function startOfNextMonthUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/**
 * Counts this user's successful generations since the start of the current
 * calendar month (UTC). Throws on a real database error — callers should let
 * that surface as a 500 rather than silently treat a DB failure as "no
 * usage yet," which would let the cap be bypassed whenever the count query
 * itself fails.
 */
export async function getMonthlyUsage(supabase: SupabaseClient, userId: string): Promise<UsageStatus> {
  const { count, error } = await supabase
    .from('ai_generation_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfCurrentMonthUTC().toISOString());

  if (error) {
    throw error;
  }

  const used = count ?? 0;
  return {
    used,
    limit: FREE_GENERATIONS_PER_MONTH,
    remaining: Math.max(0, FREE_GENERATIONS_PER_MONTH - used),
    resetsAt: startOfNextMonthUTC().toISOString()
  };
}

/** Records one successful generation. Call only after a generation actually succeeds. */
export async function recordGeneration(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase.from('ai_generation_usage').insert({ user_id: userId });
  if (error) {
    throw error;
  }
}

export function upgradeMessage(): string {
  return `You've used all ${FREE_GENERATIONS_PER_MONTH} free generations this month. Reach out to ${UPGRADE_CONTACT_EMAIL} to upgrade.`;
}
