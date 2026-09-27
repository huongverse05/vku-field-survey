/**
 * ==============================================================================
 * VKU FIELD SURVEY PWA - SERVICE WORKER REGISTRATION & SYNC MANAGER (js/sw-register.js)
 * Course: Cross-Platform Mobile App Development - Week 3
 * Faculty of Computer Science - VKU (Vietnam - Korea University of ICT)
 * ==============================================================================
 */

window.vkuSW = {
  registration: null,
  isSyncSupported: false,

  /**
   * Initializes Service Worker and registers lifecycle hooks
   */
  async init() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW Register] Service Worker is not supported in this browser.');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('./sw.js', {
        scope: './'
      });
      this.registration = registration;
      console.log('[SW Register] Service Worker registered with scope:', registration.scope);

      // Check if Background Sync API is supported
      if ('sync' in registration) {
        this.isSyncSupported = true;
        console.log('[SW Register] Background Sync API is supported natively.');
      } else {
        console.log('[SW Register] Background Sync API not supported. Falling back to Online event listener.');
      }

      // Handle Service Worker update lifecycle
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('[SW Register] New PWA version available!');
              window.dispatchEvent(new CustomEvent('vku-sw-update-available'));
            } else {
              console.log('[SW Register] App Shell cached for offline use.');
              window.dispatchEvent(new CustomEvent('vku-sw-cached'));
            }
          }
        });
      });

      // Listen for messages dispatched by Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[SW Register] Message received from Service Worker:', event.data);
        if (event.data && event.data.type === 'BACKGROUND_SYNC_TRIGGERED') {
          window.dispatchEvent(new CustomEvent('vku-background-sync', { detail: event.data }));
        }
      });

    } catch (error) {
      console.error('[SW Register] Service Worker registration failed:', error);
    }
  },

  /**
   * Request Background Sync registration
   * @param {string} tag
   */
  async requestBackgroundSync(tag = 'sync-surveys') {
    if (this.isSyncSupported && this.registration && this.registration.sync) {
      try {
        await this.registration.sync.register(tag);
        console.log(`[SW Register] Registered Background Sync tag: "${tag}"`);
        return true;
      } catch (err) {
        console.warn('[SW Register] Background Sync registration error:', err);
      }
    }
    return false;
  },

  /**
   * Skip waiting to activate new service worker
   */
  skipWaiting() {
    if (this.registration && this.registration.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }
};

// Auto-register on page load
window.addEventListener('load', () => {
  window.vkuSW.init();
});
