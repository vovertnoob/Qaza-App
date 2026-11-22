import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Cloud,
  Download,
  FileText,
  Languages,
  LogOut,
  Moon,
  RefreshCw,
  Shield,
  Sun,
  Upload,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useQaza } from '../context/QazaContext';
import {
  exportToCsv,
  exportToJsonBackup,
  exportToPdf,
  validateBackupJson,
} from '../lib/exportUtils';
import {
  PRAYERS,
  ROUTINE_OPTIONS,
  type FocusPrayer,
  type PrayerType,
  type RoutineType,
  type TargetType,
  type ThemePreference,
} from '../types/qaza';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsViewProps {
  onOpenAuth: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenAuth }) => {
  const {
    user,
    snapshot,
    syncState,
    hasGuestImportAvailable,
    importGuestToCloud,
    dismissGuestImport,
    resendVerificationEmail,
    signOutUser,
    adjustBalances,
    updatePreferences,
    restoreFromBackup,
    resetAllData,
    markManualBackup,
  } = useQaza();
  const { lang, setLang, tr, prayerLabel, routineInfo } = useLanguage();

  const [editableBalances, setEditableBalances] = useState<
    Record<PrayerType, { initialBalance: number; pendingBalance: number; completedBalance: number }>
  >(() => {
    const map = {} as Record<
      PrayerType,
      { initialBalance: number; pendingBalance: number; completedBalance: number }
    >;
    for (const p of PRAYERS) {
      map[p.id] = {
        initialBalance: snapshot.balances[p.id].initialBalance,
        pendingBalance: snapshot.balances[p.id].pendingBalance,
        completedBalance: snapshot.balances[p.id].completedBalance,
      };
    }
    return map;
  });

  useEffect(() => {
    const map = {} as Record<
      PrayerType,
      { initialBalance: number; pendingBalance: number; completedBalance: number }
    >;
    for (const p of PRAYERS) {
      map[p.id] = {
        initialBalance: snapshot.balances[p.id].initialBalance,
        pendingBalance: snapshot.balances[p.id].pendingBalance,
        completedBalance: snapshot.balances[p.id].completedBalance,
      };
    }
    setEditableBalances(map);
  }, [snapshot.balances]);

  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const notifySaved = (msg: string) => {
    setErrorBanner(null);
    setStatusBanner(msg);
    window.setTimeout(() => setStatusBanner(null), 4000);
  };

  const handleSaveBalances = async (e: React.FormEvent) => {
    e.preventDefault();
    await adjustBalances(editableBalances);
    notifySaved(tr('Prayer balances updated.', 'क़ज़ा हिसाब अपडेट हो गया।'));
  };

  const handleRequestNotifications = async () => {
    if (typeof Notification === 'undefined') {
      setNotifPermission('unsupported');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      await updatePreferences({ remindersEnabled: true });
      notifySaved(
        tr(
          'Browser notifications enabled for daily reminders.',
          'रोज़ाना रिमाइंडर के लिए नोटिफ़िकेशन चालू हो गए।'
        )
      );
    }
  };

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = validateBackupJson(text);
      await restoreFromBackup(parsed);
      notifySaved(tr('Backup restored successfully.', 'बैकअप सफलतापूर्वक वापस आ गया।'));
    } catch (err) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : tr('Unable to read backup file.', 'बैकअप फ़ाइल पढ़ी नहीं जा सकी।')
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmReset = async () => {
    if (resetConfirmText.trim().toUpperCase() !== 'RESET') return;
    await resetAllData();
    setShowResetModal(false);
    setResetConfirmText('');
  };

  return (
    <div className="space-y-6 pb-8 max-w-4xl">
      {statusBanner && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Language Selector */}
      <section className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Languages className="w-5 h-5 text-[#1B4D3E] dark:text-[#7FD1B2] mt-0.5 shrink-0" />
          <div>
            <h2 className="text-lg font-semibold">{tr('Language / भाषा', 'भाषा / Language')}</h2>
            <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-0.5">
              {tr(
                'Switch the entire app and prayer alarm announcements between English and Hindi.',
                'पूरे ऐप और नमाज़ अलार्म की आवाज़ को हिंदी या अंग्रेज़ी में बदलें।'
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A]">
          <button
            type="button"
            onClick={() => {
              setLang('en');
              notifySaved('Language set to English.');
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              lang === 'en'
                ? 'bg-white dark:bg-[#151C19] text-[#1A1D1B] dark:text-[#F1F3F2] shadow-sm'
                : 'text-[#5C635E] dark:text-[#9AA59E]'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => {
              setLang('hi');
              notifySaved('भाषा हिंदी पर सेट हो गई।');
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              lang === 'hi'
                ? 'bg-white dark:bg-[#151C19] text-[#1A1D1B] dark:text-[#F1F3F2] shadow-sm'
                : 'text-[#5C635E] dark:text-[#9AA59E]'
            }`}
          >
            हिंदी (Hindi)
          </button>
        </div>
      </section>

      {/* Account & Sync */}
      <section className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Cloud className="w-5 h-5 text-[#1B4D3E] dark:text-[#7FD1B2] mt-0.5 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold">
                {tr('Account & Cloud Sync', 'खाता और क्लाउड बैकअप')}
              </h2>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-0.5">
                {user
                  ? tr(
                      `Signed in as ${user.email || user.displayName || 'User'} · Sync status: ${syncState}`,
                      `लॉगिन: ${user.email || user.displayName || 'User'} · स्थिति: ${syncState}`
                    )
                  : tr(
                      'Currently using Local Guest storage. Sign in to enable automatic cloud backup across devices.',
                      'अभी डेटा इसी डिवाइस में सेव है। दूसरे फ़ोन में सिंक के लिए साइन इन करें।'
                    )}
              </p>
            </div>
          </div>
          {user ? (
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="min-h-[40px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] text-xs font-medium inline-flex items-center gap-2 hover:bg-[#F8F7F4] dark:hover:bg-[#0E1311]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{tr('Sign Out', 'साइन आउट')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="min-h-[42px] px-5 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs font-medium hover:bg-[#143B2F]"
            >
              {tr('Sign In / Create Account', 'साइन इन / नया खाता बनाएं')}
            </button>
          )}
        </div>

        {user && !user.emailVerified && user.email && (
          <div className="p-3.5 rounded-xl border border-[#B88E44]/40 bg-[#B88E44]/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span>
              {tr(
                `Please verify your email address (${user.email}) for full account recovery.`,
                `कृपया अपना ईमेल (${user.email}) वेरीफ़ाई करें।`
              )}
            </span>
            <button
              type="button"
              onClick={async () => {
                await resendVerificationEmail();
                notifySaved(tr('Verification email sent.', 'वेरिफ़िकेशन ईमेल भेज दिया गया।'));
              }}
              className="font-medium text-[#1B4D3E] dark:text-[#7FD1B2] underline"
            >
              {tr('Resend verification email', 'वेरिफ़िकेशन ईमेल दोबारा भेजें')}
            </button>
          </div>
        )}

        {hasGuestImportAvailable && (
          <div className="p-3.5 rounded-xl border border-[#1B4D3E]/30 bg-[#1B4D3E]/8 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span>
              {tr(
                'We found local guest tracking progress on this device. Merge it into your cloud account?',
                'इस डिवाइस पर लोकल डेटा मिला है। क्या इसे अपने क्लाउड खाते में जोड़ें?'
              )}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await importGuestToCloud();
                  notifySaved(tr('Local progress merged into your cloud account.', 'लोकल डेटा खाते में जुड़ गया।'));
                }}
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

        <div className="pt-3 border-t border-[#E5E2DC] dark:border-[#242E2A] grid sm:grid-cols-2 gap-3 text-xs text-[#5C635E] dark:text-[#9AA59E]">
          <div>
            <span>{tr('Last sync', 'आख़िरी सिंक')}: </span>
            <span className="font-mono-num text-[#1A1D1B] dark:text-[#F1F3F2]">
              {snapshot.syncMetadata.lastSyncAt
                ? new Date(snapshot.syncMetadata.lastSyncAt).toLocaleString(lang === 'hi' ? 'hi-IN' : [])
                : tr('Local only', 'सिर्फ़ डिवाइस')}
            </span>
          </div>
          <div>
            <span>{tr('Last backup', 'आख़िरी बैकअप')}: </span>
            <span className="font-mono-num text-[#1A1D1B] dark:text-[#F1F3F2]">
              {snapshot.syncMetadata.lastBackupAt
                ? new Date(snapshot.syncMetadata.lastBackupAt).toLocaleString(lang === 'hi' ? 'hi-IN' : [])
                : tr('Not yet backed up', 'अभी तक नहीं')}
            </span>
          </div>
        </div>

        <div className="pt-1">
          <PWAInstallButton />
        </div>
      </section>

      {/* Edit Balances */}
      <section className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            {tr('Edit Qaza Balances', 'क़ज़ा नमाज़ों का हिसाब बदलें')}
          </h2>
          <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
            {tr(
              'Adjust your initial estimate, pending balance, or completed total anytime.',
              'अपनी शुरुआती, बाक़ी या अदा की गई नमाज़ों की संख्या कभी भी बदलें।'
            )}
          </p>
        </div>

        <form onSubmit={(e) => void handleSaveBalances(e)} className="space-y-4">
          <div className="overflow-x-auto border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F7F4] dark:bg-[#0E1311] text-xs text-[#5C635E] dark:text-[#9AA59E]">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">{tr('Prayer', 'नमाज़')}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{tr('Initial', 'शुरुआती')}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{tr('Pending', 'बाक़ी')}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{tr('Completed', 'पूरी')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A]">
                {PRAYERS.map((p) => {
                  const row = editableBalances[p.id];
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-2.5 font-medium">{prayerLabel(p.id)}</td>
                      {(['initialBalance', 'pendingBalance', 'completedBalance'] as const).map(
                        (field) => (
                          <td key={field} className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              max={1000000}
                              aria-label={`${prayerLabel(p.id)} ${field}`}
                              value={row[field]}
                              onChange={(e) => {
                                const val = Math.max(
                                  0,
                                  Math.min(1000000, parseInt(e.target.value, 10) || 0)
                                );
                                setEditableBalances((prev) => ({
                                  ...prev,
                                  [p.id]: { ...prev[p.id], [field]: val },
                                }));
                              }}
                              className="w-24 min-h-[38px] px-2.5 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-right font-mono-num text-sm"
                            />
                          </td>
                        )
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="submit"
            className="min-h-[44px] px-5 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-sm font-medium hover:bg-[#143B2F]"
          >
            {tr('Save Balance Changes', 'बदलाव सेव करें')}
          </button>
        </form>
      </section>

      {/* Routine & Targets */}
      <section className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold">
            {tr('Routine & Targets', 'तरीक़ा और लक्ष्य')}
          </h2>
          <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
            {tr(
              'Personal organizational settings. Changing these never alters your logged history.',
              'ये सिर्फ़ आपकी सुविधा के लिए हैं—इन्हें बदलने से पिछला डेटा नहीं बदलता।'
            )}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1.5">
              {tr('Tracking Routine', 'पढ़ने का तरीक़ा')}
            </label>
            <select
              value={snapshot.profile.routine}
              onChange={(e) => {
                void updatePreferences({ routine: e.target.value as RoutineType });
                notifySaved(tr('Routine updated.', 'तरीक़ा अपडेट हो गया।'));
              }}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-sm"
            >
              {ROUTINE_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {routineInfo(r.id).title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1.5">
              {tr('Target Cadence & Count', 'लक्ष्य अवधि और गिनती')}
            </label>
            <div className="flex items-center gap-2">
              <select
                value={snapshot.profile.targetType}
                onChange={(e) => {
                  const t = e.target.value as TargetType;
                  void updatePreferences({
                    targetType: t,
                    targetCount: t === 'none' ? 0 : Math.max(1, snapshot.profile.targetCount || 1),
                  });
                  notifySaved(tr('Target cadence updated.', 'लक्ष्य अपडेट हो गया।'));
                }}
                className="min-h-[44px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-sm"
              >
                <option value="daily">{tr('Daily', 'रोज़ाना')}</option>
                <option value="weekly">{tr('Weekly', 'हफ़्तावार')}</option>
                <option value="none">{tr('No target', 'कोई लक्ष्य नहीं')}</option>
              </select>
              {snapshot.profile.targetType !== 'none' && (
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={snapshot.profile.targetCount}
                  onChange={(e) => {
                    const count = Math.max(1, Math.min(500, parseInt(e.target.value, 10) || 1));
                    void updatePreferences({ targetCount: count });
                  }}
                  className="w-24 min-h-[44px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] font-mono-num text-sm"
                />
              )}
            </div>
          </div>
        </div>

        {snapshot.profile.routine === 'one_prayer_at_a_time' && (
          <div>
            <label className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1.5">
              {tr('Focus Prayer Category', 'फ़ोकस नमाज़')}
            </label>
            <select
              value={snapshot.profile.focusPrayer}
              onChange={(e) =>
                void updatePreferences({ focusPrayer: e.target.value as FocusPrayer })
              }
              className="w-full sm:w-64 min-h-[44px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-sm"
            >
              {PRAYERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {prayerLabel(p.id)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A] border-t border-[#E5E2DC] dark:border-[#242E2A]">
          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium">{tr('Start Small Mode', 'आसान शुरुआत मोड')}</p>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                {tr(
                  'Emphasizes gentle goals and encouraging progress without pressure.',
                  'बिना किसी दबाव के हल्के लक्ष्यों और हौसला अफ़ज़ाई पर ध्यान देता है।'
                )}
              </p>
            </div>
            <input
              type="checkbox"
              checked={snapshot.profile.startSmallMode}
              onChange={(e) => void updatePreferences({ startSmallMode: e.target.checked })}
              className="w-5 h-5 accent-[#1B4D3E]"
            />
          </label>

          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium">
                {tr('Daily Prayer Check-In', 'रोज़ाना 5 नमाज़ों का चेक-इन')}
              </p>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                {tr(
                  'Show an optional daily 5-prayer check-in on your Home dashboard.',
                  'होम स्क्रीन पर आज की 5 नमाज़ों का चेक-इन कार्ड दिखाएं।'
                )}
              </p>
            </div>
            <input
              type="checkbox"
              checked={snapshot.profile.dailyCheckInEnabled}
              onChange={(e) => void updatePreferences({ dailyCheckInEnabled: e.target.checked })}
              className="w-5 h-5 accent-[#1B4D3E]"
            />
          </label>

          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium">
                {tr('Automatic Carry-Forward to Qaza Inbox', 'छूटी नमाज़ अपने आप क़ज़ा इनबॉक्स में भेजें')}
              </p>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                {tr(
                  'When a daily check-in prayer is marked Missed, automatically add it to Qaza Inbox.',
                  'चेक-इन में किसी नमाज़ को "छूटी" चुनते ही उसे क़ज़ा इनबॉक्स में जोड़ें।'
                )}
              </p>
            </div>
            <input
              type="checkbox"
              checked={snapshot.profile.autoCarryForward}
              onChange={(e) => void updatePreferences({ autoCarryForward: e.target.checked })}
              className="w-5 h-5 accent-[#1B4D3E]"
            />
          </label>
        </div>
      </section>

      {/* Gentle Reminders */}
      <section className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-[#1B4D3E] dark:text-[#7FD1B2] mt-0.5 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold">
                {tr('Gentle Reminders', 'रोज़ाना हल्का रिमाइंडर')}
              </h2>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                {tr(
                  'Optional daily reminder. Uses browser notifications when permitted, or a calm in-app reminder banner as fallback.',
                  'वैकल्पिक रोज़ाना याद दिलाने वाला अलर्ट।'
                )}
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            aria-label={tr('Enable gentle reminders', 'रिमाइंडर चालू करें')}
            checked={snapshot.profile.remindersEnabled}
            onChange={(e) => void updatePreferences({ remindersEnabled: e.target.checked })}
            className="w-5 h-5 accent-[#1B4D3E]"
          />
        </div>

        {snapshot.profile.remindersEnabled && (
          <div className="space-y-4 pt-2 border-t border-[#E5E2DC] dark:border-[#242E2A]">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1">
                  {tr('Daily Reminder Time', 'रिमाइंडर का समय')}
                </label>
                <input
                  type="time"
                  value={snapshot.profile.reminderTime}
                  onChange={(e) => void updatePreferences({ reminderTime: e.target.value })}
                  className="min-h-[42px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] font-mono-num text-sm"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <p className="text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1">
                  {tr('Browser Notification Permission', 'ब्राउज़र नोटिफ़िकेशन अनुमति')}:{' '}
                  <span className="font-mono-num text-[#1A1D1B] dark:text-[#F1F3F2]">
                    {notifPermission}
                  </span>
                </p>
                {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
                  <button
                    type="button"
                    onClick={() => void handleRequestNotifications()}
                    className="min-h-[38px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] text-xs font-medium hover:bg-[#F8F7F4] dark:hover:bg-[#0E1311]"
                  >
                    {tr('Allow Browser Notifications', 'नोटिफ़िकेशन की अनुमति दें')}
                  </button>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-2">
                {tr('Remind after specific prayers (optional):', 'किन नमाज़ों के बाद याद दिलाएं (वैकल्पिक):')}
              </p>
              <div className="flex flex-wrap gap-2">
                {PRAYERS.map((p) => {
                  const selected = snapshot.profile.reminderAfterPrayers.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        const nextList = selected
                          ? snapshot.profile.reminderAfterPrayers.filter((x) => x !== p.id)
                          : [...snapshot.profile.reminderAfterPrayers, p.id];
                        void updatePreferences({ reminderAfterPrayers: nextList });
                      }}
                      className={`min-h-[38px] px-3.5 rounded-lg border text-xs font-medium transition-colors ${
                        selected
                          ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                          : 'border-[#E5E2DC] dark:border-[#242E2A] text-[#5C635E] dark:text-[#9AA59E]'
                      }`}
                    >
                      {prayerLabel(p.id)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Backup, Export & Restore */}
      <section className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            {tr('Backup, Export & Restore', 'बैकअप, एक्सपोर्ट और रिस्टोर')}
          </h2>
          <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
            {tr(
              'Your Qaza tracking history always belongs to you. Export to CSV, PDF, or restore from a JSON backup anytime.',
              'आप अपना रिकॉर्ड कभी भी CSV, PDF या JSON बैकअप फ़ाइल के रूप में सेव या रिस्टोर कर सकते हैं।'
            )}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => {
              exportToCsv(snapshot);
              notifySaved(tr('CSV exported.', 'CSV डाउनलोड हो गई।'));
            }}
            className="min-h-[44px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] text-xs font-medium flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2]" />
            <span>{tr('Export CSV', 'CSV डाउनलोड')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              exportToPdf(snapshot);
              notifySaved(tr('PDF report downloaded.', 'PDF रिपोर्ट डाउनलोड हो गई।'));
            }}
            className="min-h-[44px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] text-xs font-medium flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2]" />
            <span>{tr('Export PDF', 'PDF रिपोर्ट')}</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              await markManualBackup();
              exportToJsonBackup(snapshot);
              notifySaved(tr('JSON backup downloaded.', 'बैकअप फ़ाइल डाउनलोड हो गई।'));
            }}
            className="min-h-[44px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] text-xs font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2]" />
            <span>{tr('Download Backup', 'बैकअप डाउनलोड')}</span>
          </button>

          <label className="min-h-[44px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] text-xs font-medium flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2]" />
            <span>{tr('Restore JSON', 'JSON रिस्टोर')}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={(e) => void handleFileRestore(e)}
              className="hidden"
            />
          </label>
        </div>
      </section>

      {/* Appearance & Privacy */}
      <section className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{tr('Appearance', 'थीम / रंग')}</h2>
            <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
              {tr('Choose light, dark, or match your device setting.', 'लाइट, डार्क या फ़ोन के हिसाब से थीम चुनें।')}
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A]">
            {(
              [
                { id: 'light', label: tr('Light', 'लाइट'), Icon: Sun },
                { id: 'dark', label: tr('Dark', 'डार्क'), Icon: Moon },
                { id: 'system', label: tr('System', 'सिस्टम'), Icon: Shield },
              ] as { id: ThemePreference; label: string; Icon: React.ElementType }[]
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => void updatePreferences({ theme: id })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                  snapshot.profile.theme === id
                    ? 'bg-white dark:bg-[#151C19] text-[#1A1D1B] dark:text-[#F1F3F2] shadow-sm'
                    : 'text-[#5C635E] dark:text-[#9AA59E]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-[#E5E2DC] dark:border-[#242E2A] text-xs text-[#5C635E] dark:text-[#9AA59E] space-y-1.5 leading-relaxed">
          <p className="font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">
            {tr('Privacy & Religious Guidance Note', 'निजता और धार्मिक मार्गदर्शन नोट')}
          </p>
          <p>
            {tr(
              'Your prayer records are private and strictly scoped to your own account. QazaFlow is an organizational tracking tool—not a religious authority. Please consult a qualified scholar for religious questions.',
              'आपका पूरा रिकॉर्ड निजी और सुरक्षित है। यह ऐप सिर्फ़ व्यक्तिगत हिसाब रखने का साधन है—शरिया मसाइल के लिए किसी आलिम से मशवरा लें।'
            )}
          </p>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-white dark:bg-[#151C19] border border-red-200 dark:border-red-900/50 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-red-700 dark:text-red-400">
            {tr('Reset Tracking Data', 'सारा डेटा रीसेट करें')}
          </h2>
          <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
            {tr(
              'Clears all balances, Qaza Inbox items, Deen logs, and activity history. Download a backup first.',
              'सारा हिसाब, इनबॉक्स और इतिहास मिट जाता है। पहले बैकअप डाउनलोड कर लें।'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowResetModal(true)}
          className="min-h-[42px] px-4 rounded-xl border border-red-300 dark:border-red-800 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          {tr('Reset All Data', 'डेटा रीसेट करें')}
        </button>
      </section>

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] p-6 space-y-4">
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">
              {tr('Confirm Data Reset', 'डेटा रीसेट की पुष्टि करें')}
            </h3>
            <p className="text-sm text-[#5C635E] dark:text-[#9AA59E]">
              {tr(
                'This will permanently erase your balances, inbox queue, Deen logs, and activity logs. Type RESET below to confirm.',
                'इससे आपका पूरा रिकॉर्ड हमेशा के लिए हट जाएगा। पुष्टि करने के लिए नीचे RESET लिखें।'
              )}
            </p>
            <input
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="RESET"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] font-mono-num text-sm"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmText('');
                }}
                className="min-h-[42px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] text-sm font-medium"
              >
                {tr('Cancel', 'रद्द करें')}
              </button>
              <button
                type="button"
                disabled={resetConfirmText.trim().toUpperCase() !== 'RESET'}
                onClick={() => void handleConfirmReset()}
                className="min-h-[42px] px-4 rounded-xl bg-red-600 text-white text-sm font-medium disabled:opacity-40"
              >
                {tr('Permanently Reset', 'हमेशा के लिए रीसेट करें')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
