<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';

  let { children } = $props();
  let sessionStatus = $state('checking');
  let sessionExpiryWarning = $state(false);

  // Function to check and refresh session if needed
  async function ensureValidSession() {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.log('🔄 No session, attempting to refresh...');
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession) {
        console.error('❌ Cannot refresh session:', refreshError);
        sessionStatus = 'expired';
        return null;
      }
      
      console.log('✅ Session refreshed successfully');
      sessionStatus = 'active';
      return refreshedSession;
    }
    
    // Check if session is about to expire (within 5 minutes)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;
      
      if (timeUntilExpiry < 300) {
        console.log(`⚠️ Session expires in ${Math.floor(timeUntilExpiry / 60)} minutes`);
        sessionExpiryWarning = true;
        
        if (timeUntilExpiry < 60) {
          console.log('🔄 Session expiring soon, refreshing...');
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshedSession) {
            console.log('✅ Session refreshed');
            sessionExpiryWarning = false;
            return refreshedSession;
          }
        }
      } else {
        sessionExpiryWarning = false;
      }
    }
    
    sessionStatus = 'active';
    return session;
  }

  onMount(() => {
    console.log('🔵 Layout mounted');
    
    // Initial session check
    ensureValidSession();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event);
      
      if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        sessionStatus = 'expired';
        // Don't auto-redirect - let the user decide
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed successfully');
        sessionStatus = 'active';
        sessionExpiryWarning = false;
      } else if (event === 'SIGNED_IN') {
        console.log('✅ User signed in');
        sessionStatus = 'active';
      }
    });
    
    // Set up periodic session check (every 2 minutes)
    const interval = setInterval(async () => {
      await ensureValidSession();
    }, 120000); // 2 minutes
    
    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<!-- Session Status Indicator (optional - shows in corner) -->
{#if sessionStatus === 'expired'}
  <div class="session-banner expired">
    <span>⚠️ Your session has expired</span>
    <button onclick={() => goto('/')}>Log in again</button>
  </div>
{:else if sessionExpiryWarning}
  <div class="session-banner warning">
    <span>⏰ Your session will expire soon</span>
    <button onclick={() => window.location.reload()}>Refresh Session</button>
  </div>
{/if}

{@render children()}

<style>
  .session-banner {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10000;
    font-size: 0.875rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    backdrop-filter: blur(10px);
    animation: slideIn 0.3s ease;
  }
  
  .session-banner.expired {
    background: rgba(239, 68, 68, 0.95);
    color: white;
    border: 1px solid rgba(255,255,255,0.2);
  }
  
  .session-banner.warning {
    background: rgba(245, 158, 11, 0.95);
    color: white;
    border: 1px solid rgba(255,255,255,0.2);
  }
  
  .session-banner button {
    padding: 4px 12px;
    background: white;
    color: #1f2937;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .session-banner button:hover {
    background: #f3f4f6;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @media (max-width: 640px) {
    .session-banner {
      bottom: 10px;
      right: 10px;
      left: 10px;
      flex-direction: column;
      text-align: center;
    }
  }
</style>
