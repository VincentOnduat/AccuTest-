<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  
  let user: any = null;
  let mobileMenuOpen = false;
  let collapsed = false;
  
  onMount(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    user = currentUser;
    
    // Load sidebar state from localStorage
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState) {
      collapsed = savedState === 'true';
    }
  });
  
  async function handleSignOut() {
    await supabase.auth.signOut();
    goto('/');
  }
  
  function toggleSidebar() {
    collapsed = !collapsed;
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }
  
  function isActive(path: string) {
    return $page.url.pathname === path || $page.url.pathname.startsWith(path + '/');
  }
</script>

<div class="dashboard-layout" class:sidebar-collapsed={collapsed}>
  <!-- Sidebar / Navigation -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <span class="logo-icon">⚡</span>
        {#if !collapsed}
          <h2>AccuTest</h2>
        {/if}
      </div>
      <button class="collapse-btn" on:click={toggleSidebar} title={collapsed ? "Expand" : "Collapse"}>
        <span class="collapse-icon">{collapsed ? '→' : '←'}</span>
      </button>
    </div>
    
    {#if !collapsed}
      <div class="user-info">
        <div class="user-avatar">
          <span>{user?.email?.charAt(0).toUpperCase() || 'U'}</span>
        </div>
        <div class="user-details">
          <p class="user-name">{user?.email?.split('@')[0] || 'User'}</p>
          <p class="user-email">{user?.email}</p>
        </div>
      </div>
    {:else}
      <div class="user-avatar-collapsed" title={user?.email}>
        <span>{user?.email?.charAt(0).toUpperCase() || 'U'}</span>
      </div>
    {/if}
    
    <nav class="nav-menu">
      <a href="/dashboard" class="nav-item" class:active={isActive('/dashboard') && !$page.url.pathname.includes('/dashboard/')}>
        <span class="nav-icon">🏠</span>
        {#if !collapsed}<span class="nav-text">Dashboard</span>{/if}
      </a>
      
      <a href="/dashboard/atrd" class="nav-item" class:active={isActive('/dashboard/atrd')}>
        <span class="nav-icon">📋</span>
        {#if !collapsed}<span class="nav-text">ATRDs</span>{/if}
      </a>
      
      <a href="/dashboard/packages" class="nav-item" class:active={isActive('/dashboard/packages')}>
        <span class="nav-icon">📦</span>
        {#if !collapsed}<span class="nav-text">Test Packages</span>{/if}
      </a>
      
      <a href="/dashboard/sessions" class="nav-item" class:active={isActive('/dashboard/sessions')}>
        <span class="nav-icon">🔄</span>
        {#if !collapsed}<span class="nav-text">Sessions</span>{/if}
      </a>
      
      <a href="/dashboard/tests" class="nav-item" class:active={isActive('/dashboard/tests')}>
        <span class="nav-icon">🧪</span>
        {#if !collapsed}<span class="nav-text">Tests</span>{/if}
      </a>
      
      <a href="/dashboard/tasks" class="nav-item" class:active={isActive('/dashboard/tasks')}>
        <span class="nav-icon">✅</span>
        {#if !collapsed}<span class="nav-text">Tasks</span>{/if}
      </a>
      
      <a href="/dashboard/profile" class="nav-item" class:active={isActive('/dashboard/profile')}>
        <span class="nav-icon">👤</span>
        {#if !collapsed}<span class="nav-text">Profile</span>{/if}
      </a>
    </nav>
    
    <div class="sidebar-footer">
      <button class="sign-out-btn" on:click={handleSignOut}>
        <span class="nav-icon">🚪</span>
        {#if !collapsed}<span class="nav-text">Sign Out</span>{/if}
      </button>
    </div>
  </aside>
  
  <!-- Mobile menu button -->
  <button class="mobile-menu-btn" on:click={() => mobileMenuOpen = !mobileMenuOpen}>
    <span>☰</span>
  </button>
  
  <!-- Mobile overlay -->
  {#if mobileMenuOpen}
    <div class="mobile-overlay" role="button" tabindex="0" on:click={() => mobileMenuOpen = false} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { mobileMenuOpen = false; e.preventDefault(); } }}></div>
    <div class="mobile-sidebar" class:active={mobileMenuOpen}>
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-icon">⚡</span>
          <h2>AccuTest</h2>
        </div>
      </div>
      
      <div class="user-info">
        <div class="user-avatar">
          <span>{user?.email?.charAt(0).toUpperCase() || 'U'}</span>
        </div>
        <div class="user-details">
          <p class="user-name">{user?.email?.split('@')[0] || 'User'}</p>
          <p class="user-email">{user?.email}</p>
        </div>
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
        <a href="/dashboard/tasks" class="nav-item" on:click={() => mobileMenuOpen = false}>
          <span class="nav-icon">✅</span>
          <span class="nav-text">Tasks</span>
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
  /* Enterprise-Grade Styling - Optimized for Long Work Hours */
  * {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  
  :root {
    /* Enterprise Color Palette - Reduced eye strain */
    --bg-primary: #f5f7fa;
    --bg-secondary: #ffffff;
    --bg-tertiary: #f8f9fc;
    --sidebar-bg: #1a1f2e;
    --sidebar-bg-dark: #141824;
    --border-color: #e4e7ed;
    --border-light: rgba(255, 255, 255, 0.06);
    
    /* Professional Colors */
    --primary: #3b82f6;
    --primary-dark: #2563eb;
    --primary-light: #60a5fa;
    --success: #10b981;
    --warning: #f59e0b;
    --danger: #ef4444;
    --info: #8b5cf6;
    
    /* Text Colors - High contrast for readability */
    --text-primary: #1e293b;
    --text-secondary: #475569;
    --text-tertiary: #64748b;
    --text-inverse: #e2e8f0;
    --text-muted: #94a3b8;
    
    /* Sidebar Text */
    --sidebar-text: #a0aec0;
    --sidebar-text-hover: #e2e8f0;
    --sidebar-text-active: #60a5fa;
    
    /* Spacing */
    --sidebar-width: 260px;
    --sidebar-collapsed-width: 72px;
    --header-height: 60px;
    
    /* Transitions */
    --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .dashboard-layout {
    display: flex;
    min-height: 100vh;
    background: var(--bg-primary);
  }
  
  /* Sidebar - Enterprise Dark Theme */
  .sidebar {
    width: var(--sidebar-width);
    background: linear-gradient(180deg, var(--sidebar-bg) 0%, var(--sidebar-bg-dark) 100%);
    display: flex;
    flex-direction: column;
    position: fixed;
    height: 100vh;
    overflow-y: auto;
    z-index: 100;
    transition: width var(--transition-base);
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.08);
  }
  
  .dashboard-layout.sidebar-collapsed .sidebar {
    width: var(--sidebar-collapsed-width);
  }
  
  /* Custom scrollbar - subtle */
  .sidebar::-webkit-scrollbar {
    width: 3px;
  }
  
  .sidebar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .sidebar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
  }
  
  .sidebar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
  }
  
  .sidebar-header {
    padding: 1.5rem 1rem;
    border-bottom: 1px solid var(--border-light);
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 72px;
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .logo-icon {
    font-size: 1.5rem;
  }
  
  .sidebar-header h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: white;
    white-space: nowrap;
  }
  
  .collapse-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-light);
    border-radius: 6px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--sidebar-text);
    transition: all var(--transition-fast);
  }
  
  .collapse-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
  
  .collapse-icon {
    font-size: 0.75rem;
  }
  
  .user-info {
    padding: 1rem;
    margin: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;
    border: 1px solid var(--border-light);
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .user-avatar {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--primary) 0%, var(--info) 100%);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1rem;
    color: white;
    flex-shrink: 0;
  }
  
  .user-avatar-collapsed {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--primary) 0%, var(--info) 100%);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1rem;
    color: white;
    margin: 1rem auto;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .user-avatar-collapsed:hover {
    transform: scale(1.05);
  }
  
  .user-details {
    flex: 1;
    min-width: 0;
  }
  
  .user-name {
    font-size: 0.813rem;
    font-weight: 600;
    color: white;
    margin: 0 0 0.125rem 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .user-email {
    font-size: 0.688rem;
    font-weight: 400;
    color: var(--sidebar-text);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .nav-menu {
    flex: 1;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 0.625rem 0.875rem;
    color: var(--sidebar-text);
    text-decoration: none;
    transition: all var(--transition-fast);
    font-size: 0.813rem;
    font-weight: 500;
    border-radius: 8px;
    cursor: pointer;
    white-space: nowrap;
  }
  
  .nav-item:hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--sidebar-text-hover);
  }
  
  .nav-item.active {
    background: rgba(59, 130, 246, 0.15);
    color: var(--sidebar-text-active);
    border-left: 2px solid var(--primary);
  }
  
  .nav-icon {
    font-size: 1.125rem;
    width: 24px;
    flex-shrink: 0;
  }
  
  .nav-text {
    flex: 1;
  }
  
  .sidebar-footer {
    padding: 0.75rem;
    border-top: 1px solid var(--border-light);
  }
  
  .sign-out-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 0.625rem 0.875rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    color: #fca5a5;
    cursor: pointer;
    font-size: 0.813rem;
    font-weight: 500;
    transition: all var(--transition-fast);
  }
  
  .sign-out-btn:hover {
    background: rgba(239, 68, 68, 0.18);
    color: #fecaca;
    border-color: rgba(239, 68, 68, 0.35);
  }
  
  /* Main Content - Optimized for readability */
  .main-content {
    flex: 1;
    margin-left: var(--sidebar-width);
    min-height: 100vh;
    transition: margin-left var(--transition-base);
  }
  
  .dashboard-layout.sidebar-collapsed .main-content {
    margin-left: var(--sidebar-collapsed-width);
  }
  
  /* Mobile Menu */
  .mobile-menu-btn {
    display: none;
    position: fixed;
    top: 1rem;
    left: 1rem;
    z-index: 200;
    background: var(--primary);
    color: white;
    border: none;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    font-size: 1.25rem;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
    transition: all var(--transition-fast);
  }
  
  .mobile-menu-btn:hover {
    background: var(--primary-dark);
    transform: scale(1.02);
  }
  
  .mobile-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
    z-index: 250;
    animation: fadeIn 0.2s ease;
  }
  
  .mobile-sidebar {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    background: linear-gradient(180deg, var(--sidebar-bg) 0%, var(--sidebar-bg-dark) 100%);
    z-index: 300;
    overflow-y: auto;
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.2);
  }
  
  .mobile-sidebar.active {
    transform: translateX(0);
  }
  
  .sign-out-mobile {
    width: 100%;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    color: #fca5a5;
    cursor: pointer;
    margin-top: 0.5rem;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  /* Collapsed sidebar hover tooltip effect */
  .dashboard-layout.sidebar-collapsed .nav-item {
    justify-content: center;
    padding: 0.625rem;
  }
  
  .dashboard-layout.sidebar-collapsed .nav-item .nav-icon {
    margin: 0;
  }
  
  /* Responsive Design */
  @media (max-width: 1024px) {
    .main-content {
      padding: 1rem;
    }
  }
  
  @media (max-width: 768px) {
    .sidebar {
      display: none;
    }
    
    .main-content {
      margin-left: 0 !important;
      padding: 1rem;
      padding-top: 5rem;
    }
    
    .mobile-menu-btn {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .mobile-overlay {
      display: block;
    }
    
    .mobile-sidebar {
      display: block;
    }
  }
  
  /* High Contrast Mode for Accessibility */
  @media (prefers-contrast: high) {
    :root {
      --text-primary: #000000;
      --bg-primary: #ffffff;
      --border-color: #000000;
    }
  }
  
  /* Reduced Motion Preference */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  
  /* Focus visible for keyboard navigation */
  .nav-item:focus-visible,
  .sign-out-btn:focus-visible,
  .collapse-btn:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
</style>
