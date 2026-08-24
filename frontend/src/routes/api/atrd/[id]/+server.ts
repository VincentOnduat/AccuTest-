import { json } from '@sveltejs/kit';
import { getUserFromRequest } from '$lib/server/auth';

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
      return json({ error: error.message }, { status: 500 });
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
      return json({ error: error.message }, { status: 500 });
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
      return json({ error: error.message }, { status: 500 });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Delete ATRD error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
