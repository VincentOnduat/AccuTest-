<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';
  
  // Form state
  let email = '';
  let password = '';
  let loading = false;
  let error = '';
  let successMessage = '';

  // Handle login
  async function handleLogin() {
    loading = true;
    error = '';
    successMessage = '';
    
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (err) throw err;
      
      // Redirect to dashboard on success
      goto('/dashboard');
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  // Handle sign up
  async function handleSignUp() {
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
    } catch (err) {
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
    <!-- Logo and Title -->
    <div class="logo-container">
      <span class="logo">⚡</span>
      <h1>Aether Automate</h1>
    </div>
    <p class="subtitle">AI-Powered UI Automation Platform</p>
    
    <!-- Login Form -->
    <form on:submit|preventDefault={handleLogin}>
      <!-- Email Field -->
      <div class="form-group">
        <label for="email">Email</label>
        <input
          type="email"
          id="email"
          bind:value={email}
          placeholder="Enter your email"
          required
          disabled={loading}
        />
      </div>
      
      <!-- Password Field -->
      <div class="form-group">
        <label for="password">Password</label>
        <input
          type="password"
          id="password"
          bind:value={password}
          placeholder="Enter your password"
          required
          disabled={loading}
        />
      </div>
      
      <!-- Error Message -->
      {#if error}
        <div class="alert error">
          <span class="alert-icon">⚠️</span>
          {error}
        </div>
      {/if}
      
      <!-- Success Message -->
      {#if successMessage}
        <div class="alert success">
          <span class="alert-icon">✓</span>
          {successMessage}
        </div>
      {/if}
      
      <!-- Buttons -->
      <div class="button-group">
        <button 
          type="submit" 
          class="btn primary"
          disabled={loading}
        >
          {#if loading}
            <span class="spinner"></span>
            Please wait...
          {:else}
            Sign In
          {/if}
        </button>
        
        <button 
          type="button" 
          class="btn secondary"
          on:click={handleSignUp}
          disabled={loading}
        >
          Create New Account
        </button>
      </div>
    </form>
    
    <!-- Footer -->
    <div class="footer">
      <p>© 2024 Aether Automate. All rights reserved.</p>
    </div>
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
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .card {
    background: white;
    padding: 2.5rem;
    border-radius: 1rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    width: 100%;
    max-width: 400px;
    animation: slideUp 0.5s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .logo-container {
    text-align: center;
    margin-bottom: 1rem;
  }

  .logo {
    font-size: 3rem;
    display: block;
    margin-bottom: 0.5rem;
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
  }

  .subtitle {
    color: #6b7280;
    text-align: center;
    margin-bottom: 2rem;
    font-size: 0.875rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 1rem;
    transition: all 0.2s;
    box-sizing: border-box;
  }

  input:hover {
    border-color: #d1d5db;
  }

  input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  input:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }

  .alert {
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
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

  .alert-icon {
    font-size: 1rem;
  }

  .button-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .btn {
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn.primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px -10px rgba(102, 126, 234, 0.5);
  }

  .btn.secondary {
    background: #f3f4f6;
    color: #374151;
    border: 2px solid #e5e7eb;
  }

  .btn.secondary:hover:not(:disabled) {
    background: #e5e7eb;
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid #ffffff;
    border-top: 2px solid transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .footer {
    margin-top: 2rem;
    text-align: center;
    color: #9ca3af;
    font-size: 0.75rem;
  }
</style>
