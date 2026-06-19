<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import favicon from '$lib/assets/favicon.svg';

  let { children } = $props();
  let user = $state(null);
  let loading = $state(true);

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    user = session?.user || null;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      user = session?.user || null;
      if (event === 'SIGNED_OUT') {
        goto('/login');
      }
    });
    
    loading = false;
    
    return () => subscription.unsubscribe();
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{#if loading}
  <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh;">Loading...</div>
{:else}
  {@render children()}
{/if}
