import React, { useMemo } from 'react';
import {
  Activity,
  Bell,
  BookOpen,
  CheckSquare,
  Cloud,
  CloudOff,
  Home,
  Languages,
  RotateCcw,
  Settings,
  X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useQaza } from '../context/QazaContext';
import { PRAYERS } from '../types/qaza';
import type { NavTab } from './HomeDashboard';
import { PWAInstallButton } from './PWAInstallButton';

interface AppShellProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onOpenAuth: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onNavigate,
  onOpenAuth,
  children,
}) => {
  const {
    user,
    isOnline,
    syncState,
    snapshot,
    undoToast,
    undoLastAction,
    dismissUndoToast,
    inAppReminder,
    dismissInAppReminder,
    hasGuestImportAvailable,
    importGuestToCloud,
    dismissGuestImport,
  } = useQaza();
  const { lang, toggleLang, tr } = useLanguage();

  const navItems: { id: NavTab; label: string; shortLabel: string; Icon: React.ElementType }[] = [
    { id: 'home', label: tr('Home', 'होम'), shortLabel: tr('Home', 'होम'), Icon: Home },
    { id: 'tracker', label: tr('Qaza Tracker', 'क़ज़ा ट्रैकर'), shortLabel: tr('Qaza', 'क़ज़ा'), Icon: CheckSquare },
    { id: 'deen', label: tr('Deen Tracker', 'दीन ट्रैकर'), shortLabel: tr('Deen', 'दीन'), Icon: BookOpen },
    { id: 'activity', label: tr('Activity', 'गतिविधि'), shortLabel: tr('Activity', 'इतिहास'), Icon: Activity },
    { id: 'settings', label: tr('Settings', 'सेटिंग्स'), shortLabel: tr('Settings', 'सेटिंग्स'), Icon: Settings },
  ];

  const summary = useMemo(() => {
    let pending = 0;
    let completed = 0;
    for (const p of PRAYERS) {
      pending += snapshot.balances[p.id].pendingBalance;
      completed += snapshot.balances[p.id].completedBalance;
    }
    const total = pending + completed;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { pending, completed, pct };
  }, [snapshot.balances]);

  const pageTitle = navItems.find((item) => item.id === activeTab)?.label || tr('Home', 'होम');

  const syncLabel =
    syncState === 'offline'
      ? tr('Offline · Saved locally', 'ऑफ़लाइन · फ़ोन में सुरक्षित')
      : syncState === 'syncing'
        ? tr('Syncing changes', 'सिंक हो रहा है')
        : syncState === 'synced'
          ? tr('Cloud synced', 'क्लाउड से जुड़ा है')
          : tr('Local device mode', 'लोकल डिवाइस मोड');

  return (
    <div className="min-h-screen bg-[#F8F7F4] dark:bg-[#0E1311] text-[#1A1D1B] dark:text-[#F1F3F2] flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 md:flex-col md:fixed md:inset-y-0 border-r border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] z-30">
        <div className="h-16 px-5 flex items-center justify-between gap-2 border-b border-[#E5E2DC] dark:border-[#242E2A]">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/icon.svg" alt="" className="w-7 h-7 rounded-lg shrink-0" />
            <span className="font-display text-lg font-semibold tracking-tight whitespace-nowrap">
              QazaFlow
            </span>
          </div>
          <button
            type="button"
            onClick={toggleLang}
            aria-label={tr('Switch to Hindi', 'अंग्रेज़ी में बदलें')}
            className="min-h-[34px] px-2.5 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:border-[#1B4D3E] text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Languages className="w-3.5 h-3.5 text-[#1B4D3E] dark:text-[#7FD1B2]" />
            <span>{lang === 'en' ? 'हिंदी' : 'EN'}</span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1" aria-label={tr('Primary navigation', 'मुख्य नेविगेशन')}>
          {navItems.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className={`w-full min-h-[44px] px-3.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white'
                    : 'text-[#5C635E] dark:text-[#9AA59E] hover:bg-[#F8F7F4] dark:hover:bg-[#0E1311] hover:text-[#1A1D1B] dark:hover:text-[#F1F3F2]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Qaza Summary + Sync + Install */}
        <div className="p-4 space-y-3 border-t border-[#E5E2DC] dark:border-[#242E2A]">
          <div className="p-4 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#5C635E] dark:text-[#9AA59E]">
              <span>{tr('Remaining Qaza', 'बाक़ी क़ज़ा')}</span>
              <span className="font-mono-num font-medium text-[#1B4D3E] dark:text-[#7FD1B2]">
                {summary.pct}%
              </span>
            </div>
            <p className="text-2xl font-semibold font-mono-num">
              {summary.pending.toLocaleString()}
            </p>
            <div className="h-1.5 w-full rounded-full bg-[#E5E2DC] dark:bg-[#242E2A] overflow-hidden">
              <div
                className="h-full bg-[#1B4D3E] dark:bg-[#2E7D5B]"
                style={{ width: `${Math.min(100, summary.pct)}%` }}
              />
            </div>
            <p className="text-[11px] text-[#7A827D] font-mono-num">
              {summary.completed.toLocaleString()} {tr('completed', 'पूरी हुईं')}
            </p>
          </div>

          <PWAInstallButton />

          {user ? (
            <div className="px-2 py-1.5 flex items-center justify-between gap-2 text-xs text-[#5C635E] dark:text-[#9AA59E]">
              <div className="flex items-center gap-2 min-w-0">
                {isOnline ? (
                  <Cloud className="w-3.5 h-3.5 text-[#2E7D5B] shrink-0" />
                ) : (
                  <CloudOff className="w-3.5 h-3.5 text-[#B88E44] shrink-0" />
                )}
                <span className="truncate">{syncLabel}</span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-full min-h-[42px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] text-xs font-medium text-[#1A1D1B] dark:text-[#F1F3F2] hover:bg-[#F8F7F4] dark:hover:bg-[#0E1311] flex items-center justify-center gap-2"
            >
              <Cloud className="w-3.5 h-3.5 text-[#1B4D3E] dark:text-[#7FD1B2]" />
              <span>{tr('Sign in for Cloud Sync', 'क्लाउड बैकअप के लिए साइन इन')}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex-1 md:pl-64 lg:pl-72 flex flex-col min-w-0">
        {/* Compact Top Header */}
        <header className="sticky top-0 z-20 h-[52px] md:h-16 bg-[#F8F7F4]/90 dark:bg-[#0E1311]/90 backdrop-blur-md border-b border-[#E5E2DC] dark:border-[#242E2A] px-4 sm:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/icon.svg" alt="" className="w-6 h-6 rounded-md md:hidden shrink-0" />
            <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isOnline && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B88E44] dark:text-[#D4AA5E] whitespace-nowrap">
                <CloudOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tr('Offline', 'ऑफ़लाइन')}</span>
              </span>
            )}

            <button
              type="button"
              onClick={toggleLang}
              aria-label={tr('Switch to Hindi', 'Switch to English')}
              className="min-h-[36px] px-2.5 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Languages className="w-3.5 h-3.5 text-[#1B4D3E] dark:text-[#7FD1B2]" />
              <span>{lang === 'en' ? 'हिंदी' : 'English'}</span>
            </button>

            <div className="md:hidden">
              <PWAInstallButton compact />
            </div>

            {!user && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="md:hidden min-h-[36px] px-2.5 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-xs font-medium whitespace-nowrap"
              >
                {tr('Sign In', 'साइन इन')}
              </button>
            )}
            {user && (
              <span className="hidden sm:inline text-xs text-[#5C635E] dark:text-[#9AA59E] truncate max-w-[180px]">
                {user.email || user.displayName}
              </span>
            )}
          </div>
        </header>

        {/* Contextual Banners */}
        <div className="px-4 sm:px-8 pt-4 max-w-6xl w-full mx-auto space-y-3">
          {!isOnline && (
            <div className="rounded-xl border border-[#B88E44]/40 bg-[#B88E44]/10 px-4 py-2.5 text-xs text-[#1A1D1B] dark:text-[#F1F3F2] flex items-center justify-between gap-3">
              <span>
                {tr(
                  'Offline mode active. Your Qaza & Deen logs are saved locally and will sync automatically when you reconnect.',
                  'ऑफ़लाइन मोड चालू है। आपका क़ज़ा और दीन रिकॉर्ड डिवाइस में सेव है और इंटरनेट आते ही अपने आप सिंक हो जाएगा।'
                )}
              </span>
            </div>
          )}

          {inAppReminder && (
            <div className="rounded-xl border border-[#1B4D3E]/30 bg-[#1B4D3E]/8 px-4 py-2.5 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2] shrink-0" />
                <span>{inAppReminder}</span>
              </div>
              <button
                type="button"
                onClick={dismissInAppReminder}
                aria-label={tr('Dismiss reminder', 'बंद करें')}
                className="p-1 text-[#5C635E] hover:text-[#1A1D1B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {hasGuestImportAvailable && (
            <div className="rounded-xl border border-[#1B4D3E]/30 bg-white dark:bg-[#151C19] px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-3">
              <span>
                {tr(
                  'Local guest progress was found on this device. Would you like to merge it into your account?',
                  'इस डिवाइस पर लोकल डेटा मिला है। क्या आप इसे अपने खाते में जोड़ना चाहते हैं?'
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void importGuestToCloud()}
                  className="px-3 py-1.5 rounded-lg bg-[#1B4D3E] text-white font-medium"
                >
                  {tr('Merge Progress', 'डेटा जोड़ें')}
                </button>
                <button
                  type="button"
                  onClick={dismissGuestImport}
                  className="px-3 py-1.5 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A]"
                >
                  {tr('Dismiss', 'हटाएं')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-8 pt-4 pb-24 md:pb-10 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label={tr('Mobile navigation', 'मोबाइल नेविगेशन')}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#151C19]/95 backdrop-blur-md border-t border-[#E5E2DC] dark:border-[#242E2A] grid grid-cols-5 h-16 pb-safe"
      >
        {navItems.map(({ id, shortLabel, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors px-1 ${
                active
                  ? 'text-[#1B4D3E] dark:text-[#7FD1B2] font-semibold'
                  : 'text-[#5C635E] dark:text-[#9AA59E]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] leading-none truncate max-w-full">{shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Undo Toast */}
      {undoToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-50 rounded-xl bg-[#1A1D1B] dark:bg-[#F1F3F2] text-white dark:text-[#1A1D1B] px-4 py-3 shadow-lg flex items-center justify-between gap-3"
        >
          <span className="text-xs sm:text-sm font-medium truncate">{undoToast.message}</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void undoLastAction(undoToast)}
              className="min-h-[34px] px-3 rounded-lg bg-[#2E7D5B] text-white text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#25664A]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{tr('Undo', 'वापस लें')}</span>
            </button>
            <button
              type="button"
              onClick={dismissUndoToast}
              aria-label={tr('Close notification', 'सूचना बंद करें')}
              className="p-1 opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
