import { json } from '@sveltejs/kit';
import { getUserFromRequest } from '$lib/server/auth';

// Talks to Supabase directly, matching how /api/atrd/[id] and /api/packages work.

export async function GET({ params, request, cookies }) {
  try {
    const auth = await getUserFromRequest(request, cookies);
    if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;

    const { data, error } = await auth.supabase
      .from('test_packages')
      .select('*')
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return json({ error: 'Package not found' }, { status: 404 });
      }
      console.error('Supabase select error:', error);
      return json({ error: error.message }, { status: 500 });
    }

    return json({ success: true, data });
  } catch (error) {
    console.error('Get package error:', error);
    return json({ error: 'Failed to fetch package' }, { status: 500 });
  }
}

export async function DELETE({ params, request, cookies }) {
  try {
    const auth = await getUserFromRequest(request, cookies);
    if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;

    const { error } = await auth.supabase
      .from('test_packages')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.user.id);

    if (error) {
      console.error('Supabase delete error:', error);
      return json({ error: error.message }, { status: 500 });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Delete package error:', error);
    return json({ error: 'Failed to delete package' }, { status: 500 });
  }
}
