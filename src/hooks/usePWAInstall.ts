import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isMacSafari, setIsMacSafari] = useState(false);
  const [isIOSInAppBrowser, setIsIOSInAppBrowser] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
      const iosStandalone =
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(standaloneMatch || iosStandalone);
    };

    checkStandalone();

    const ua = window.navigator.userAgent.toLowerCase();
    const platform = (window.navigator.platform || '').toLowerCase();
    const touchPoints = window.navigator.maxTouchPoints || 0;

    // Detect iPhone, iPad, iPod, and iPadOS / iPhone Safari with "Request Desktop Website"
    const iosDevice =
      /iphone|ipad|ipod/.test(ua) || (platform.includes('mac') && touchPoints > 1);
    const androidDevice = /android/.test(ua);
    const safariBrowser =
      /safari/.test(ua) && !/chrome|crios|fxios|edgios|opios|android/.test(ua);
    const macSafari = !iosDevice && !androidDevice && /macintosh/.test(ua) && safariBrowser;
    const inAppBrowser =
      iosDevice && /fban|fbav|instagram|whatsapp|line\/|micromessenger|gsa\//.test(ua);

    setIsIOS(iosDevice);
    setIsAndroid(androidDevice);
    setIsSafari(safariBrowser);
    setIsMacSafari(macSafari);
    setIsIOSInAppBrowser(inAppBrowser);
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = () => checkStandalone();
    mediaQuery.addEventListener?.('change', handleMediaChange);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener?.('change', handleMediaChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isSafari,
    isMacSafari,
    isIOSInAppBrowser,
    canShare,
    install,
  };
}
