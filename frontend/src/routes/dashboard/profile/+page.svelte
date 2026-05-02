<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  let user: any = null;
  let loading = true;
  let saving = false;
  let message = '';
  let messageType = 'success';
  
  // Form fields
  let fullName = '';
  let company = '';
  let role = '';
  let phone = '';
  let bio = '';
  
  // Stats
  let stats = {
    totalATRDs: 0,
    totalTestPackages: 0,
    totalExecutions: 0
  };
  
  onMount(async () => {
    await loadProfile();
  });
  
  async function loadProfile() {
    loading = true;
    
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      user = currentUser;
      
      if (!user) {
        goto('/');
        return;
      }
      
      // Load profile from database with better error handling
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle instead of single to avoid 406 error
      
      if (data) {
        fullName = data.full_name || '';
        company = data.company || '';
        role = data.role || '';
        phone = data.phone || '';
        bio = data.bio || '';
      } else if (error && error.code !== 'PGRST116') {
        console.warn('Profile not found, will create on save');
      }
      
      // Load stats with error handling
      try {
        const { count: atrdCount } = await supabase
          .from('atrd_results')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        const { count: packageCount } = await supabase
          .from('test_packages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        const { count: execCount } = await supabase
          .from('test_executions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        stats = {
          totalATRDs: atrdCount || 0,
          totalTestPackages: packageCount || 0,
          totalExecutions: execCount || 0
        };
      } catch (err) {
        console.warn('Could not load stats:', err);
      }
      
    } catch (err) {
      console.error('Error loading profile:', err);
      message = 'Could not load profile data';
      messageType = 'error';
    } finally {
      loading = false;
    }
  }
  
  async function saveProfile() {
    saving = true;
    message = '';
    
    try {
      // First, check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      
      let result;
      
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            company: company,
            role: role,
            phone: phone,
            bio: bio,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      } else {
        // Insert new profile
        result = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: fullName,
            company: company,
            role: role,
            phone: phone,
            bio: bio
          });
      }
      
      if (result.error) throw result.error;
      
      message = '✅ Profile saved successfully!';
      messageType = 'success';
      setTimeout(() => message = '', 3000);
      
    } catch (err: any) {
      console.error('Error saving profile:', err);
      message = `❌ Failed to save: ${err.message || 'Unknown error'}`;
      messageType = 'error';
    } finally {
      saving = false;
    }
  }
  
  async function updatePassword() {
    const newPassword = prompt('Enter new password (minimum 6 characters):');
    if (!newPassword) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      alert('✅ Password updated successfully!');
    } catch (err: any) {
      console.error('Error updating password:', err);
      alert('❌ Failed to update password: ' + (err.message || 'Unknown error'));
    }
  }
  
  async function updateEmail() {
    const newEmail = prompt('Enter new email address:');
    if (!newEmail) return;
    if (!newEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });
      
      if (error) throw error;
      alert('✅ Email update confirmation sent to your new email address!');
    } catch (err: any) {
      console.error('Error updating email:', err);
      alert('❌ Failed to update email: ' + (err.message || 'Unknown error'));
    }
  }
</script>

<svelte:head>
  <title>Profile - Aether Automate</title>
</svelte:head>

