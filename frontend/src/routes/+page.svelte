<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  let email = '';
  let password = '';
  let loading = false;
  let error = '';
  let successMessage = '';
  let supabaseReady = false;

  onMount(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      supabaseReady = true;
      console.log('Supabase ready:', !!data.session);
    } catch (err) {
      console.error('Supabase not ready:', err);
      error = 'Supabase connection issue. Check your environment variables.';
    }
  });

  async function handleLogin() {
    if (!supabaseReady) {
      error = 'Supabase not ready. Please refresh and try again.';
      return;
    }
    
    loading = true;
    error = '';
    
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (err) throw err;
      
      // No cookie sync needed - Supabase handles session automatically
      goto('/dashboard');
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function handleSignUp() {
    if (!supabaseReady) {
      error = 'Supabase not ready. Please refresh and try again.';
      return;
    }
    
    loading = true;
    error = '';
    successMessage = '';
    
    try {
      const { error: err } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (err) throw err;
      
      successMessage = 'Check your email for confirmation!';
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Aether Automate - Login</title>
</svelte:head>

<div class="container">
  <div class="card">
    <h1>Aether Automate</h1>
    <p class="subtitle">AI-Powered Test Automation</p>
    
    {#if !supabaseReady}
      <div class="alert warning">
        ⚠️ Connecting to Supabase... Please wait.
      </div>
    {/if}
    
    <form on:submit|preventDefault={handleLogin}>
      <div class="form-group">
        <label for="email">Email</label>
        <input
          type="email"
          id="email"
          bind:value={email}
          placeholder="your@email.com"
          required
          disabled={loading || !supabaseReady}
        />
      </div>
      
      <div class="form-group">
        <label for="password">Password</label>
        <input
          type="password"
          id="password"
          bind:value={password}
          placeholder="••••••••"
          required
          disabled={loading || !supabaseReady}
        />
      </div>
      
      {#if error}
        <div class="alert error">{error}</div>
      {/if}
      
      {#if successMessage}
        <div class="alert success">{successMessage}</div>
      {/if}
      
      <div class="button-group">
        <button 
          type="submit" 
          class="primary"
          disabled={loading || !supabaseReady}
        >
          {loading ? 'Please wait...' : 'Sign In'}
        </button>
        
        <button 
          type="button" 
          class="secondary"
          on:click={handleSignUp}
          disabled={loading || !supabaseReady}
        >
          Create Account
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 1rem;
  }

  .card {
    background: white;
    padding: 2.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
    width: 100%;
    max-width: 400px;
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.5rem;
    text-align: center;
  }

  .subtitle {
    color: #6b7280;
    text-align: center;
    margin-bottom: 2rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 1rem;
  }

  input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
  }

  .button-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  button {
    padding: 0.75rem;
    border: none;
    border-radius: 0.375rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button.primary {
    background: #667eea;
    color: white;
  }

  button.primary:hover:not(:disabled) {
    background: #5a67d8;
  }

  button.secondary {
    background: #4b5563;
    color: white;
  }

  button.secondary:hover:not(:disabled) {
    background: #374151;
  }

  .alert {
    padding: 0.75rem;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .alert.error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  .alert.success {
    background: #d1fae5;
    color: #065f46;
    border: 1px solid #a7f3d0;
  }

  .alert.warning {
    background: #fed7aa;
    color: #92400e;
    border: 1px solid #fde68a;
  }
</style>
