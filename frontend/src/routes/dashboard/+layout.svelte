<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  
  let user: any = null;
  let mobileMenuOpen = false;
  
  onMount(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    user = currentUser;
  });
  
  async function handleSignOut() {
    await supabase.auth.signOut();
    goto('/');
  }
  
  function isActive(path: string) {
    return $page.url.pathname === path || $page.url.pathname.startsWith(path + '/');
  }
</script>

<div class="dashboard-layout">
  <!-- Sidebar / Navigation -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2>Aether Automate</h2>
      <p class="user-email">{user?.email}</p>
    </div>
    
    <nav class="nav-menu">
      <!-- Main Dashboard -->
      <a href="/dashboard" class="nav-item" class:active={isActive('/dashboard') && !$page.url.pathname.includes('/dashboard/')}>
        <span class="nav-icon">🏠</span>
        <span class="nav-text">Dashboard</span>
      </a>
      
      <!-- ATRD Documents -->
      <a href="/dashboard/atrd" class="nav-item" class:active={isActive('/dashboard/atrd')}>
        <span class="nav-icon">📋</span>
        <span class="nav-text">ATRDs</span>
      </a>
      
      <!-- Business Tests -->
      <a href="/dashboard/business-tests" class="nav-item" class:active={isActive('/dashboard/business-tests')}>
        <span class="nav-icon">📊</span>
        <span class="nav-text">Business Tests</span>
      </a>
      
      <!-- Test Executions -->
      <a href="/dashboard/test-execution" class="nav-item" class:active={isActive('/dashboard/test-execution')}>
        <span class="nav-icon">🧪</span>
        <span class="nav-text">Test Executions</span>
      </a>
      
      <!-- Test Packages -->
      <a href="/dashboard/packages" class="nav-item" class:active={isActive('/dashboard/packages')}>
        <span class="nav-icon">📦</span>
        <span class="nav-text">Test Packages</span>
      </a>
      
      <!-- Sessions -->
      <a href="/dashboard/sessions" class="nav-item" class:active={isActive('/dashboard/sessions')}>
        <span class="nav-icon">🔄</span>
        <span class="nav-text">Sessions</span>
      </a>
      
      <!-- Tests -->
      <a href="/dashboard/tests" class="nav-item" class:active={isActive('/dashboard/tests')}>
        <span class="nav-icon">🧪</span>
        <span class="nav-text">Tests</span>
      </a>
      
      <!-- Analytics -->
      <a href="/dashboard/analytics" class="nav-item" class:active={isActive('/dashboard/analytics')}>
        <span class="nav-icon">📈</span>
        <span class="nav-text">Analytics</span>
      </a>
      
      <!-- Reports -->
      <a href="/dashboard/reports" class="nav-item" class:active={isActive('/dashboard/reports')}>
        <span class="nav-icon">📄</span>
        <span class="nav-text">Reports</span>
      </a>
      
      <!-- Tasks -->
      <a href="/dashboard/tasks" class="nav-item" class:active={isActive('/dashboard/tasks')}>
        <span class="nav-icon">✅</span>
        <span class="nav-text">Tasks</span>
      </a>
      
      <!-- Templates -->
      <a href="/dashboard/templates" class="nav-item" class:active={isActive('/dashboard/templates')}>
        <span class="nav-icon">📝</span>
        <span class="nav-text">Templates</span>
      </a>
      
      <!-- Settings -->
      <a href="/dashboard/settings" class="nav-item" class:active={isActive('/dashboard/settings')}>
        <span class="nav-icon">⚙️</span>
        <span class="nav-text">Settings</span>
      </a>
      
      <!-- Profile -->
      <a href="/dashboard/profile" class="nav-item" class:active={isActive('/dashboard/profile')}>
        <span class="nav-icon">👤</span>
        <span class="nav-text">Profile</span>
      </a>
    </nav>
    
    <div class="sidebar-footer">
      <button class="sign-out-btn" on:click={handleSignOut}>
        <span class="nav-icon">🚪</span>
        <span class="nav-text">Sign Out</span>
      </button>
    </div>
  </aside>
  
  <!-- Mobile menu button -->
  <button class="mobile-menu-btn" on:click={() => mobileMenuOpen = !mobileMenuOpen}>
    ☰
  </button>
  
  <!-- Mobile overlay -->
  {#if mobileMenuOpen}
    <div class="mobile-overlay" role="button" tabindex="0" on:click={() => mobileMenuOpen = false} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { mobileMenuOpen = false; e.preventDefault(); } }}></div>
    <div class="mobile-sidebar" class:active={mobileMenuOpen}>
      <div class="sidebar-header">
        <h2>Aether Automate</h2>
        <p class="user-email">{user?.email}</p>
      </div>
      
      <nav class="nav-menu">
        <a href="/dashboard" class="nav-item" on:click={() => mobileMenuOpen = false}>
          <span class="nav-icon">🏠</span>
          <span class="nav-text">Dashboard</span>
        </a>
        <a href="/dashboard/atrd" class="nav-item" on:click={() => mobileMenuOpen = false}>
          <span class="nav-icon">📋</span>
          <span class="nav-text">ATRDs</span>
        </a>
        <a href="/dashboard/business-tests" class="nav-item" on:click={() => mobileMenuOpen = false}>
          <span class="nav-icon">📊</span>
          <span class="nav-text">Business Tests</span>
        </a>
        <a href="/dashboard/test-execution" class="nav-item" on:click={() => mobileMenuOpen = false}>
          <span class="nav-icon">🧪</span>
          <span class="nav-text">Test Executions</span>
        </a>
        <a href="/dashboard/packages" class="nav-item" on:click={() => mobileMenuOpen = false}>
          <span class="nav-icon">📦</span>
          <span class="nav-text">Test Packages</span>
        </a>
        <a href="/dashboard/sessions" class="nav-item" on:click={() => mobileMenuOpen = false}>
          <span class="nav-icon">🔄</span>
          <span class="nav-text">Sessions</span>
        </a>
        <a href="/dashboard/tests" class="nav-item" on:click={() => mobileMenuOpen = false}>
          <span class="nav-icon">🧪</span>
          <span class="nav-text">Tests</span>
        </a>
        <a href="/dashboard/analytics" class="nav-item" on:click={() => mobileMenuOpen = false}>
          <span class="nav-icon">📈</span>
          <span class="nav-text">Analytics</span>
        </a>
        <a href="/dashboard/reports" class="nav-item" on:click={() => mobileMenuOpen = false}>
          <span class="nav-icon">📄</span>
          <span class="nav-text">Reports</span>
        </a>
        <a href="/dashboard/tasks" class="nav-item" on:click={() => mobileMenuOpen = false}>
          <span class="nav-icon">✅</span>
          <span class="nav-text">Tasks</span>
        </a>
        <a href="/dashboard/templates" class="nav-item" on:click={() => mobileMenuOpen = false}>
          <span class="nav-icon">📝</span>
          <span class="nav-text">Templates</span>
        </a>
        <a href="/dashboard/settings" class="nav-item" on:click={() => mobileMenuOpen = false}>
          <span class="nav-icon">⚙️</span>
          <span class="nav-text">Settings</span>
        </a>
        <a href="/dashboard/profile" class="nav-item" on:click={() => mobileMenuOpen = false}>
          <span class="nav-icon">👤</span>
          <span class="nav-text">Profile</span>
        </a>
        <button class="nav-item sign-out-mobile" on:click={handleSignOut}>
          <span class="nav-icon">🚪</span>
          <span class="nav-text">Sign Out</span>
        </button>
      </nav>
    </div>
  {/if}
  
  <!-- Main Content -->
  <main class="main-content">
    <slot />
  </main>
