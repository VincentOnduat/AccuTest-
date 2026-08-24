import { json } from '@sveltejs/kit';
import { getUserFromRequest } from '$lib/server/auth';

export async function GET({ url, request, cookies }) {
  console.log('📦 Packages API called');

  const auth = await getUserFromRequest(request, cookies);
  if (!auth) {
    console.log('❌ Unauthorized, returning 401');
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = parseInt(url.searchParams.get('limit') || '50');
  const atrdId = url.searchParams.get('atrd_id');

  let query = auth.supabase
    .from('test_packages')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (atrdId) {
    query = query.eq('atrd_id', atrdId);
  }

  const { data, error } = await query;

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ success: true, data: data || [] });
}
