import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[#1B4D3E]/25 dark:border-[#2A6F5A]/40 bg-[#1B4D3E]/8 dark:bg-[#2A6F5A]/15 text-[#1B4D3E] dark:text-[#7FD1B2] hover:bg-[#1B4D3E]/15 transition-colors font-medium whitespace-nowrap shrink-0 ${
          compact ? 'min-h-[40px] px-3 text-xs' : 'w-full min-h-[44px] px-4 text-sm'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-[#1A1D1B] dark:text-[#F1F3F2] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] transition-colors font-medium whitespace-nowrap shrink-0 ${
          compact ? 'min-h-[40px] px-3 text-xs' : 'w-full min-h-[44px] px-4 text-sm'
        }`}
      >
        <Smartphone className="w-4 h-4 shrink-0 text-[#1B4D3E] dark:text-[#7FD1B2]" />
        <span>{isIOS ? 'Add to Home Screen' : 'Install App'}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-[#1A1D1B] dark:text-[#F1F3F2]">
                {isIOS
                  ? 'Install on iPhone or iPad'
                  : isAndroid
                    ? 'Install on Android'
                    : 'Install QazaFlow App'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#5C635E] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2.5 text-sm text-[#5C635E] dark:text-[#9AA59E] list-decimal list-inside">
                <li>
                  Tap the <strong className="text-[#1A1D1B] dark:text-[#F1F3F2]">Share</strong> icon
                  in Safari&apos;s toolbar.
                </li>
                <li>
                  Scroll down and choose{' '}
                  <strong className="text-[#1A1D1B] dark:text-[#F1F3F2]">Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong className="text-[#1A1D1B] dark:text-[#F1F3F2]">Add</strong> to launch
                  QazaFlow offline anytime.
                </li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-sm text-[#5C635E] dark:text-[#9AA59E] list-decimal list-inside">
                <li>
                  Open QazaFlow directly in{' '}
                  <strong className="text-[#1A1D1B] dark:text-[#F1F3F2]">Google Chrome</strong> (not
                  inside an in-app browser).
                </li>
                <li>
                  Tap the{' '}
                  <strong className="text-[#1A1D1B] dark:text-[#F1F3F2]">menu icon (⋮)</strong> in
                  the top-right corner of your browser.
                </li>
                <li>
                  Choose{' '}
                  <strong className="text-[#1A1D1B] dark:text-[#F1F3F2]">Install app</strong> or{' '}
                  <strong className="text-[#1A1D1B] dark:text-[#F1F3F2]">Add to Home screen</strong>
                  , then confirm <strong className="text-[#1A1D1B] dark:text-[#F1F3F2]">Install</strong>.
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full min-h-[44px] rounded-xl bg-[#1B4D3E] text-white text-sm font-medium hover:bg-[#143B2F] transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