</div>

<style>
  .dashboard-layout {
    display: flex;
    min-height: 100vh;
    background: #f3f4f6;
  }
  
  /* Sidebar */
  .sidebar {
    width: 260px;
    background: linear-gradient(135deg, #1e1e2f 0%, #2d2d44 100%);
    color: #e5e7eb;
    display: flex;
    flex-direction: column;
    position: fixed;
    height: 100vh;
    overflow-y: auto;
    z-index: 100;
  }
  
  .sidebar-header {
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  
  .sidebar-header h2 {
    margin: 0 0 0.25rem 0;
    font-size: 1.25rem;
    color: white;
  }
  
  .user-email {
    font-size: 0.7rem;
    opacity: 0.7;
    margin: 0;
  }
  
  .nav-menu {
    flex: 1;
    padding: 1rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 1.5rem;
    color: #cbd5e1;
    text-decoration: none;
    transition: all 0.2s;
    font-size: 0.875rem;
  }
  
  .nav-item:hover {
    background: rgba(255,255,255,0.1);
    color: white;
  }
  
  .nav-item.active {
    background: rgba(102, 126, 234, 0.2);
    color: #a78bfa;
    border-right: 3px solid #a78bfa;
  }
  
  .nav-icon {
    font-size: 1.125rem;
    width: 24px;
  }
  
  .sidebar-footer {
    padding: 1rem 0;
    border-top: 1px solid rgba(255,255,255,0.1);
  }
  
  .sign-out-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 1.5rem;
    background: none;
    border: none;
    color: #fca5a5;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }
  
  .sign-out-btn:hover {
    background: rgba(252, 165, 165, 0.1);
    color: #fecaca;
  }
  
  /* Main Content */
  .main-content {
    flex: 1;
    margin-left: 260px;
    min-height: 100vh;
  }
  
  /* Mobile Menu */
  .mobile-menu-btn {
    display: none;
    position: fixed;
    top: 1rem;
    left: 1rem;
    z-index: 200;
    background: #667eea;
    color: white;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    font-size: 1.25rem;
    cursor: pointer;
  }
  
  .mobile-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 250;
  }
  
  .mobile-sidebar {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 260px;
    height: 100vh;
    background: linear-gradient(135deg, #1e1e2f 0%, #2d2d44 100%);
    z-index: 300;
    overflow-y: auto;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  .sign-out-mobile {
    width: 100%;
    background: none;
    border: none;
    color: #fca5a5;
    cursor: pointer;
    margin-top: 1rem;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .sidebar {
      display: none;
    }
    
    .main-content {
      margin-left: 0;
      padding-top: 4rem;
    }
    
    .mobile-menu-btn {
      display: block;
    }
    
    .mobile-overlay {
      display: block;
    }
    
    .mobile-sidebar {
      display: block;
    }
    
    .mobile-sidebar.active {
      transform: translateX(0);
    }
  }
</style>
