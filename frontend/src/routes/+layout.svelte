<svelte:head>
  <title>AccuTest</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet" />
</svelte:head>
<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let { children } = $props();

  onMount(async () => {
    // Only check once on page load, not on every API error
    const { data: { session } } = await supabase.auth.getSession();
    if (!session && window.location.pathname !== '/') {
      goto('/');
    }
  });
</script>

{@render children()}
