<script lang="ts">
  import { supabase } from '$lib/supabase'; // Add this import
  import { onMount } from 'svelte';
  
  // Add this auth helper function
  async function authFetch(url: string, options?: RequestInit) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }
    
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...options?.headers
      }
    });
  }
  
  onMount(async () => {
    try {
      // Line 17 - Change this line
      // BEFORE: const response = await fetch('/api/atrd/list');
      // AFTER:
      const response = await authFetch('/api/atrd/list');
      const data = await response.json();
      console.log('Business tests loaded:', data);
    } catch (error) {
      console.error('Error loading business tests:', error);
    }
  });
</script>
