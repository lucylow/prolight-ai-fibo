/**
 * Dev-time service worker unregister helper
 * Unregisters all service workers in development to prevent caching issues
 */
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => {
      r.unregister().then((success) => {
        if (success) {
          console.log('[Dev] Service worker unregistered');
        }
      });
    });
  });
}
