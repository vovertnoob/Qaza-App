import React, { useState } from 'react';
import { Download, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { usePWAInstall } from '../hooks/usePWAInstall';

const BANNER_DISMISSED_KEY = 'qazaflow_install_banner_dismissed_v1';

interface PWAInstallButtonProps {
  compact?: boolean;
  variant?: 'button' | 'compact' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  variant,
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isSafari,
    isMacSafari,
    isIOSInAppBrowser,
    canShare,
    install,
  } = usePWAInstall();
  const { tr } = useLanguage();
  const [showGuide, setShowGuide] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(BANNER_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const resolvedVariant = variant ?? (compact ? 'compact' : 'button');

  if (isInstalled) return null;
  if (resolvedVariant === 'banner' && bannerDismissed) return null;

  const handleInstallAction = () => {
    if (isInstallable) {
      void install();
    } else {
      setShowGuide(true);
    }
  };

  const handleOpenIOSShare = async () => {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;
    try {
      await navigator.share({
        title: 'QazaFlow',
        url: window.location.origin,
      });
    } catch {
      // User dismissed share sheet; keep guide open
    }
  };

  const dismissBanner = () => {
    setBannerDismissed(true);
    try {
      window.localStorage.setItem(BANNER_DISMISSED_KEY, '1');
    } catch {
      // Ignore storage errors
    }
  };

  const buttonLabel = isInstallable
    ? resolvedVariant === 'compact'
      ? tr('Install', 'इंस्टॉल')
      : tr('Install App', 'ऐप इंस्टॉल करें')
    : resolvedVariant === 'compact'
      ? tr('Install', 'इंस्टॉल')
      : isIOS
        ? tr('Install on iPhone / iPad', 'iPhone / iPad पर इंस्टॉल करें')
        : isMacSafari
          ? tr('Add to Dock (Safari)', 'Dock में जोड़ें')
          : tr('Install App', 'ऐप इंस्टॉल करें');

  const modalContent = showGuide && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3
            id="pwa-install-title"
            className="text-lg font-semibold text-[#1A1D1B] dark:text-[#F1F3F2]"
          >
            {isIOS
              ? tr('Install on iPhone or iPad', 'iPhone या iPad पर इंस्टॉल करें')
              : isMacSafari
                ? tr('Install from Safari on Mac', 'Mac पर Safari से इंस्टॉल करें')
                : isAndroid
                  ? tr('Install on Android', 'Android फ़ोन पर इंस्टॉल करें')
                  : tr('Install QazaFlow App', 'QazaFlow ऐप इंस्टॉल करें')}
          </h3>
          <button
            type="button"
            onClick={() => setShowGuide(false)}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#5C635E] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622]"
            aria-label={tr('Close', 'बंद करें')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-3">
            {isIOSInAppBrowser ? (
              <p className="text-xs rounded-xl bg-[#B88E44]/10 border border-[#B88E44]/30 px-3 py-2.5 text-[#1A1D1B] dark:text-[#F1F3F2]">
                {tr(
                  'You are inside an in-app browser. First tap the Safari icon or "Open in Safari" so Add to Home Screen appears.',
                  'आप अभी किसी ऐप के अंदर के ब्राउज़र में हैं। पहले "Open in Safari" पर टैप करके इसे Safari में खोलें।'
                )}
              </p>
            ) : !isSafari ? (
              <p className="text-xs rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] px-3 py-2.5 text-[#5C635E] dark:text-[#9AA59E]">
                {tr(
                  'Safari gives the best Home Screen install on iOS (Chrome on iOS 16.4+ also works via the top-right Share icon).',
                  'iPhone पर Safari से ऐप आसानी से इंस्टॉल होता है (या iOS Chrome में ऊपर दाईं ओर Share आइकन से)।'
                )}
              </p>
            ) : null}

            <ol className="space-y-3 text-sm text-[#5C635E] dark:text-[#9AA59E]">
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-[#1B4D3E]/10 dark:bg-[#2A6F5A]/20 text-[#1B4D3E] dark:text-[#7FD1B2] flex items-center justify-center shrink-0 mt-0.5">
                  <Share className="w-3.5 h-3.5" />
                </span>
                <span>
                  {tr(
                    '1. Tap the Share button in Safari (bottom bar on iPhone, or top-right address bar on iPad).',
                    '1. Safari में Share बटन (चौकोर में ऊपर तीर का निशान) पर टैप करें।'
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-[#1B4D3E]/10 dark:bg-[#2A6F5A]/20 text-[#1B4D3E] dark:text-[#7FD1B2] flex items-center justify-center shrink-0 mt-0.5">
                  <PlusSquare className="w-3.5 h-3.5" />
                </span>
                <span>
                  {tr(
                    '2. Scroll down in the menu and tap Add to Home Screen.',
                    '2. मेन्यू में नीचे स्क्रॉल करके Add to Home Screen चुनें।'
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-[#1B4D3E]/10 dark:bg-[#2A6F5A]/20 text-[#1B4D3E] dark:text-[#7FD1B2] flex items-center justify-center shrink-0 mt-0.5 font-mono-num text-xs font-semibold">
                  3
                </span>
                <span>
                  {tr(
                    '3. Tap Add in the top-right corner. QazaFlow will launch full-screen like a native app.',
                    '3. ऊपर दाईं ओर Add पर टैप करें—ऐप आपकी होम स्क्रीन पर जुड़ जाएगा।'
                  )}
                </span>
              </li>
            </ol>

            {canShare && !isIOSInAppBrowser && (
              <button
                type="button"
                onClick={() => void handleOpenIOSShare()}
                className="w-full min-h-[42px] rounded-xl border border-[#1B4D3E]/30 dark:border-[#2A6F5A]/50 bg-[#1B4D3E]/8 dark:bg-[#2A6F5A]/15 text-[#1B4D3E] dark:text-[#7FD1B2] text-xs font-medium inline-flex items-center justify-center gap-2 hover:bg-[#1B4D3E]/15 transition-colors"
              >
                <Share className="w-3.5 h-3.5" />
                <span>{tr('Open Share Menu Now', 'अभी Share मेन्यू खोलें')}</span>
              </button>
            )}
          </div>
        ) : isMacSafari ? (
          <ol className="space-y-2.5 text-sm text-[#5C635E] dark:text-[#9AA59E] list-decimal list-inside">
            <li>
              {tr(
                'Click File in the top Safari menu bar (or the Share icon in the address bar).',
                'ऊपर Safari मेन्यू बार में File (या एड्रेस बार में Share आइकन) पर क्लिक करें।'
              )}
            </li>
            <li>
              {tr(
                'Choose Add to Dock… and click Add.',
                'Add to Dock… चुनें और Add पर क्लिक करें।'
              )}
            </li>
          </ol>
        ) : (
          <ol className="space-y-2.5 text-sm text-[#5C635E] dark:text-[#9AA59E] list-decimal list-inside">
            <li>
              {tr(
                'Open QazaFlow directly in Google Chrome or Edge (not inside an in-app browser).',
                'इसे सीधे Google Chrome ब्राउज़र में खोलें।'
              )}
            </li>
            <li>
              {tr(
                'Tap the menu icon (⋮) in the top-right corner of your browser.',
                'ऊपर दाईं ओर 3-डॉट मेनू (⋮) पर टैप करें।'
              )}
            </li>
            <li>
              {tr(
                'Choose Install app or Add to Home screen, then confirm Install.',
                'Install app या Add to Home screen चुनें और Install पर टैप करें।'
              )}
            </li>
          </ol>
        )}

        <button
          type="button"
          onClick={() => setShowGuide(false)}
          className="w-full min-h-[44px] rounded-xl bg-[#1B4D3E] text-white text-sm font-medium hover:bg-[#143B2F] transition-colors"
        >
          {tr('Got it', 'समझ गया')}
        </button>
      </div>
    </div>
  );

  if (resolvedVariant === 'banner') {
    return (
      <>
        <div className="rounded-2xl border border-[#1B4D3E]/25 dark:border-[#2A6F5A]/40 bg-white dark:bg-[#151C19] px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#1B4D3E]/10 dark:bg-[#2A6F5A]/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1A1D1B] dark:text-[#F1F3F2] truncate">
                {isIOS
                  ? tr('Install QazaFlow on your iPhone / iPad', 'iPhone / iPad पर QazaFlow इंस्टॉल करें')
                  : tr('Install QazaFlow as an App', 'QazaFlow ऐप के रूप में इंस्टॉल करें')}
              </p>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                {isIOS
                  ? tr(
                      'Works full-screen & offline from your Home Screen via Safari.',
                      'Safari से होम स्क्रीन पर जोड़ें—ऑफ़लाइन भी चलेगा।'
                    )
                  : tr(
                      'Quick Home Screen access and offline support.',
                      'होम स्क्रीन से तुरंत खोलें और ऑफ़लाइन इस्तेमाल करें।'
                    )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
              type="button"
              onClick={handleInstallAction}
              className="min-h-[38px] px-3.5 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs font-medium hover:bg-[#143B2F] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>{tr('Install App', 'ऐप इंस्टॉल करें')}</span>
            </button>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label={tr('Dismiss install banner', 'हटाएं')}
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] text-[#5C635E] hover:text-[#1A1D1B] dark:hover:text-[#F1F3F2]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {modalContent}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstallAction}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl transition-colors font-medium whitespace-nowrap shrink-0 ${
          isInstallable || isIOS
            ? 'border border-[#1B4D3E]/25 dark:border-[#2A6F5A]/40 bg-[#1B4D3E]/8 dark:bg-[#2A6F5A]/15 text-[#1B4D3E] dark:text-[#7FD1B2] hover:bg-[#1B4D3E]/15'
            : 'border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-[#1A1D1B] dark:text-[#F1F3F2] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622]'
        } ${
          resolvedVariant === 'compact'
            ? 'min-h-[36px] px-2.5 text-xs'
            : 'w-full min-h-[44px] px-4 text-sm'
        }`}
      >
        {isInstallable ? (
          <Download className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Smartphone className="w-3.5 h-3.5 shrink-0 text-[#1B4D3E] dark:text-[#7FD1B2]" />
        )}
        <span>{buttonLabel}</span>
      </button>
      {modalContent}
    </>
  );
};
