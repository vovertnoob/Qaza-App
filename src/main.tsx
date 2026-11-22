import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // Check for new deployments whenever the installed app returns to the foreground
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          void registration.update();
        }
      });

      // Also check periodically while open
      window.setInterval(() => {
        if (navigator.onLine) {
          void registration.update();
        }
      }, 30 * 60 * 1000);
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
