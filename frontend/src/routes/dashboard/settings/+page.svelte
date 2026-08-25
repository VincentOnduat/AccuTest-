<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let profile: any = {
    full_name: '',
    company: '',
    role: '',
    notifications: true,
    email_notifications: true,
    slack_webhook: '',
    target_url: ''
  };

  let loading = true;
  let saving = false;
  let message = '';

  onMount(async () => {
    await loadProfile();
  });

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        goto('/');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      profile = { ...profile, ...data };
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      loading = false;
    }
  }

  async function saveSettings() {
    saving = true;
    message = '';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...profile,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      message = 'Settings saved successfully!';
      setTimeout(() => message = '', 3000);
    } catch (err) {
      message = 'Error saving settings: ' + (err instanceof Error ? err.message : String(err));
    } finally {
      saving = false;
    }
  }

  async function resetPassword() {
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email);
    if (!error) {
      message = 'Password reset email sent!';
    }
  }

  async function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // Delete account logic here
      await supabase.auth.signOut();
      goto('/');
    }
  }
</script>

<svelte:head>
  <title>Settings - Aether Automate</title>
</svelte:head>

<div class="container">
  <h1>Settings</h1>

  {#if loading}
    <div class="loading">Loading settings...</div>
  {:else}
    <div class="settings-grid">
      <div class="settings-nav">
        <a href="#profile" class="nav-item active">Profile</a>
        <a href="#testing" class="nav-item">Testing</a>
        <a href="#notifications" class="nav-item">Notifications</a>
        <a href="#integrations" class="nav-item">Integrations</a>
        <a href="#security" class="nav-item">Security</a>
        <a href="#billing" class="nav-item">Billing</a>
      </div>

      <div class="settings-content">
        <form on:submit|preventDefault={saveSettings}>
          <section id="profile" class="settings-section">
            <h2>Profile Settings</h2>
            
            <div class="form-group">
              <label for="full_name">Full Name</label>
              <input
                type="text"
                id="full_name"
                bind:value={profile.full_name}
                placeholder="Your full name"
              />
            </div>

            <div class="form-group">
              <label for="company">Company</label>
              <input
                type="text"
                id="company"
                bind:value={profile.company}
                placeholder="Your company"
              />
            </div>

            <div class="form-group">
              <label for="role">Role</label>
              <input
                type="text"
                id="role"
                bind:value={profile.role}
                placeholder="Your role"
              />
            </div>
          </section>

          <section id="testing" class="settings-section">
            <h2>Testing</h2>

            <div class="form-group">
              <label for="target_url">Default Target Application URL</label>
              <input
                type="url"
                id="target_url"
                bind:value={profile.target_url}
                placeholder="https://staging.your-app.com"
              />
              <p class="field-hint">
                Real test execution runs generated Playwright code against this URL — it's used
                as the base for relative <code>page.goto()</code> / <code>request.get()</code>
                calls in generated tests. Leave blank and those calls will fail with a navigation
                error, which is expected until you point this at an app. This is just the default:
                any test package with its own "Website to test" set at generation time uses that
                instead. Only public URLs are accepted — internal/private addresses are rejected
                when a test actually runs.
              </p>
            </div>
          </section>

          <section id="notifications" class="settings-section">
            <h2>Notification Preferences</h2>
            
            <div class="checkbox-group">
              <label>
                <input type="checkbox" bind:checked={profile.notifications} />
                Enable notifications
              </label>
            </div>

            <div class="checkbox-group">
              <label>
                <input type="checkbox" bind:checked={profile.email_notifications} />
                Email notifications
              </label>
            </div>

            <div class="form-group">
              <label for="slack_webhook">Slack Webhook URL</label>
              <input
                type="url"
                id="slack_webhook"
                bind:value={profile.slack_webhook}
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>
          </section>

          <section id="security" class="settings-section">
            <h2>Security</h2>
            
            <button type="button" class="secondary-btn" on:click={resetPassword}>
              Reset Password
            </button>
          </section>

          {#if message}
            <div class="message">{message}</div>
          {/if}

          <div class="actions">
            <button type="submit" class="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            
            <button type="button" class="danger-btn" on:click={deleteAccount}>
              Delete Account
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1000px;
    margin: 2rem auto;
    padding: 0 2rem;
  }

  h1 {
    font-size: 2rem;
    color: #1f2937;
    margin-bottom: 2rem;
  }

  .settings-grid {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 2rem;
  }

  .settings-nav {
    position: sticky;
    top: 2rem;
    height: fit-content;
  }

  .nav-item {
    display: block;
    padding: 0.75rem 1rem;
    color: #6b7280;
    text-decoration: none;
    border-radius: 0.375rem;
    transition: all 0.2s;
  }

  .nav-item:hover {
    background: #f9fafb;
    color: #1f2937;
  }

  .nav-item.active {
    background: #f3f4f6;
    color: #667eea;
    font-weight: 500;
  }

  .settings-content {
    background: white;
    padding: 2rem;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .settings-section {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .settings-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  h2 {
    font-size: 1.125rem;
    color: #1f2937;
    margin-bottom: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
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

  .field-hint {
    margin: 0.5rem 0 0 0;
    font-size: 0.8125rem;
    color: #6b7280;
    line-height: 1.5;
  }

  .field-hint code {
    background: #f3f4f6;
    padding: 0.1rem 0.3rem;
    border-radius: 0.25rem;
    font-size: 0.8em;
  }

  .checkbox-group {
    margin-bottom: 1rem;
  }

  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: normal;
  }

  .checkbox-group input {
    width: auto;
  }

  .message {
    padding: 0.75rem;
    background: #d1fae5;
    color: #065f46;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
  }

  .actions {
    display: flex;
    justify-content: space-between;
    margin-top: 2rem;
  }

  .primary-btn, .secondary-btn, .danger-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
  }

  .primary-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .primary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .secondary-btn {
    background: #f3f4f6;
    color: #374151;
  }

  .danger-btn {
    background: #fee2e2;
    color: #991b1b;
  }

  .loading {
    text-align: center;
    padding: 3rem;
  }
</style>