<div class="container">
  <div class="header">
    <h1>👤 My Profile</h1>
    <p class="subtitle">Manage your account settings and preferences</p>
  </div>
  
  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading profile...</p>
    </div>
  {:else}
    <div class="profile-grid">
      <!-- Profile Info Card -->
      <div class="card">
        <div class="card-header">
          <h2>Profile Information</h2>
        </div>
        
        <div class="avatar-section">
          <div class="avatar">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div class="avatar-info">
            <h3>{user?.email?.split('@')[0] || 'User'}</h3>
            <p>{user?.email}</p>
          </div>
        </div>
        
        <div class="form-group">
          <label for="fullName">Full Name</label>
          <input id="fullName" type="text" bind:value={fullName} placeholder="Enter your full name" />
        </div>
        
        <div class="form-group">
          <label for="company">Company</label>
          <input id="company" type="text" bind:value={company} placeholder="Your company name" />
        </div>
        
        <div class="form-group">
          <label for="role">Role</label>
          <input id="role" type="text" bind:value={role} placeholder="e.g., QA Engineer, Test Manager" />
        </div>
        
        <div class="form-group">
          <label for="phone">Phone</label>
          <input id="phone" type="tel" bind:value={phone} placeholder="Your phone number" />
        </div>
        
        <div class="form-group">
          <label for="bio">Bio</label>
          <textarea id="bio" bind:value={bio} rows="3" placeholder="Tell us about yourself..."></textarea>
        </div>
        
        <div class="form-actions">
          <button class="btn-primary" on:click={saveProfile} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
        
        {#if message}
          <div class="message {messageType}">{message}</div>
        {/if}
      </div>
      
      <!-- Stats Card -->
      <div class="card">
        <div class="card-header">
          <h2>Activity Stats</h2>
        </div>
        
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{stats.totalATRDs}</div>
            <div class="stat-label">ATRDs Created</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{stats.totalTestPackages}</div>
            <div class="stat-label">Test Packages</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{stats.totalExecutions}</div>
            <div class="stat-label">Test Executions</div>
          </div>
        </div>
      </div>
      
      <!-- Account Security Card -->
      <div class="card">
        <div class="card-header">
          <h2>Account Security</h2>
        </div>
        
        <div class="info-row">
          <div class="info-label">Email Address</div>
          <div class="info-value">{user?.email}</div>
          <button class="btn-secondary small" on:click={updateEmail}>
            Change
          </button>
        </div>
        
        <div class="info-row">
          <div class="info-label">Password</div>
          <div class="info-value">••••••••</div>
          <button class="btn-secondary small" on:click={updatePassword}>
            Change
          </button>
        </div>
        
        <div class="info-row">
          <div class="info-label">Account Created</div>
          <div class="info-value">{new Date(user?.created_at || Date.now()).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .header {
    margin-bottom: 2rem;
  }
  
  .header h1 {
    margin: 0 0 0.25rem 0;
    color: #1f2937;
  }
  
  .subtitle {
    color: #6b7280;
    margin: 0;
  }
  
  .profile-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  
  .card {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    padding: 1.5rem;
  }
  
  .card:first-child {
    grid-column: span 2;
  }
  
  .card-header {
    margin-bottom: 1.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .card-header h2 {
    margin: 0;
    font-size: 1.125rem;
    color: #1f2937;
  }
  
  .avatar-section {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #f3f4f6;
  }
  
  .avatar {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
  }
  
  .avatar-info h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
  }
  
  .avatar-info p {
    margin: 0;
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group label {
    display: block;
    font-size: 0.7rem;
    font-weight: 500;
    color: #4b5563;
    margin-bottom: 0.25rem;
    text-transform: uppercase;
  }
  
  .form-group input, .form-group textarea {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }
  
  .form-group input:focus, .form-group textarea:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.25);
  }
  
  .form-actions {
    margin-top: 1rem;
  }
  
  .btn-primary {
    background: #667eea;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
  }
  
  .btn-primary:hover {
    background: #5a67d8;
  }
  
  .btn-primary:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
  
  .btn-secondary.small {
    background: #6b7280;
    color: white;
    border: none;
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.7rem;
  }
  
  .message {
    margin-top: 1rem;
    padding: 0.75rem;
    border-radius: 0.375rem;
    text-align: center;
    font-size: 0.875rem;
  }
  
  .message.success {
    background: #d1fae5;
    color: #065f46;
  }
  
  .message.error {
    background: #fee2e2;
    color: #991b1b;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    text-align: center;
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #667eea;
  }
  
  .stat-label {
    font-size: 0.7rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }
  
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f3f4f6;
  }
  
  .info-row:last-child {
    border-bottom: none;
  }
  
  .info-label {
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
  }
  
  .info-value {
    flex: 1;
    margin-left: 1rem;
    font-size: 0.875rem;
    color: #1f2937;
  }
  
  .loading-state {
    text-align: center;
    padding: 4rem;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f4f6;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }
    
    .profile-grid {
      grid-template-columns: 1fr;
    }
    
    .card:first-child {
      grid-column: span 1;
    }
    
    .stats-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
  }
</style>
