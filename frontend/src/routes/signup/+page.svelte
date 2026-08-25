<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let email = '';
  let password = '';
  let confirmPassword = '';
  let loading = false;
  let error = '';
  let checkEmail = false;

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      goto('/dashboard');
    }
  });

  async function handleSignup() {
    error = '';

    if (password.length < 8) {
      error = 'Password must be at least 8 characters.';
      return;
    }
    if (password !== confirmPassword) {
      error = 'Passwords do not match.';
      return;
    }

    loading = true;

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });

    loading = false;

    if (signupError) {
      error = signupError.message;
      return;
    }

    // If the Supabase project has email confirmation enabled, there's no
    // session yet and the user needs to click the link in their inbox first.
    if (data.session) {
      goto('/dashboard');
    } else {
      checkEmail = true;
    }
  }
</script>

<svelte:head>
  <title>Sign Up - AccuTest</title>
</svelte:head>

<div class="auth-page">
  <a href="/" class="brand">🎯 AccuTest</a>

  <div class="card">
    {#if checkEmail}
      <div class="confirm-email">
        <div class="icon">📬</div>
        <h1>Check your inbox</h1>
        <p class="subtitle">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
          account, then sign in.
        </p>
        <a href="/login" class="back-link">Back to sign in</a>
      </div>
    {:else}
      <h1>Create your account</h1>
      <p class="subtitle">Start generating and running tests in minutes</p>

      <form on:submit|preventDefault={handleSignup}>
        <label for="email">Email</label>
        <input id="email" type="email" bind:value={email} placeholder="you@company.com" required autocomplete="email" />

        <label for="password">Password</label>
        <input id="password" type="password" bind:value={password} placeholder="At least 8 characters" required autocomplete="new-password" minlength="8" />

        <label for="confirmPassword">Confirm Password</label>
        <input id="confirmPassword" type="password" bind:value={confirmPassword} placeholder="••••••••" required autocomplete="new-password" minlength="8" />

        {#if error}
          <div class="error">{error}</div>
        {/if}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create Free Account'}
        </button>
      </form>

      <p class="switch">Already have an account? <a href="/login">Sign in</a></p>
    {/if}
  </div>
</div>

<style>
  .auth-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 1.5rem;
  }
  .brand {
    color: white;
    font-size: 1.5rem;
    font-weight: 700;
    text-decoration: none;
  }
  .card {
    background: white;
    padding: 2.5rem;
    border-radius: 1rem;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
  }
  h1 {
    text-align: center;
    margin: 0 0 0.25rem 0;
    color: #1f2937;
    font-size: 1.5rem;
  }
  .subtitle {
    text-align: center;
    color: #6b7280;
    margin: 0 0 1.75rem 0;
  }
  label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.375rem;
  }
  input {
    width: 100%;
    padding: 0.625rem 0.75rem;
    margin-bottom: 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    box-sizing: border-box;
    font-size: 1rem;
  }
  input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
  }
  .error {
    background: #fee2e2;
    color: #dc2626;
    padding: 0.625rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    text-align: center;
    font-size: 0.875rem;
  }
  button {
    width: 100%;
    padding: 0.75rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    transition: background 0.15s;
  }
  button:hover:not(:disabled) {
    background: #5a67d8;
  }
  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  .switch {
    text-align: center;
    margin: 1.5rem 0 0 0;
    color: #6b7280;
    font-size: 0.9rem;
  }
  .switch a {
    color: #667eea;
    font-weight: 600;
    text-decoration: none;
  }
  .switch a:hover {
    text-decoration: underline;
  }
  .confirm-email {
    text-align: center;
  }
  .confirm-email .icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }
  .back-link {
    display: inline-block;
    margin-top: 1.5rem;
    color: #667eea;
    font-weight: 600;
    text-decoration: none;
  }
  .back-link:hover {
    text-decoration: underline;
  }
</style>
