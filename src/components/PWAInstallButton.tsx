import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const { tr } = useLanguage();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[#1B4D3E]/25 dark:border-[#2A6F5A]/40 bg-[#1B4D3E]/8 dark:bg-[#2A6F5A]/15 text-[#1B4D3E] dark:text-[#7FD1B2] hover:bg-[#1B4D3E]/15 transition-colors font-medium whitespace-nowrap shrink-0 ${
          compact ? 'min-h-[36px] px-2.5 text-xs' : 'w-full min-h-[44px] px-4 text-sm'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{tr('Install App', 'ऐप इंस्टॉल करें')}</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-[#1A1D1B] dark:text-[#F1F3F2] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] transition-colors font-medium whitespace-nowrap shrink-0 ${
          compact ? 'min-h-[36px] px-2.5 text-xs' : 'w-full min-h-[44px] px-4 text-sm'
        }`}
      >
        <Smartphone className="w-4 h-4 shrink-0 text-[#1B4D3E] dark:text-[#7FD1B2]" />
        <span>
          {isIOS ? tr('Add to Home Screen', 'होम स्क्रीन पर जोड़ें') : tr('Install App', 'ऐप डाउनलोड')}
        </span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-[#1A1D1B] dark:text-[#F1F3F2]">
                {isIOS
                  ? tr('Install on iPhone or iPad', 'iPhone या iPad पर इंस्टॉल करें')
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
              <ol className="space-y-2.5 text-sm text-[#5C635E] dark:text-[#9AA59E] list-decimal list-inside">
                <li>{tr("Tap the Share icon in Safari's toolbar.", 'Safari में नीचे Share आइकन पर टैप करें।')}</li>
                <li>{tr('Scroll down and choose Add to Home Screen.', 'नीचे स्क्रॉल करके Add to Home Screen चुनें।')}</li>
                <li>{tr('Tap Add to launch QazaFlow offline anytime.', 'Add पर टैप करें—ऐप होम स्क्रीन पर जुड़ जाएगा।')}</li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-sm text-[#5C635E] dark:text-[#9AA59E] list-decimal list-inside">
                <li>
                  {tr(
                    'Open QazaFlow directly in Google Chrome (not inside an in-app browser).',
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
      )}
    </>
  );
};
