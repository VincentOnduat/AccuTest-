<script>
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  let email = '';
  let password = '';
  let loading = false;
  let error = '';
  
  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      goto('/dashboard');
    }
  });
  
  async function handleLogin() {
    loading = true;
    error = '';
    
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (loginError) {
      error = loginError.message;
      loading = false;
    } else {
      goto('/dashboard');
    }
  }
</script>

<div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
  <div style="background: white; padding: 2rem; border-radius: 1rem; width: 100%; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
    <h1 style="text-align: center; margin: 0 0 0.5rem 0; color: #1f2937;">🎯 AccuTest</h1>
    <p style="text-align: center; color: #6b7280; margin-bottom: 2rem;">Sign in to continue</p>
    
    <form on:submit|preventDefault={handleLogin}>
      <input 
        type="email" 
        bind:value={email} 
        placeholder="Email" 
        style="width: 100%; padding: 0.5rem; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 0.375rem; box-sizing: border-box;" 
      />
      <input 
        type="password" 
        bind:value={password} 
        placeholder="Password" 
        style="width: 100%; padding: 0.5rem; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 0.375rem; box-sizing: border-box;" 
      />
      
      {#if error}
        <div style="background: #fee2e2; color: #dc2626; padding: 0.5rem; border-radius: 0.375rem; margin-bottom: 1rem; text-align: center;">{error}</div>
      {/if}
      
      <button 
        type="submit" 
        disabled={loading} 
        style="width: 100%; padding: 0.5rem; background: #667eea; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 1rem;"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  </div>
</div>
