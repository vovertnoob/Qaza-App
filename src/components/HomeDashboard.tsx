import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calculator,
  Check,
  History,
  Inbox,
  Layers,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useQaza } from '../context/QazaContext';
import { getLocalDateKey } from '../lib/offlineStorage';
import { PRAYERS, PRAYER_LABELS, type PrayerType } from '../types/qaza';

export type NavTab = 'home' | 'tracker' | 'activity' | 'settings';

interface HomeDashboardProps {
  onNavigate: (tab: NavTab) => void;
  onOpenCalculator?: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onNavigate,
  onOpenCalculator,
}) => {
  const {
    snapshot,
    markOneCompleted,
    addMissedToInbox,
    completeInboxEntry,
    removeInboxEntry,
    updateDailyCheckIn,
    updatePreferences,
  } = useQaza();

  const [inboxNote, setInboxNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const totals = useMemo(() => {
    let pending = 0;
    let completed = 0;
    let initial = 0;
    let inboxPending = 0;
    for (const p of PRAYERS) {
      const b = snapshot.balances[p.id];
      pending += b.pendingBalance;
      completed += b.completedBalance;
      initial += b.initialBalance;
      inboxPending += b.inboxPendingCount;
    }
    const denominator = pending + completed;
    const pct = denominator > 0 ? Math.round((completed / denominator) * 100) : 0;
    return { pending, completed, initial, inboxPending, pct };
  }, [snapshot.balances]);

  const todayKey = getLocalDateKey();

  const todayCompletedCount = useMemo(() => {
    let count = 0;
    for (const log of snapshot.activityLogs) {
      if (log.undoneByLogId) continue;
      if (
        (log.actionType === 'completed' ||
          log.actionType === 'batch_completed' ||
          log.actionType === 'inbox_completed') &&
        log.clientTimestamp.slice(0, 10) === todayKey
      ) {
        count += log.quantity;
      }
    }
    return count;
  }, [snapshot.activityLogs, todayKey]);

  const weekCompletedCount = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    let count = 0;
    for (const log of snapshot.activityLogs) {
      if (log.undoneByLogId) continue;
      if (
        (log.actionType === 'completed' ||
          log.actionType === 'batch_completed' ||
          log.actionType === 'inbox_completed') &&
        new Date(log.clientTimestamp).getTime() >= cutoff
      ) {
        count += log.quantity;
      }
    }
    return count;
  }, [snapshot.activityLogs]);

  const lastActivity = useMemo(() => {
    const latest = snapshot.activityLogs.find((l) => !l.undoneByLogId);
    if (!latest) return null;
    const d = new Date(latest.clientTimestamp);
    const isToday = getLocalDateKey(d) === todayKey;
    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const dayStr = isToday ? 'today' : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const verb =
      latest.actionType === 'missed_added'
        ? 'added to Inbox'
        : latest.actionType === 'balance_adjusted'
          ? 'adjusted'
          : latest.actionType === 'undone'
            ? 'undone'
            : 'completed';
    return {
      text: `${PRAYER_LABELS[latest.prayerType]} ${verb} ${dayStr} at ${timeStr}`,
      prayer: latest.prayerType,
    };
  }, [snapshot.activityLogs, todayKey]);

  const highestBalancePrayer = useMemo(() => {
    let best = PRAYERS[0];
    let max = -1;
    for (const p of PRAYERS) {
      if (snapshot.balances[p.id].pendingBalance > max) {
        max = snapshot.balances[p.id].pendingBalance;
        best = p;
      }
    }
    return { prayer: best, count: max };
  }, [snapshot.balances]);

  const pendingInboxEntries = useMemo(
    () => snapshot.qazaEntries.filter((e) => e.status === 'pending'),
    [snapshot.qazaEntries]
  );

  const encouragingText = useMemo(() => {
    if (totals.completed >= 50 && weekCompletedCount >= 5) {
      return `You've completed ${totals.completed.toLocaleString()} Qaza prayers in total.`;
    }
    if (weekCompletedCount > 0) {
      return `You've completed ${weekCompletedCount} ${weekCompletedCount === 1 ? 'prayer' : 'prayers'} this week. Your pending count is decreasing.`;
    }
    if (totals.pending > 0) {
      return 'Every single prayer logged brings clarity and calm forward motion.';
    }
    return 'Your ledger is ready whenever you want to log a prayer or add a missed prayer.';
  }, [totals.completed, totals.pending, weekCompletedCount]);

  const todayCheckIn = snapshot.dailyCheckIns[todayKey];

  const handleQuickAddInbox = async (prayer: PrayerType) => {
    const note = inboxNote.trim() || undefined;
    setInboxNote('');
    setShowNoteInput(false);
    await addMissedToInbox(prayer, 'manual_inbox', note);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Overview Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Primary Overall Balance Card (Focal Anchor) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 flex flex-col justify-between gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#5C635E] dark:text-[#9AA59E]">
                Overall Qaza Balance
              </p>
              <div className="mt-1.5 flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-semibold tracking-tight font-mono-num text-[#1A1D1B] dark:text-[#F1F3F2]">
                  {totals.pending.toLocaleString()}
                </span>
                <span className="text-sm text-[#5C635E] dark:text-[#9AA59E]">pending</span>
              </div>
              <p className="mt-2 text-xs text-[#5C635E] dark:text-[#9AA59E]">{encouragingText}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-semibold font-mono-num text-[#1B4D3E] dark:text-[#7FD1B2]">
                {totals.pct}%
              </span>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">completed</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-2.5 w-full rounded-full bg-[#F1EFE9] dark:bg-[#242E2A] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1B4D3E] dark:bg-[#2E7D5B] transition-all duration-300"
                style={{ width: `${Math.min(100, totals.pct)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-[#E5E2DC] dark:border-[#242E2A]">
              <div>
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">Starting Balance</p>
                <p className="mt-0.5 text-base font-semibold font-mono-num">
                  {totals.initial.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">Completed</p>
                <p className="mt-0.5 text-base font-semibold font-mono-num text-[#2E7D5B] dark:text-[#7FD1B2]">
                  {totals.completed.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">Largest Balance</p>
                <p className="mt-0.5 text-base font-semibold">
                  {highestBalancePrayer.count > 0
                    ? `${highestBalancePrayer.prayer.label} (${highestBalancePrayer.count.toLocaleString()})`
                    : 'Balanced'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Progress + Last Activity + Quick Actions */}
        <div className="lg:col-span-5 bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-[#5C635E] dark:text-[#9AA59E]">
                  Today&apos;s Progress
                </p>
                <p className="mt-1 text-xl font-semibold font-mono-num">
                  {snapshot.profile.targetType === 'daily' && snapshot.profile.targetCount > 0
                    ? `${todayCompletedCount} of ${snapshot.profile.targetCount} completed today`
                    : `${todayCompletedCount} completed today`}
                </p>
                {snapshot.profile.targetType === 'weekly' && snapshot.profile.targetCount > 0 && (
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-0.5 font-mono-num">
                    {weekCompletedCount} of {snapshot.profile.targetCount} this week
                  </p>
                )}
              </div>
              {snapshot.profile.startSmallMode && (
                <span className="text-xs text-[#B88E44] dark:text-[#D4AA5E] font-medium whitespace-nowrap">
                  Start Small
                </span>
              )}
            </div>

            <div className="pt-3 border-t border-[#E5E2DC] dark:border-[#242E2A] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">Last activity</p>
                <p className="text-sm font-medium truncate mt-0.5">
                  {lastActivity ? lastActivity.text : 'No activity logged yet'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('tracker')}
                className="min-h-[40px] px-3.5 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs font-medium hover:bg-[#143B2F] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>Continue Tracking</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E2DC] dark:border-[#242E2A]">
            <p className="text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-2.5">
              Quick Actions
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onNavigate('tracker')}
                className="min-h-[44px] px-2.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Layers className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2] shrink-0" />
                <span className="truncate">Batch Log</span>
              </button>
              <button
                type="button"
                onClick={() => (onOpenCalculator ? onOpenCalculator() : onNavigate('tracker'))}
                className="min-h-[44px] px-2.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Calculator className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2] shrink-0" />
                <span className="truncate">Calculator</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('activity')}
                className="min-h-[44px] px-2.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <History className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2] shrink-0" />
                <span className="truncate">Activity</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Individual Prayer Counters */}
      <section className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E2DC] dark:border-[#242E2A] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Prayer Balances</h2>
            <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
              Tap once to mark a completed Qaza prayer. Saves immediately with Undo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('tracker')}
            className="text-xs font-medium text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline whitespace-nowrap"
          >
            View progress breakdown
          </button>
        </div>

        <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A]">
          {PRAYERS.map((p) => {
            const b = snapshot.balances[p.id];
            const isFocus =
              snapshot.profile.routine === 'one_prayer_at_a_time' &&
              snapshot.profile.focusPrayer === p.id;
            return (
              <div
                key={p.id}
                className="px-4 sm:px-6 py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:bg-[#F8F7F4]/70 dark:hover:bg-[#0E1311]/50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-[140px]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-medium">{p.label}</span>
                      {isFocus && (
                        <span className="text-xs text-[#B88E44] dark:text-[#D4AA5E] font-medium">
                          · Focus
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#7A827D]">
                      {p.timeHint}
                      {b.inboxPendingCount > 0 ? ` · ${b.inboxPendingCount} in inbox` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 sm:gap-8 ml-auto">
                  <div className="text-right">
                    <p className="text-[11px] text-[#7A827D]">Pending</p>
                    <p className="text-base font-semibold font-mono-num">
                      {b.pendingBalance.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-[#7A827D]">Completed</p>
                    <p className="text-base font-semibold font-mono-num text-[#2E7D5B] dark:text-[#7FD1B2]">
                      {b.completedBalance.toLocaleString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={b.pendingBalance <= 0}
                    onClick={() => void markOneCompleted(p.id)}
                    className="min-h-[44px] px-4 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs sm:text-sm font-medium hover:bg-[#143B2F] dark:hover:bg-[#225B49] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Mark 1 Completed</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Prominent Qaza Inbox + Optional Daily Check-In */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Qaza Inbox */}
        <div
          className={`${
            snapshot.profile.dailyCheckInEnabled ? 'lg:col-span-7' : 'lg:col-span-12'
          } bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-5`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] flex items-center justify-center shrink-0">
                <Inbox className="w-5 h-5 text-[#1B4D3E] dark:text-[#7FD1B2]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Qaza Inbox</h2>
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                  Add a newly missed prayer in one tap. Kept distinct from your historical starting
                  balance.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowNoteInput((v) => !v)}
              className="text-xs text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline whitespace-nowrap"
            >
              {showNoteInput ? 'Hide note' : '+ Optional note'}
            </button>
          </div>

          {showNoteInput && (
            <input
              type="text"
              value={inboxNote}
              maxLength={200}
              onChange={(e) => setInboxNote(e.target.value)}
              placeholder="Optional note (e.g., travelling, missed due to meeting)"
              className="w-full min-h-[42px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
            />
          )}

          {/* 5 Quick Add Buttons */}
          <div>
            <p className="text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-2">
              Tap to add newly missed prayer:
            </p>
            <div className="grid grid-cols-5 gap-2">
              {PRAYERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void handleQuickAddInbox(p.id)}
                  className="min-h-[44px] px-2 py-2 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:border-[#1B4D3E] dark:hover:border-[#7FD1B2] hover:bg-[#1B4D3E]/5 text-xs sm:text-sm font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 text-[#1B4D3E] dark:text-[#7FD1B2] shrink-0" />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pending Queue */}
          <div className="pt-2 border-t border-[#E5E2DC] dark:border-[#242E2A]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#5C635E] dark:text-[#9AA59E]">
                Pending Queue ({pendingInboxEntries.length})
              </span>
              {snapshot.qazaEntries.length > pendingInboxEntries.length && (
                <button
                  type="button"
                  onClick={() => onNavigate('tracker')}
                  className="text-xs text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline"
                >
                  View completed inbox items
                </button>
              )}
            </div>

            {pendingInboxEntries.length === 0 ? (
              <p className="text-sm text-[#7A827D] py-4 text-center bg-[#F8F7F4] dark:bg-[#0E1311] rounded-xl border border-dashed border-[#E5E2DC] dark:border-[#242E2A]">
                No newly missed prayers in your inbox.
              </p>
            ) : (
              <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A] border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl overflow-hidden">
                {pendingInboxEntries.slice(0, 6).map((entry) => (
                  <div
                    key={entry.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 bg-[#F8F7F4]/50 dark:bg-[#0E1311]/40"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {PRAYER_LABELS[entry.prayerType]}
                        <span className="ml-2 text-xs font-normal text-[#7A827D]">
                          · Added {new Date(entry.dateAdded).toLocaleDateString()} · Pending
                        </span>
                      </p>
                      {entry.note && (
                        <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] truncate mt-0.5">
                          {entry.note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void completeInboxEntry(entry.id)}
                        className="min-h-[40px] px-3 rounded-lg bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs font-medium hover:bg-[#143B2F] transition-colors whitespace-nowrap"
                      >
                        Complete
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeInboxEntry(entry.id)}
                        aria-label={`Remove ${entry.prayerType} inbox entry`}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] text-[#7A827D] hover:text-red-600 hover:border-red-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Optional Daily Check-In Widget */}
        {snapshot.profile.dailyCheckInEnabled ? (
          <div className="lg:col-span-5 bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Today&apos;s Prayer Check-In</h2>
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                  Optional daily check-in. Missed prayers can be carried to your Qaza Inbox.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void updatePreferences({ dailyCheckInEnabled: false })}
                className="text-xs text-[#7A827D] hover:text-[#1A1D1B] dark:hover:text-[#F1F3F2] whitespace-nowrap"
              >
                Hide
              </button>
            </div>

            <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A] border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl overflow-hidden">
              {PRAYERS.map((p) => {
                const status = todayCheckIn?.[p.id] || 'unmarked';
                const carried = todayCheckIn?.carriedForwardPrayers?.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-2 bg-white dark:bg-[#151C19]"
                  >
                    <div>
                      <span className="text-sm font-medium">{p.label}</span>
                      {carried && (
                        <span className="ml-2 text-xs text-[#B88E44] dark:text-[#D4AA5E]">
                          · Added to Inbox
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void updateDailyCheckIn(p.id, 'prayed', false)}
                        className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium border transition-colors ${
                          status === 'prayed'
                            ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                            : 'border-[#E5E2DC] dark:border-[#242E2A] text-[#5C635E] dark:text-[#9AA59E]'
                        }`}
                      >
                        Prayed
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void updateDailyCheckIn(
                            p.id,
                            'missed',
                            snapshot.profile.autoCarryForward
                          )
                        }
                        className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium border transition-colors ${
                          status === 'missed'
                            ? 'bg-[#B88E44] text-white border-[#B88E44]'
                            : 'border-[#E5E2DC] dark:border-[#242E2A] text-[#5C635E] dark:text-[#9AA59E]'
                        }`}
                      >
                        Missed
                      </button>
                      {status === 'missed' && !carried && (
                        <button
                          type="button"
                          onClick={() => void updateDailyCheckIn(p.id, 'missed', true)}
                          className="min-h-[36px] px-2.5 rounded-lg bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] text-xs font-medium text-[#1B4D3E] dark:text-[#7FD1B2] whitespace-nowrap"
                        >
                          + Inbox
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-12 bg-[#F1EFE9]/60 dark:bg-[#151C19]/60 border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-[#5C635E] dark:text-[#9AA59E]">
              <Sparkles className="w-4 h-4 text-[#B88E44] shrink-0" />
              <span>
                Want an optional daily check-in to carry forward any missed prayer to your Qaza
                Inbox?
              </span>
            </div>
            <button
              type="button"
              onClick={() => void updatePreferences({ dailyCheckInEnabled: true })}
              className="min-h-[40px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-xs font-medium hover:bg-[#F8F7F4] dark:hover:bg-[#1D2622] whitespace-nowrap"
            >
              Enable Daily Check-In
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
