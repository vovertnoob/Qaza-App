import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Check,
  Clock,
  Flame,
  History,
  Inbox,
  Layers,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useQaza } from '../context/QazaContext';
import { getLocalDateKey } from '../lib/offlineStorage';
import { calculatePrayerWindows, formatRemainingDuration } from '../lib/prayerTimes';
import { PRAYERS, type PrayerType } from '../types/qaza';
import { PrayerTimesCard } from './PrayerTimesCard';
import { PWAInstallButton } from './PWAInstallButton';

export type NavTab = 'home' | 'tracker' | 'deen' | 'activity' | 'settings';

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
    prayerSettings,
    prayerNow,
    markOneCompleted,
    batchComplete,
    addMissedToInbox,
    completeInboxEntry,
    removeInboxEntry,
    updateDailyCheckIn,
    updatePreferences,
  } = useQaza();
  const { lang, tr, prayerLabel, prayerHint } = useLanguage();

  const [inboxNote, setInboxNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  // Ephemeral completion animation triggers (prayer id + timestamp token)
  const [dailyAnim, setDailyAnim] = useState<{ prayer: PrayerType; token: number } | null>(null);
  const [qazaAnim, setQazaAnim] = useState<{ prayer: PrayerType | 'all'; token: number } | null>(null);
  const animTimerDailyRef = useRef<number | null>(null);
  const animTimerQazaRef = useRef<number | null>(null);

  const triggerDailyCelebration = (prayer: PrayerType) => {
    if (animTimerDailyRef.current) window.clearTimeout(animTimerDailyRef.current);
    setDailyAnim({ prayer, token: Date.now() });
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(15);
    }
    animTimerDailyRef.current = window.setTimeout(() => setDailyAnim(null), 950);
  };

  const triggerQazaCelebration = (prayer: PrayerType | 'all') => {
    if (animTimerQazaRef.current) window.clearTimeout(animTimerQazaRef.current);
    setQazaAnim({ prayer, token: Date.now() });
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([14, 30, 18]);
    }
    animTimerQazaRef.current = window.setTimeout(() => setQazaAnim(null), 950);
  };

  const prayerSchedule = useMemo(
    () =>
      prayerSettings.locationConfigured
        ? calculatePrayerWindows(prayerSettings, prayerNow)
        : null,
    [prayerSettings, prayerNow]
  );

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

  const todayKey = getLocalDateKey(prayerNow);

  const deenTodaySummary = useMemo(() => {
    const activeDaily = snapshot.deenTasks.filter((t) => t.isActive && t.frequency === 'daily');
    const counts = snapshot.deenLogs[todayKey]?.counts || {};
    const done = activeDaily.filter((t) => (counts[t.id] || 0) >= t.targetCount).length;
    return { done, total: activeDaily.length };
  }, [snapshot.deenTasks, snapshot.deenLogs, todayKey]);

  // Accurate local-date breakdown of today's completed Qaza prayers
  const { todayCompletedCount, todayQazaByPrayer } = useMemo(() => {
    let total = 0;
    const byPrayer: Record<PrayerType, number> = {
      fajr: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
    };

    for (const log of snapshot.activityLogs) {
      if (log.undoneByLogId) continue;
      if (
        log.actionType !== 'completed' &&
        log.actionType !== 'batch_completed' &&
        log.actionType !== 'inbox_completed'
      ) {
        continue;
      }
      if (getLocalDateKey(new Date(log.clientTimestamp)) !== todayKey) continue;

      total += log.quantity;
      if (log.prayerType !== 'all') {
        byPrayer[log.prayerType] += log.quantity;
      } else if (log.note) {
        let matched = false;
        for (const p of PRAYERS) {
          const regex = new RegExp(`(\\d+)\\s+${p.label}`, 'i');
          const m = log.note.match(regex);
          if (m) {
            matched = true;
            byPrayer[p.id] += parseInt(m[1], 10) || 0;
          }
        }
        if (!matched && log.quantity === 5) {
          for (const p of PRAYERS) byPrayer[p.id] += 1;
        }
      }
    }

    return { todayCompletedCount: total, todayQazaByPrayer: byPrayer };
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
    const timeStr = d.toLocaleTimeString(lang === 'hi' ? 'hi-IN' : [], {
      hour: 'numeric',
      minute: '2-digit',
    });
    const dayStr = isToday
      ? tr('today', 'आज')
      : d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : [], { month: 'short', day: 'numeric' });
    const verb =
      latest.actionType === 'missed_added'
        ? tr('added to Qaza Inbox', 'क़ज़ा इनबॉक्स में जुड़ी')
        : latest.actionType === 'balance_adjusted'
          ? tr('adjusted', 'अपडेट हुई')
          : latest.actionType === 'undone'
            ? tr('undone', 'वापस ली गई')
            : tr('completed', 'पूरी हुई');
    return {
      text:
        lang === 'hi'
          ? `${prayerLabel(latest.prayerType)} · ${verb} (${dayStr}, ${timeStr})`
          : `${prayerLabel(latest.prayerType)} ${verb} ${dayStr} at ${timeStr}`,
      prayer: latest.prayerType,
    };
  }, [snapshot.activityLogs, todayKey, lang, tr, prayerLabel]);

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

  // Today's 5 Daily Namaz status summary
  const todayCheckIn = snapshot.dailyCheckIns[todayKey];
  const dailySummary = useMemo(() => {
    const prayedList: PrayerType[] = [];
    const missedList: PrayerType[] = [];
    const unmarkedList: PrayerType[] = [];
    for (const p of PRAYERS) {
      const st = todayCheckIn?.[p.id] || 'unmarked';
      if (st === 'prayed') prayedList.push(p.id);
      else if (st === 'missed') missedList.push(p.id);
      else unmarkedList.push(p.id);
    }
    return {
      prayedCount: prayedList.length,
      leftCount: unmarkedList.length,
      missedCount: missedList.length,
      prayedList,
      unmarkedList,
      missedList,
    };
  }, [todayCheckIn]);

  // Today's Qaza Goal mode calculations
  const qazaDayPlan = useMemo(() => {
    const isFullDayMode =
      snapshot.profile.routine === 'full_qaza_day' ||
      (snapshot.profile.targetType === 'daily' && snapshot.profile.targetCount === 5);

    const dailyTarget =
      snapshot.profile.targetType === 'daily'
        ? Math.max(0, snapshot.profile.targetCount)
        : snapshot.profile.routine === 'full_qaza_day'
          ? 5
          : 0;

    // For 5-prayer / Full Qaza Day mode, check which of the 5 prayers are done vs left today
    const donePrayersToday = PRAYERS.filter((p) => todayQazaByPrayer[p.id] > 0).map((p) => p.id);
    const leftPrayersToday = PRAYERS.filter((p) => todayQazaByPrayer[p.id] === 0).map((p) => p.id);

    const remainingForFullDay = leftPrayersToday.length;
    const remainingForCountTarget =
      dailyTarget > 0 ? Math.max(0, dailyTarget - todayCompletedCount) : 0;

    return {
      isFullDayMode,
      dailyTarget,
      donePrayersToday,
      leftPrayersToday,
      remainingCount: isFullDayMode ? remainingForFullDay : remainingForCountTarget,
      totalTarget: isFullDayMode ? 5 : dailyTarget,
      doneForTarget: isFullDayMode
        ? donePrayersToday.length
        : Math.min(dailyTarget || todayCompletedCount, todayCompletedCount),
    };
  }, [
    snapshot.profile.routine,
    snapshot.profile.targetType,
    snapshot.profile.targetCount,
    todayQazaByPrayer,
    todayCompletedCount,
  ]);

  const encouragingText = useMemo(() => {
    if (totals.completed >= 50 && weekCompletedCount >= 5) {
      return tr(
        `You've completed ${totals.completed.toLocaleString()} Qaza prayers in total.`,
        `आपने अब तक कुल ${totals.completed.toLocaleString()} क़ज़ा नमाज़ें अदा की हैं।`
      );
    }
    if (weekCompletedCount > 0) {
      return tr(
        `You've completed ${weekCompletedCount} ${weekCompletedCount === 1 ? 'prayer' : 'prayers'} this week. Your pending count is decreasing.`,
        `इस हफ़्ते आपने ${weekCompletedCount} क़ज़ा नमाज़ें पूरी कीं। आपका बक़ाया धीरे-धीरे कम हो रहा है।`
      );
    }
    if (totals.pending > 0) {
      return tr(
        'Every single prayer logged brings clarity and calm forward motion.',
        'हर एक अदा की हुई नमाज़ आपको आगे बढ़ने का सुकून देती है।'
      );
    }
    return tr(
      'Your ledger is ready whenever you want to log a prayer or add a missed prayer.',
      'जब भी आप कोई क़ज़ा अदा करें या छूटी हुई नमाज़ जोड़ें, यहाँ आसानी से दर्ज करें।'
    );
  }, [totals.completed, totals.pending, weekCompletedCount, tr]);

  const handleQuickAddInbox = async (prayer: PrayerType) => {
    const note = inboxNote.trim() || undefined;
    setInboxNote('');
    setShowNoteInput(false);
    await addMissedToInbox(prayer, 'manual_inbox', note);
  };

  const handleToggleDailyPrayed = async (prayer: PrayerType) => {
    const current = todayCheckIn?.[prayer] || 'unmarked';
    if (current === 'prayed') {
      await updateDailyCheckIn(prayer, 'unmarked', false);
    } else {
      triggerDailyCelebration(prayer);
      await updateDailyCheckIn(prayer, 'prayed', false);
    }
  };

  const handleCompleteOneQaza = async (prayer: PrayerType) => {
    if (snapshot.balances[prayer].pendingBalance <= 0) return;
    triggerQazaCelebration(prayer);
    await markOneCompleted(prayer);
  };

  const handleCompleteRemainingFullDay = async () => {
    const counts: Record<PrayerType, number> = {
      fajr: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
    };
    let any = false;
    for (const pId of qazaDayPlan.leftPrayersToday) {
      if (snapshot.balances[pId].pendingBalance > 0) {
        counts[pId] = 1;
        any = true;
      }
    }
    if (!any) return;
    triggerQazaCelebration('all');
    await batchComplete(counts, qazaDayPlan.leftPrayersToday.length === 5);
  };

  const activeWindowRemaining = prayerSchedule?.activeWindow
    ? formatRemainingDuration(prayerSchedule.activeWindow.end.getTime(), prayerNow.getTime())
    : null;

  return (
    <div className="space-y-6 pb-8">
      <PWAInstallButton variant="banner" />

      {/* HERO PRIORITY: TODAY'S DUAL TRACKERS (1. Daily 5 Namaz | 2. Today's Qaza Goal) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* TRACKER 1: Today's Daily 5 Namaz */}
        <div className="lg:col-span-6 flex flex-col">
          {snapshot.profile.dailyCheckInEnabled ? (
            <div className="flex-1 bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                {/* Header & Remaining Count */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">
                      {tr("Today's Daily Namaz", 'आज की 5 फ़र्ज़ नमाज़ें')}
                    </h2>
                    <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-0.5">
                      {tr(
                        "Tap Done as you pray each of today's 5 prayers.",
                        'जैसे ही आज की नमाज़ अदा करें, Done पर टैप करें।'
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {dailySummary.leftCount === 0 && dailySummary.missedCount === 0 ? (
                      <span className="text-sm font-semibold font-mono-num text-[#2E7D5B] dark:text-[#7FD1B2]">
                        {tr('5/5 Done', '5/5 मुकम्मल')}
                      </span>
                    ) : (
                      <span className="text-lg font-semibold font-mono-num text-[#B88E44] dark:text-[#D4AA5E]">
                        {dailySummary.leftCount}/5 {tr('left', 'बाक़ी')}
                      </span>
                    )}
                    <p className="text-[11px] text-[#7A827D] font-mono-num">
                      {dailySummary.prayedCount}/5 {tr('done', 'पढ़ीं')}
                    </p>
                  </div>
                </div>

                {/* Live Active Prayer Urgency Line */}
                {prayerSchedule?.activeWindow && (
                  <div className="px-3.5 py-2 rounded-xl bg-[#B88E44]/10 border border-[#B88E44]/25 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="w-3.5 h-3.5 text-[#B88E44] dark:text-[#D4AA5E] shrink-0" />
                      <span className="font-medium text-[#1A1D1B] dark:text-[#F1F3F2] truncate">
                        {tr(
                          `${prayerLabel(prayerSchedule.activeWindow.id)} time now`,
                          `अभी ${prayerLabel(prayerSchedule.activeWindow.id)} का वक़्त है`
                        )}
                      </span>
                    </div>
                    <span className="font-mono-num font-semibold text-[#B88E44] dark:text-[#D4AA5E] whitespace-nowrap shrink-0">
                      {tr(
                        `${activeWindowRemaining} left`,
                        `${activeWindowRemaining} बाक़ी`
                      )}
                    </span>
                  </div>
                )}

                {/* 5-Segment Daily Progress Strip + Explicit Left List */}
                <div className="space-y-1.5">
                  <div className="grid grid-cols-5 gap-1.5" aria-hidden="true">
                    {PRAYERS.map((p) => {
                      const st = todayCheckIn?.[p.id] || 'unmarked';
                      return (
                        <div
                          key={p.id}
                          className={`h-2 rounded-full transition-colors duration-300 ${
                            st === 'prayed'
                              ? 'bg-[#1B4D3E] dark:bg-[#2E7D5B]'
                              : st === 'missed'
                                ? 'bg-[#B88E44]/60'
                                : 'bg-[#EAE7DF] dark:bg-[#242E2A]'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                    {dailySummary.leftCount > 0 ? (
                      <>
                        <span className="font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">
                          {tr('Left today:', 'आज बाक़ी:')}{' '}
                        </span>
                        {dailySummary.unmarkedList.map((id) => prayerLabel(id)).join(', ')}
                      </>
                    ) : dailySummary.prayedCount === 5 ? (
                      <span className="font-medium text-[#2E7D5B] dark:text-[#7FD1B2]">
                        {tr(
                          'All 5 daily prayers completed for today!',
                          'माशाअल्लाह! आज की पांचों नमाज़ें पूरी हो गईं।'
                        )}
                      </span>
                    ) : (
                      <span>
                        {tr(
                          `${dailySummary.prayedCount}/5 prayed · ${dailySummary.missedCount} missed`,
                          `${dailySummary.prayedCount}/5 पढ़ीं · ${dailySummary.missedCount} छूटीं`
                        )}
                      </span>
                    )}
                  </p>
                </div>

                {/* 5 Prayer Action Rows */}
                <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A] border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl overflow-hidden">
                  {PRAYERS.map((p) => {
                    const status = todayCheckIn?.[p.id] || 'unmarked';
                    const carried = todayCheckIn?.carriedForwardPrayers?.includes(p.id);
                    const win = prayerSchedule?.windows.find((w) => w.id === p.id);
                    const isJustDone = dailyAnim?.prayer === p.id;

                    return (
                      <div
                        key={p.id}
                        className={`relative px-3.5 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 transition-colors duration-300 ${
                          status === 'prayed'
                            ? 'bg-[#1B4D3E]/[0.04] dark:bg-[#2E7D5B]/10'
                            : win?.isActive && status === 'unmarked'
                              ? 'bg-[#B88E44]/[0.06]'
                              : 'bg-white dark:bg-[#151C19]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Animated Completion Circle */}
                          <button
                            type="button"
                            onClick={() => void handleToggleDailyPrayed(p.id)}
                            aria-label={
                              status === 'prayed'
                                ? tr(`Unmark ${p.label}`, `${p.label} हटाएं`)
                                : tr(`Mark ${p.label} prayed`, `${p.label} पढ़ी दर्ज करें`)
                            }
                            className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4D3E]"
                          >
                            {isJustDone && (
                              <span
                                key={`ring-${dailyAnim.token}`}
                                className="absolute inset-0 rounded-full border-2 border-[#2E7D5B] animate-ring-burst pointer-events-none"
                              />
                            )}
                            <span
                              key={isJustDone ? `pop-${dailyAnim.token}` : 'idle'}
                              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                                status === 'prayed'
                                  ? 'bg-[#1B4D3E] dark:bg-[#2E7D5B] border-[#1B4D3E] dark:border-[#2E7D5B] text-white'
                                  : status === 'missed'
                                    ? 'bg-[#B88E44]/15 border-[#B88E44] text-[#B88E44]'
                                    : win?.isActive
                                      ? 'border-[#B88E44] bg-white dark:bg-[#151C19]'
                                      : 'border-[#C8C3B8] dark:border-[#3A4741] bg-white dark:bg-[#151C19]'
                              } ${isJustDone ? 'animate-check-pop' : ''}`}
                            >
                              {status === 'prayed' && <Check className="w-4 h-4 stroke-[2.5]" />}
                            </span>
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-sm font-medium ${
                                  status === 'prayed'
                                    ? 'text-[#1B4D3E] dark:text-[#7FD1B2]'
                                    : 'text-[#1A1D1B] dark:text-[#F1F3F2]'
                                }`}
                              >
                                {prayerLabel(p.id)}
                              </span>
                              {win?.isActive && status === 'unmarked' && (
                                <span className="text-[11px] font-medium text-[#B88E44] dark:text-[#D4AA5E]">
                                  · {tr('Due now', 'अभी पढ़ें')}
                                </span>
                              )}
                              {carried && (
                                <span className="text-[11px] font-medium text-[#B88E44] dark:text-[#D4AA5E]">
                                  · {tr('In Qaza Inbox', 'क़ज़ा में जुड़ी')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#7A827D] font-mono-num">
                              {win ? `${win.startFormatted} – ${win.endFormatted}` : prayerHint(p.id)}
                            </p>
                          </div>
                        </div>

                        <div className="relative flex items-center gap-1.5 ml-auto shrink-0">
                          {isJustDone && (
                            <span
                              key={`float-${dailyAnim.token}`}
                              className="absolute -top-5 right-2 text-xs font-semibold text-[#1B4D3E] dark:text-[#7FD1B2] animate-float-up pointer-events-none whitespace-nowrap"
                            >
                              +1 ✓
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleToggleDailyPrayed(p.id)}
                            className={`min-h-[38px] px-3.5 rounded-lg text-xs font-medium border transition-colors inline-flex items-center gap-1.5 ${
                              status === 'prayed'
                                ? 'bg-[#1B4D3E] dark:bg-[#2E7D5B] text-white border-[#1B4D3E] dark:border-[#2E7D5B]'
                                : 'border-[#1B4D3E]/30 dark:border-[#2A6F5A]/50 text-[#1B4D3E] dark:text-[#7FD1B2] hover:bg-[#1B4D3E] hover:text-white'
                            }`}
                          >
                            {status === 'prayed' ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>{tr('Done', 'पढ़ी ✓')}</span>
                              </>
                            ) : (
                              <span>{tr('Mark Done', 'पढ़ी दर्ज करें')}</span>
                            )}
                          </button>

                          {status !== 'prayed' && (
                            <button
                              type="button"
                              onClick={() =>
                                void updateDailyCheckIn(
                                  p.id,
                                  status === 'missed' ? 'unmarked' : 'missed',
                                  snapshot.profile.autoCarryForward
                                )
                              }
                              className={`min-h-[38px] px-2.5 rounded-lg text-xs font-medium border transition-colors ${
                                status === 'missed'
                                  ? 'bg-[#B88E44] text-white border-[#B88E44]'
                                  : 'border-[#E5E2DC] dark:border-[#242E2A] text-[#7A827D] hover:text-[#B88E44] hover:border-[#B88E44]'
                              }`}
                            >
                              {tr('Missed', 'छूटी')}
                            </button>
                          )}

                          {status === 'missed' && !carried && (
                            <button
                              type="button"
                              onClick={() => void updateDailyCheckIn(p.id, 'missed', true)}
                              className="min-h-[38px] px-2.5 rounded-lg bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] text-xs font-medium text-[#1B4D3E] dark:text-[#7FD1B2] whitespace-nowrap"
                            >
                              + {tr('Qaza', 'क़ज़ा')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5E2DC] dark:border-[#242E2A] flex items-center justify-between gap-3 text-xs text-[#5C635E] dark:text-[#9AA59E]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={snapshot.profile.autoCarryForward}
                    onChange={(e) =>
                      void updatePreferences({ autoCarryForward: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#1B4D3E] shrink-0"
                  />
                  <span>
                    {tr('Auto-add Missed to Qaza Inbox', 'छूटी नमाज़ अपने आप क़ज़ा में जोड़ें')}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => void updatePreferences({ dailyCheckInEnabled: false })}
                  className="text-[#7A827D] hover:text-[#1A1D1B] dark:hover:text-[#F1F3F2] whitespace-nowrap"
                >
                  {tr('Hide', 'छुपाएं')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 flex flex-col justify-center items-start gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-[#B88E44]" />
                <h2 className="text-base font-semibold">
                  {tr("Today's Daily Namaz is hidden", 'आज की 5 फ़र्ज़ नमाज़ों का ट्रैकर छुपा है')}
                </h2>
              </div>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                {tr(
                  "Enable it to see how many of today's 5 prayers are left and check off each prayer as you offer it.",
                  'आज की 5 में से कितनी नमाज़ें बाक़ी हैं देखने और दर्ज करने के लिए इसे चालू करें।'
                )}
              </p>
              <button
                type="button"
                onClick={() => void updatePreferences({ dailyCheckInEnabled: true })}
                className="min-h-[42px] px-4 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs font-medium hover:bg-[#143B2F]"
              >
                {tr("Show Today's Namaz Tracker", 'आज की नमाज़ ट्रैकर दिखाएं')}
              </button>
            </div>
          )}
        </div>

        {/* TRACKER 2: Today's Qaza Goal for the Day (Independent from Daily Namaz) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            {/* Header & Remaining Qaza for Today */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {tr("Today's Qaza Goal", 'आज की क़ज़ा नमाज़ों का लक्ष्य')}
                </h2>
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-0.5">
                  {qazaDayPlan.isFullDayMode
                    ? tr(
                        'Complete 1 full Qaza day (all 5 prayers) at your own pace today.',
                        'आज 1 पूरा क़ज़ा दिन (पाँचों क़ज़ा नमाज़ें) मुकम्मल करें।'
                      )
                    : qazaDayPlan.dailyTarget > 0
                      ? tr(
                          `Daily commitment: ${qazaDayPlan.dailyTarget} Qaza ${qazaDayPlan.dailyTarget === 1 ? 'prayer' : 'prayers'} per day.`,
                          `रोज़ाना लक्ष्य: प्रतिदिन ${qazaDayPlan.dailyTarget} क़ज़ा नमाज़ें।`
                        )
                      : tr(
                          'Log any Qaza prayer you make up today.',
                          'आज जो भी क़ज़ा नमाज़ अदा करें उसे यहाँ दर्ज करें।'
                        )}
                </p>
              </div>
              <div className="text-right shrink-0">
                {qazaDayPlan.totalTarget > 0 ? (
                  qazaDayPlan.remainingCount === 0 ? (
                    <span className="text-sm font-semibold font-mono-num text-[#2E7D5B] dark:text-[#7FD1B2]">
                      {tr('Goal Done!', 'लक्ष्य पूरा!')}
                    </span>
                  ) : (
                    <span className="text-lg font-semibold font-mono-num text-[#1B4D3E] dark:text-[#7FD1B2]">
                      {qazaDayPlan.isFullDayMode
                        ? `${qazaDayPlan.remainingCount}/5 ${tr('left', 'बाक़ी')}`
                        : `${qazaDayPlan.remainingCount}/${qazaDayPlan.totalTarget} ${tr('left', 'बाक़ी')}`}
                    </span>
                  )
                ) : (
                  <span className="text-lg font-semibold font-mono-num text-[#1B4D3E] dark:text-[#7FD1B2]">
                    {todayCompletedCount} {tr('today', 'आज')}
                  </span>
                )}
                <p className="text-[11px] text-[#7A827D] font-mono-num">
                  {todayCompletedCount} {tr('Qaza done today', 'आज अदा कीं')}
                </p>
              </div>
            </div>

            {/* Quick Inline Daily Qaza Pace Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A]">
              <span className="text-xs text-[#5C635E] dark:text-[#9AA59E] font-medium">
                {tr('Daily pace:', 'रोज़ाना लक्ष्य:')}
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {[
                  {
                    id: '1_day',
                    label: tr('1 / day', '1 / दिन'),
                    active:
                      snapshot.profile.targetType === 'daily' &&
                      snapshot.profile.targetCount === 1 &&
                      snapshot.profile.routine !== 'full_qaza_day',
                    apply: () =>
                      updatePreferences({
                        routine: 'custom_daily',
                        targetType: 'daily',
                        targetCount: 1,
                      }),
                  },
                  {
                    id: '2_day',
                    label: tr('2 / day', '2 / दिन'),
                    active:
                      snapshot.profile.targetType === 'daily' &&
                      snapshot.profile.targetCount === 2 &&
                      snapshot.profile.routine !== 'full_qaza_day',
                    apply: () =>
                      updatePreferences({
                        routine: 'custom_daily',
                        targetType: 'daily',
                        targetCount: 2,
                      }),
                  },
                  {
                    id: 'full_day',
                    label: tr('1 Full Day (5)', '1 पूरा दिन (5)'),
                    active: qazaDayPlan.isFullDayMode,
                    apply: () =>
                      updatePreferences({
                        routine: 'full_qaza_day',
                        targetType: 'daily',
                        targetCount: 5,
                      }),
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => void opt.apply()}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      opt.active
                        ? 'bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white'
                        : 'text-[#5C635E] dark:text-[#9AA59E] hover:text-[#1A1D1B] dark:hover:text-[#F1F3F2]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress Bar + Which Qaza Prayers Are Left / Done Today */}
            <div className="space-y-1.5">
              {qazaDayPlan.totalTarget > 0 && qazaDayPlan.totalTarget <= 10 ? (
                <div
                  className="grid gap-1.5"
                  style={{ gridTemplateColumns: `repeat(${qazaDayPlan.totalTarget}, minmax(0, 1fr))` }}
                  aria-hidden="true"
                >
                  {Array.from({ length: qazaDayPlan.totalTarget }).map((_, idx) => {
                    const filled = qazaDayPlan.isFullDayMode
                      ? todayQazaByPrayer[PRAYERS[idx].id] > 0
                      : idx < qazaDayPlan.doneForTarget;
                    return (
                      <div
                        key={idx}
                        className={`h-2 rounded-full transition-colors duration-300 ${
                          filled
                            ? 'bg-[#1B4D3E] dark:bg-[#2E7D5B]'
                            : 'bg-[#EAE7DF] dark:bg-[#242E2A]'
                        }`}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="h-2 w-full rounded-full bg-[#EAE7DF] dark:bg-[#242E2A] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#1B4D3E] dark:bg-[#2E7D5B] transition-all duration-300"
                    style={{
                      width: `${
                        qazaDayPlan.totalTarget > 0
                          ? Math.min(100, Math.round((todayCompletedCount / qazaDayPlan.totalTarget) * 100))
                          : todayCompletedCount > 0
                            ? 100
                            : 0
                      }%`,
                    }}
                  />
                </div>
              )}

              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                {qazaDayPlan.isFullDayMode ? (
                  qazaDayPlan.remainingCount > 0 ? (
                    <>
                      <span className="font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">
                        {tr('Left for today:', 'आज बाक़ी:')}{' '}
                      </span>
                      {qazaDayPlan.leftPrayersToday.map((id) => prayerLabel(id)).join(', ')}
                    </>
                  ) : (
                    <span className="font-medium text-[#2E7D5B] dark:text-[#7FD1B2]">
                      {tr(
                        'Full Qaza day completed today! Keep going strong.',
                        'माशाअल्लाह! आज का पूरा क़ज़ा दिन मुकम्मल हो गया।'
                      )}
                    </span>
                  )
                ) : qazaDayPlan.dailyTarget > 0 ? (
                  qazaDayPlan.remainingCount > 0 ? (
                    <>
                      <span className="font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">
                        {tr(
                          `${qazaDayPlan.remainingCount} more to offer today`,
                          `आज ${qazaDayPlan.remainingCount} क़ज़ा और अदा करनी हैं`
                        )}
                      </span>
                      {qazaDayPlan.donePrayersToday.length > 0 && (
                        <span>
                          {' '}
                          · {tr('Done:', 'अदा कीं:')}{' '}
                          {qazaDayPlan.donePrayersToday
                            .map((id) => `${todayQazaByPrayer[id]} ${prayerLabel(id)}`)
                            .join(', ')}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="font-medium text-[#2E7D5B] dark:text-[#7FD1B2]">
                      {tr(
                        `Today's Qaza goal (${qazaDayPlan.dailyTarget}) completed!`,
                        `माशाअल्लाह! आज का लक्ष्य (${qazaDayPlan.dailyTarget} क़ज़ा) पूरा हो गया।`
                      )}
                    </span>
                  )
                ) : (
                  <span>
                    {snapshot.profile.targetType === 'weekly' && snapshot.profile.targetCount > 0
                      ? tr(
                          `Weekly goal: ${weekCompletedCount}/${snapshot.profile.targetCount} done this week`,
                          `हफ़्तावार लक्ष्य: ${snapshot.profile.targetCount} में से ${weekCompletedCount} पूरी`
                        )
                      : tr(
                          'Tap any prayer below as you offer a Qaza prayer today.',
                          'आज जो भी क़ज़ा पढ़ें, नीचे उस नमाज़ के आगे टैप करें।'
                        )}
                  </span>
                )}
              </p>
            </div>

            {/* 5 Qaza Prayer Action Rows for Today */}
            <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A] border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl overflow-hidden">
              {PRAYERS.map((p) => {
                const doneToday = todayQazaByPrayer[p.id];
                const pendingBacklog = snapshot.balances[p.id].pendingBalance;
                const isDoneSlot = doneToday > 0;
                const isJustQazaDone =
                  qazaAnim?.prayer === p.id || (qazaAnim?.prayer === 'all' && doneToday > 0);

                return (
                  <div
                    key={p.id}
                    className={`relative px-3.5 py-3 flex items-center justify-between gap-2.5 transition-colors duration-300 ${
                      isDoneSlot
                        ? 'bg-[#1B4D3E]/[0.04] dark:bg-[#2E7D5B]/10'
                        : 'bg-white dark:bg-[#151C19]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        disabled={pendingBacklog <= 0}
                        onClick={() => void handleCompleteOneQaza(p.id)}
                        aria-label={tr(`Complete 1 ${p.label} Qaza`, `1 ${p.label} क़ज़ा पूरी दर्ज करें`)}
                        className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4D3E]"
                      >
                        {isJustQazaDone && qazaAnim && (
                          <span
                            key={`qring-${qazaAnim.token}`}
                            className="absolute inset-0 rounded-full border-2 border-[#2E7D5B] animate-ring-burst pointer-events-none"
                          />
                        )}
                        <span
                          key={isJustQazaDone && qazaAnim ? `qpop-${qazaAnim.token}` : 'qidle'}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                            isDoneSlot
                              ? 'bg-[#1B4D3E] dark:bg-[#2E7D5B] border-[#1B4D3E] dark:border-[#2E7D5B] text-white'
                              : 'border-[#C8C3B8] dark:border-[#3A4741] bg-white dark:bg-[#151C19]'
                          } ${isJustQazaDone ? 'animate-check-pop' : ''}`}
                        >
                          {isDoneSlot ? (
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <span className="text-[11px] font-mono-num text-[#7A827D]">+1</span>
                          )}
                        </span>
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-medium ${
                              isDoneSlot
                                ? 'text-[#1B4D3E] dark:text-[#7FD1B2]'
                                : 'text-[#1A1D1B] dark:text-[#F1F3F2]'
                            }`}
                          >
                            {prayerLabel(p.id)} {tr('Qaza', 'क़ज़ा')}
                          </span>
                          {doneToday > 0 && (
                            <span className="text-[11px] font-medium font-mono-num text-[#2E7D5B] dark:text-[#7FD1B2]">
                              · {doneToday} {tr('done today', 'आज पढ़ी')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#7A827D] font-mono-num">
                          {pendingBacklog.toLocaleString()} {tr('left in backlog', 'कुल बाक़ी')}
                        </p>
                      </div>
                    </div>

                    <div className="relative flex items-center gap-2 shrink-0">
                      {isJustQazaDone && qazaAnim && (
                        <span
                          key={`qfloat-${qazaAnim.token}`}
                          className="absolute -top-5 right-2 text-xs font-semibold text-[#1B4D3E] dark:text-[#7FD1B2] animate-float-up pointer-events-none whitespace-nowrap"
                        >
                          +1 {tr('Qaza', 'क़ज़ा')} ✓
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={pendingBacklog <= 0}
                        onClick={() => void handleCompleteOneQaza(p.id)}
                        className="min-h-[38px] px-3.5 rounded-lg bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs font-medium hover:bg-[#143B2F] dark:hover:bg-[#225B49] active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap inline-flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>{tr('Prayed 1', '1 पढ़ी')}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full-Day Bulk Action / Settings Footer */}
          <div className="pt-2 border-t border-[#E5E2DC] dark:border-[#242E2A] flex flex-wrap items-center justify-between gap-2 text-xs">
            {qazaDayPlan.isFullDayMode && qazaDayPlan.remainingCount > 1 ? (
              <button
                type="button"
                onClick={() => void handleCompleteRemainingFullDay()}
                className="min-h-[36px] px-3 rounded-lg border border-[#1B4D3E]/30 dark:border-[#2A6F5A]/50 text-[#1B4D3E] dark:text-[#7FD1B2] font-medium hover:bg-[#1B4D3E]/8 inline-flex items-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>
                  {tr(
                    `Complete remaining ${qazaDayPlan.remainingCount} now`,
                    `बाक़ी ${qazaDayPlan.remainingCount} एक साथ पूरी करें`
                  )}
                </span>
              </button>
            ) : (
              <span className="text-[#5C635E] dark:text-[#9AA59E]">
                {tr('Updates your backlog immediately with Undo.', 'तुरंत हिसाब अपडेट होता है (Undo सुविधा के साथ)।')}
              </span>
            )}
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="text-[#1B4D3E] dark:text-[#7FD1B2] font-medium hover:underline whitespace-nowrap"
            >
              {tr('Custom target', 'कस्टम लक्ष्य')}
            </button>
          </div>
        </div>
      </section>

      {/* SECONDARY ROW: Overall Qaza Progress + Deen & Quick Tools */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Overall Backlog Summary Card */}
        <div className="lg:col-span-7 bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 flex flex-col justify-between gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#5C635E] dark:text-[#9AA59E]">
                {tr('Overall Qaza Balance', 'कुल बाक़ी क़ज़ा नमाज़ें')}
              </p>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-semibold tracking-tight font-mono-num text-[#1A1D1B] dark:text-[#F1F3F2]">
                  {totals.pending.toLocaleString()}
                </span>
                <span className="text-sm text-[#5C635E] dark:text-[#9AA59E]">
                  {tr('pending total', 'कुल बाक़ी')}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[#5C635E] dark:text-[#9AA59E]">{encouragingText}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-semibold font-mono-num text-[#1B4D3E] dark:text-[#7FD1B2]">
                {totals.pct}%
              </span>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                {tr('completed', 'मुकम्मल')}
              </p>
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
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                  {tr('Starting Balance', 'शुरुआती हिसाब')}
                </p>
                <p className="mt-0.5 text-base font-semibold font-mono-num">
                  {totals.initial.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                  {tr('Completed', 'अदा कीं')}
                </p>
                <p className="mt-0.5 text-base font-semibold font-mono-num text-[#2E7D5B] dark:text-[#7FD1B2]">
                  {totals.completed.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                  {tr('Largest Balance', 'सबसे ज़्यादा बाक़ी')}
                </p>
                <p className="mt-0.5 text-base font-semibold">
                  {highestBalancePrayer.count > 0
                    ? `${prayerLabel(highestBalancePrayer.prayer.id)} (${highestBalancePrayer.count.toLocaleString()})`
                    : tr('Balanced', 'बराबर')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Deen Progress + Quick Tools */}
        <div className="lg:col-span-5 bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 flex flex-col justify-between gap-4">
          <div className="space-y-3.5">
            {/* Compact Today's Deen Progress Card */}
            <div className="p-3.5 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <BookOpen className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {tr("Today's Deen & Tasbeeh", 'आज का दीन और तस्बीह')}
                  </p>
                  <p className="text-[11px] text-[#5C635E] dark:text-[#9AA59E] font-mono-num">
                    {deenTodaySummary.done}/{deenTodaySummary.total}{' '}
                    {tr('daily tasks done', 'रोज़ाना काम पूरे')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('deen')}
                className="min-h-[36px] px-3 rounded-lg bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs font-medium inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <span>{tr('Open', 'खोलें')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                  {tr('Last activity', 'आख़िरी गतिविधि')}
                </p>
                <p className="text-sm font-medium truncate mt-0.5">
                  {lastActivity ? lastActivity.text : tr('No activity logged yet', 'अभी कोई गतिविधि दर्ज नहीं')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('tracker')}
                className="min-h-[40px] px-3.5 rounded-xl border border-[#1B4D3E]/30 dark:border-[#2A6F5A]/50 text-[#1B4D3E] dark:text-[#7FD1B2] text-xs font-medium hover:bg-[#1B4D3E]/5 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>{tr('Batch & Pace', 'बैच / समय')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E2DC] dark:border-[#242E2A]">
            <p className="text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-2.5">
              {tr('Quick Tools', 'त्वरित टूल्स')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onNavigate('tracker')}
                className="min-h-[44px] px-2.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Layers className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2] shrink-0" />
                <span className="truncate">{tr('Batch Log', 'बैच लॉग')}</span>
              </button>
              <button
                type="button"
                onClick={() => (onOpenCalculator ? onOpenCalculator() : onNavigate('tracker'))}
                className="min-h-[44px] px-2.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Calculator className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2] shrink-0" />
                <span className="truncate">{tr('Calculator', 'कैलकुलेटर')}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('activity')}
                className="min-h-[44px] px-2.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <History className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2] shrink-0" />
                <span className="truncate">{tr('Activity', 'इतिहास')}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Local Namaz Timings & Alarms */}
      <PrayerTimesCard />

      {/* Historical Qaza Backlog Counters */}
      <section className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E2DC] dark:border-[#242E2A] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {tr('Historical Qaza Backlog', 'पिछली छूटी क़ज़ा नमाज़ों का हिसाब')}
            </h2>
            <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
              {tr(
                'Your total past missed prayers across all 5 daily categories.',
                'पांचों वक़्त की आपकी कुल पुरानी छूटी हुई नमाज़ें।'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('tracker')}
            className="text-xs font-medium text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline whitespace-nowrap"
          >
            {tr('Log multiple / view progress', 'एक साथ कई दर्ज करें / प्रगति देखें')}
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
                      <span className="text-sm sm:text-base font-medium">{prayerLabel(p.id)}</span>
                      {isFocus && (
                        <span className="text-xs text-[#B88E44] dark:text-[#D4AA5E] font-medium">
                          · {tr('Focus', 'फ़ोकस')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#7A827D]">
                      {prayerHint(p.id)}
                      {b.inboxPendingCount > 0
                        ? ` · ${b.inboxPendingCount} ${tr('newly missed', 'नई छूटी')}`
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 sm:gap-8 ml-auto">
                  <div className="text-right">
                    <p className="text-[11px] text-[#7A827D]">{tr('Pending', 'बाक़ी')}</p>
                    <p className="text-base font-semibold font-mono-num">
                      {b.pendingBalance.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-[#7A827D]">{tr('Completed', 'पूरी')}</p>
                    <p className="text-base font-semibold font-mono-num text-[#2E7D5B] dark:text-[#7FD1B2]">
                      {b.completedBalance.toLocaleString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={b.pendingBalance <= 0}
                    onClick={() => void handleCompleteOneQaza(p.id)}
                    className="min-h-[44px] px-4 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs sm:text-sm font-medium hover:bg-[#143B2F] dark:hover:bg-[#225B49] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{tr('Mark 1 Completed', '1 पूरी दर्ज करें')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Newly Missed Prayers (Qaza Inbox Queue) */}
      <section className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] flex items-center justify-center shrink-0">
              <Inbox className="w-5 h-5 text-[#1B4D3E] dark:text-[#7FD1B2]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {tr('Newly Missed Prayers (Qaza Inbox)', 'नई छूटी नमाज़ें (क़ज़ा इनबॉक्स)')}
              </h2>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                {tr(
                  "Prayers marked Missed in Today's Daily Namaz above—or added in one tap below—sit here so you can clear recent misses right away.",
                  'ऊपर चेक-इन में छूटी दर्ज की गई या नीचे 1-टैप से जोड़ी गई नमाज़ें यहाँ दिखती हैं ताकि आप उन्हें जल्द पूरा कर सकें।'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowNoteInput((v) => !v)}
            className="text-xs text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline whitespace-nowrap"
          >
            {showNoteInput ? tr('Hide note', 'नोट छुपाएं') : tr('+ Optional note', '+ नोट लिखें')}
          </button>
        </div>

        {showNoteInput && (
          <input
            type="text"
            value={inboxNote}
            maxLength={200}
            onChange={(e) => setInboxNote(e.target.value)}
            placeholder={tr(
              'Optional note (e.g., travelling, missed due to meeting)',
              'वैकल्पिक नोट (जैसे: सफ़र में छूट गई)'
            )}
            className="w-full min-h-[42px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
          />
        )}

        <div>
          <p className="text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-2">
            {tr('Quickly add a newly missed prayer to your Qaza queue:', 'नई छूटी नमाज़ तुरंत जोड़ें:')}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {PRAYERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void handleQuickAddInbox(p.id)}
                className="min-h-[44px] px-1.5 sm:px-2 py-2 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:border-[#1B4D3E] dark:hover:border-[#7FD1B2] hover:bg-[#1B4D3E]/5 text-xs sm:text-sm font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 text-[#1B4D3E] dark:text-[#7FD1B2] shrink-0" />
                <span className="truncate">{prayerLabel(p.id)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-[#E5E2DC] dark:border-[#242E2A]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#5C635E] dark:text-[#9AA59E]">
              {tr('Pending Queue', 'बाक़ी कतार')} ({pendingInboxEntries.length})
            </span>
            {snapshot.qazaEntries.length > pendingInboxEntries.length && (
              <button
                type="button"
                onClick={() => onNavigate('tracker')}
                className="text-xs text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline"
              >
                {tr('View completed inbox items', 'पूरी हुई कतार देखें')}
              </button>
            )}
          </div>

          {pendingInboxEntries.length === 0 ? (
            <p className="text-sm text-[#7A827D] py-4 text-center bg-[#F8F7F4] dark:bg-[#0E1311] rounded-xl border border-dashed border-[#E5E2DC] dark:border-[#242E2A]">
              {tr('No newly missed prayers waiting in your inbox.', 'इनबॉक्स में अभी कोई नई छूटी नमाज़ नहीं है।')}
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
                      {prayerLabel(entry.prayerType)}
                      <span className="ml-2 text-xs font-normal text-[#7A827D]">
                        · {tr('Added', 'जोड़ी गई')}{' '}
                        {new Date(entry.dateAdded).toLocaleDateString(lang === 'hi' ? 'hi-IN' : [])} ·{' '}
                        {tr('Pending', 'बाक़ी')}
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
                      onClick={() => {
                        triggerQazaCelebration(entry.prayerType);
                        void completeInboxEntry(entry.id);
                      }}
                      className="min-h-[40px] px-3 rounded-lg bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs font-medium hover:bg-[#143B2F] transition-colors whitespace-nowrap"
                    >
                      {tr('Mark Made Up', 'अदा की')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeInboxEntry(entry.id)}
                      aria-label={tr(`Remove ${entry.prayerType} inbox entry`, 'हटाएं')}
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
      </section>
    </div>
  );
};
