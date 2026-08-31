import { json } from '@sveltejs/kit';
import { getUserFromRequest } from '$lib/server/auth';

// Postgres' own error code for "the value you gave isn't even the right
// shape for this column" (e.g. an id param that isn't a valid UUID) — a
// client input problem, so it should be a 400, not a 500 with the raw
// Postgres error text exposed to the caller.
const INVALID_INPUT_SYNTAX = '22P02';

function dbErrorResponse(error: { code?: string; message: string }) {
  if (error.code === INVALID_INPUT_SYNTAX) {
    return json({ error: 'Invalid ATRD id' }, { status: 400 });
  }
  return json({ error: 'Internal server error' }, { status: 500 });
}

export async function GET({ params, request, cookies }) {
  try {
    const auth = await getUserFromRequest(request, cookies);
    if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;

    const { data, error } = await auth.supabase
      .from('atrd_results')
      .select('*')
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return json({ error: 'ATRD not found' }, { status: 404 });
      }
      console.error('Supabase select error:', error);
      return dbErrorResponse(error);
    }

    return json(data);
  } catch (error) {
    console.error('Get ATRD error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT({ params, request, cookies }) {
  try {
    const auth = await getUserFromRequest(request, cookies);
    if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const { name, content, domain } = await request.json();

    const { data, error } = await auth.supabase
      .from('atrd_results')
      .update({
        name,
        content,
        domain,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return dbErrorResponse(error);
    }

    return json({ success: true, data });
  } catch (error) {
    console.error('Update ATRD error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE({ params, request, cookies }) {
  try {
    const auth = await getUserFromRequest(request, cookies);
    if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;

    // Also delete associated test packages
    await auth.supabase.from('test_packages').delete().eq('atrd_id', id);

    const { error } = await auth.supabase
      .from('atrd_results')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.user.id);

    if (error) {
      console.error('Supabase delete error:', error);
      return dbErrorResponse(error);
    }

    return json({ success: true });
  } catch (error) {
    console.error('Delete ATRD error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
