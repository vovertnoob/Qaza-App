import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Cloud,
  Download,
  FileText,
  LogOut,
  Moon,
  RefreshCw,
  Shield,
  Sun,
  Upload,
} from 'lucide-react';
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
    notifySaved('Prayer balances updated.');
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
      notifySaved('Browser notifications enabled for daily reminders.');
    }
  };

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = validateBackupJson(text);
      await restoreFromBackup(parsed);
      notifySaved('Backup restored successfully.');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to read backup file.');
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

      {/* Account & Sync */}
      <section className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Cloud className="w-5 h-5 text-[#1B4D3E] dark:text-[#7FD1B2] mt-0.5 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold">Account & Cloud Sync</h2>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-0.5">
                {user
                  ? `Signed in as ${user.email || user.displayName || 'User'} · Sync status: ${syncState}`
                  : 'Currently using Local Guest storage. Sign in to enable automatic cloud backup across devices.'}
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
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="min-h-[42px] px-5 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs font-medium hover:bg-[#143B2F]"
            >
              Sign In / Create Account
            </button>
          )}
        </div>

        {user && !user.emailVerified && user.email && (
          <div className="p-3.5 rounded-xl border border-[#B88E44]/40 bg-[#B88E44]/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span>Please verify your email address ({user.email}) for full account recovery.</span>
            <button
              type="button"
              onClick={async () => {
                await resendVerificationEmail();
                notifySaved('Verification email sent.');
              }}
              className="font-medium text-[#1B4D3E] dark:text-[#7FD1B2] underline"
            >
              Resend verification email
            </button>
          </div>
        )}

        {hasGuestImportAvailable && (
          <div className="p-3.5 rounded-xl border border-[#1B4D3E]/30 bg-[#1B4D3E]/8 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span>We found local guest tracking progress on this device. Merge it into your cloud account?</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await importGuestToCloud();
                  notifySaved('Local progress merged into your cloud account.');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#1B4D3E] text-white font-medium"
              >
                Merge Progress
              </button>
              <button
                type="button"
                onClick={dismissGuestImport}
                className="px-3 py-1.5 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A]"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-[#E5E2DC] dark:border-[#242E2A] grid sm:grid-cols-2 gap-3 text-xs text-[#5C635E] dark:text-[#9AA59E]">
          <div>
            <span>Last sync: </span>
            <span className="font-mono-num text-[#1A1D1B] dark:text-[#F1F3F2]">
              {snapshot.syncMetadata.lastSyncAt
                ? new Date(snapshot.syncMetadata.lastSyncAt).toLocaleString()
                : 'Local only'}
            </span>
          </div>
          <div>
            <span>Last backup: </span>
            <span className="font-mono-num text-[#1A1D1B] dark:text-[#F1F3F2]">
              {snapshot.syncMetadata.lastBackupAt
                ? new Date(snapshot.syncMetadata.lastBackupAt).toLocaleString()
                : 'Not yet backed up'}
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
          <h2 className="text-lg font-semibold">Edit Qaza Balances</h2>
          <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
            Adjust your initial estimate, pending balance, or completed total anytime.
          </p>
        </div>

        <form onSubmit={(e) => void handleSaveBalances(e)} className="space-y-4">
          <div className="overflow-x-auto border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F7F4] dark:bg-[#0E1311] text-xs text-[#5C635E] dark:text-[#9AA59E]">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Prayer</th>
                  <th className="text-right px-4 py-2.5 font-medium">Initial</th>
                  <th className="text-right px-4 py-2.5 font-medium">Pending</th>
                  <th className="text-right px-4 py-2.5 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A]">
                {PRAYERS.map((p) => {
                  const row = editableBalances[p.id];
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-2.5 font-medium">{p.label}</td>
                      {(['initialBalance', 'pendingBalance', 'completedBalance'] as const).map(
                        (field) => (
                          <td key={field} className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              max={1000000}
                              aria-label={`${p.label} ${field}`}
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
            Save Balance Changes
          </button>
        </form>
      </section>

      {/* Routine & Targets */}
      <section className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Routine & Targets</h2>
          <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
            Personal organizational settings. Changing these never alters your logged history.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1.5">
              Tracking Routine
            </label>
            <select
              value={snapshot.profile.routine}
              onChange={(e) => {
                void updatePreferences({ routine: e.target.value as RoutineType });
                notifySaved('Routine updated.');
              }}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-sm"
            >
              {ROUTINE_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1.5">
              Target Cadence & Count
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
                  notifySaved('Target cadence updated.');
                }}
                className="min-h-[44px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="none">No target</option>
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
              Focus Prayer Category
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
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A] border-t border-[#E5E2DC] dark:border-[#242E2A]">
          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium">Start Small Mode</p>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                Emphasizes gentle goals and encouraging progress without pressure.
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
              <p className="text-sm font-medium">Daily Prayer Check-In</p>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                Show an optional daily 5-prayer check-in on your Home dashboard.
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
              <p className="text-sm font-medium">Automatic Carry-Forward to Qaza Inbox</p>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                When a daily check-in prayer is marked Missed, automatically add it to Qaza Inbox.
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
              <h2 className="text-lg font-semibold">Gentle Reminders</h2>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                Optional daily reminder. Uses browser notifications when permitted, or a calm
                in-app reminder banner as fallback.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            aria-label="Enable gentle reminders"
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
                  Daily Reminder Time
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
                  Browser Notification Permission:{' '}
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
                    Allow Browser Notifications
                  </button>
                )}
                {(notifPermission === 'denied' || notifPermission === 'unsupported') && (
                  <p className="text-xs text-[#7A827D]">
                    Browser notifications are unavailable or blocked here. QazaFlow will display a
                    gentle in-app reminder instead.
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-2">
                Remind after specific prayers (optional):
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
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Export, Backup & Restore */}
      <section className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Backup, Export & Restore</h2>
          <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
            Your Qaza tracking history always belongs to you. Export to CSV, PDF, or restore from
            a JSON backup anytime.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => {
              exportToCsv(snapshot);
              notifySaved('CSV exported.');
            }}
            className="min-h-[44px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] text-xs font-medium flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              exportToPdf(snapshot);
              notifySaved('PDF report downloaded.');
            }}
            className="min-h-[44px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] text-xs font-medium flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2]" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              await markManualBackup();
              exportToJsonBackup(snapshot);
              notifySaved('JSON backup downloaded.');
            }}
            className="min-h-[44px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] text-xs font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2]" />
            <span>Download Backup</span>
          </button>

          <label className="min-h-[44px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] text-xs font-medium flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2]" />
            <span>Restore JSON</span>
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
            <h2 className="text-lg font-semibold">Appearance</h2>
            <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
              Choose light, dark, or match your device setting.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A]">
            {(
              [
                { id: 'light', label: 'Light', Icon: Sun },
                { id: 'dark', label: 'Dark', Icon: Moon },
                { id: 'system', label: 'System', Icon: Shield },
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
            Privacy & Religious Guidance Note
          </p>
          <p>
            Your prayer records are private and strictly scoped to your own account. QazaFlow is an
            organizational tracking tool—not a religious authority. Different schools of thought
            may provide specific guidance regarding Witr, prayer calculation, or completion order.
            Please consult a qualified scholar for religious questions.
          </p>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-white dark:bg-[#151C19] border border-red-200 dark:border-red-900/50 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-red-700 dark:text-red-400">
            Reset Tracking Data
          </h2>
          <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
            Clears all balances, Qaza Inbox items, and activity history. Download a backup first.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowResetModal(true)}
          className="min-h-[42px] px-4 rounded-xl border border-red-300 dark:border-red-800 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          Reset All Data
        </button>
      </section>

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] p-6 space-y-4">
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">
              Confirm Data Reset
            </h3>
            <p className="text-sm text-[#5C635E] dark:text-[#9AA59E]">
              This will permanently erase your balances, inbox queue, and activity logs. Type{' '}
              <strong className="font-mono-num text-[#1A1D1B] dark:text-[#F1F3F2]">RESET</strong>{' '}
              below to confirm.
            </p>
            <input
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="Type RESET"
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
                Cancel
              </button>
              <button
                type="button"
                disabled={resetConfirmText.trim().toUpperCase() !== 'RESET'}
                onClick={() => void handleConfirmReset()}
                className="min-h-[42px] px-4 rounded-xl bg-red-600 text-white text-sm font-medium disabled:opacity-40"
              >
                Permanently Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
