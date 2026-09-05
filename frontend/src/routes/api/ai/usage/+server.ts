import { json } from '@sveltejs/kit';
import { getUserFromRequest } from '$lib/server/auth';
import { getMonthlyUsage } from '$lib/server/generationUsage';

/** Current user's free-tier AI generation usage for this calendar month — for displaying "X of N used" before they attempt a generation. */
export async function GET({ request, cookies }) {
  const auth = await getUserFromRequest(request, cookies);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const usage = await getMonthlyUsage(auth.supabase, auth.user.id);
    return json(usage);
  } catch (error) {
    console.error('Failed to load generation usage:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
