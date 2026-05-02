import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Create a writable store for online status
export const isOnline = writable(browser ? navigator.onLine : true);

// Create a store for connection quality
export const connectionQuality = writable<'good' | 'poor' | 'offline'>('good');

// Create a store for last online time
export const lastOnlineTime = writable<Date | null>(null);

// Only run in browser environment
if (browser) {
  // Update online status when it changes
  window.addEventListener('online', () => {
    isOnline.set(true);
    lastOnlineTime.set(new Date());
    checkConnectionQuality();
  });
  
  window.addEventListener('offline', () => {
    isOnline.set(false);
    connectionQuality.set('offline');
  });
  
  // Initial connection quality check
  checkConnectionQuality();
}

// Function to check connection quality
async function checkConnectionQuality() {
  if (!browser || !navigator.onLine) {
    connectionQuality.set('offline');
    return;
  }
  
  try {
    const start = Date.now();
    // Try to fetch a small resource to check speed
    await fetch('https://www.google.com/favicon.ico', { 
      mode: 'no-cors',
      cache: 'no-store'
    });
    const duration = Date.now() - start;
    
    if (duration < 500) {
      connectionQuality.set('good');
    } else if (duration < 2000) {
      connectionQuality.set('poor');
    } else {
      connectionQuality.set('poor');
    }
  } catch {
    // If fetch fails, assume poor connection
    connectionQuality.set('poor');
  }
}
