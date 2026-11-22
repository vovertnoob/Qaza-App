import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Check,
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
import { calculatePrayerWindows } from '../lib/prayerTimes';
import { PRAYERS, type PrayerType } from '../types/qaza';
import { PrayerTimesCard } from './PrayerTimesCard';

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
    addMissedToInbox,
    completeInboxEntry,
    removeInboxEntry,
    updateDailyCheckIn,
    updatePreferences,
  } = useQaza();
  const { lang, tr, prayerLabel, prayerHint } = useLanguage();

  const [inboxNote, setInboxNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

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

  const todayKey = getLocalDateKey();

  const deenTodaySummary = useMemo(() => {
    const activeDaily = snapshot.deenTasks.filter((t) => t.isActive && t.frequency === 'daily');
    const counts = snapshot.deenLogs[todayKey]?.counts || {};
    const done = activeDaily.filter((t) => (counts[t.id] || 0) >= t.targetCount).length;
    return { done, total: activeDaily.length };
  }, [snapshot.deenTasks, snapshot.deenLogs, todayKey]);

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
        {/* Primary Overall Balance Card */}
        <div className="lg:col-span-7 bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 flex flex-col justify-between gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#5C635E] dark:text-[#9AA59E]">
                {tr('Overall Qaza Balance', 'कुल बाक़ी क़ज़ा नमाज़ें')}
              </p>
              <div className="mt-1.5 flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-semibold tracking-tight font-mono-num text-[#1A1D1B] dark:text-[#F1F3F2]">
                  {totals.pending.toLocaleString()}
                </span>
                <span className="text-sm text-[#5C635E] dark:text-[#9AA59E]">
                  {tr('pending', 'बाक़ी')}
                </span>
              </div>
              <p className="mt-2 text-xs text-[#5C635E] dark:text-[#9AA59E]">{encouragingText}</p>
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

        {/* Today's Progress + Deen Quick Link + Quick Actions */}
        <div className="lg:col-span-5 bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 flex flex-col justify-between gap-4">
          <div className="space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-[#5C635E] dark:text-[#9AA59E]">
                  {tr("Today's Qaza Goal", 'आज का क़ज़ा लक्ष्य')}
                </p>
                <p className="mt-1 text-xl font-semibold font-mono-num">
                  {snapshot.profile.targetType === 'daily' && snapshot.profile.targetCount > 0
                    ? tr(
                        `${todayCompletedCount} of ${snapshot.profile.targetCount} completed today`,
                        `आज ${snapshot.profile.targetCount} में से ${todayCompletedCount} पूरी`
                      )
                    : tr(`${todayCompletedCount} completed today`, `आज ${todayCompletedCount} पूरी हुईं`)}
                </p>
                {snapshot.profile.targetType === 'weekly' && snapshot.profile.targetCount > 0 && (
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-0.5 font-mono-num">
                    {tr(
                      `${weekCompletedCount} of ${snapshot.profile.targetCount} this week`,
                      `इस हफ़्ते ${snapshot.profile.targetCount} में से ${weekCompletedCount}`
                    )}
                  </p>
                )}
              </div>
              {snapshot.profile.startSmallMode && (
                <span className="text-xs text-[#B88E44] dark:text-[#D4AA5E] font-medium whitespace-nowrap">
                  {tr('Start Small', 'आसान शुरुआत')}
                </span>
              )}
            </div>

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

            <div className="pt-2.5 border-t border-[#E5E2DC] dark:border-[#242E2A] flex items-center justify-between gap-3">
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

      {/* Daily Workflow First: Today's Prayer Check-In (Left) + Local Namaz Timings & Alarms (Right) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7">
          {snapshot.profile.dailyCheckInEnabled ? (
            <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {tr("Today's Prayer Check-In", 'आज की 5 नमाज़ों का चेक-इन')}
                  </h2>
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-0.5">
                    {tr(
                      "Step 1: Mark today's 5 daily prayers as Prayed or Missed. Missed prayers automatically feed into your Qaza queue below.",
                      'क़दम 1: आज की पाँचों नमाज़ों को अदा या छूटी (क़ज़ा) दर्ज करें। छूटी हुई नमाज़ें अपने आप नीचे क़ज़ा कतार में जुड़ जाएंगी।'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void updatePreferences({ dailyCheckInEnabled: false })}
                  className="text-xs text-[#7A827D] hover:text-[#1A1D1B] dark:hover:text-[#F1F3F2] whitespace-nowrap"
                >
                  {tr('Hide', 'छुपाएं')}
                </button>
              </div>

              <label className="px-3.5 py-2.5 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] flex items-center justify-between gap-3 cursor-pointer text-xs">
                <span className="text-[#1A1D1B] dark:text-[#F1F3F2] font-medium">
                  {tr('Auto-send Missed prayers to Qaza Inbox', 'छूटी नमाज़ को अपने आप क़ज़ा इनबॉक्स में भेजें')}
                </span>
                <input
                  type="checkbox"
                  checked={snapshot.profile.autoCarryForward}
                  onChange={(e) =>
                    void updatePreferences({ autoCarryForward: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#1B4D3E] shrink-0"
                />
              </label>

              <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A] border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl overflow-hidden">
                {PRAYERS.map((p) => {
                  const status = todayCheckIn?.[p.id] || 'unmarked';
                  const carried = todayCheckIn?.carriedForwardPrayers?.includes(p.id);
                  const win = prayerSchedule?.windows.find((w) => w.id === p.id);

                  return (
                    <div
                      key={p.id}
                      className="px-3.5 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 bg-white dark:bg-[#151C19]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{prayerLabel(p.id)}</span>
                          {win?.isActive && (
                            <span className="text-[11px] font-medium text-[#1B4D3E] dark:text-[#7FD1B2]">
                              · {tr('Now', 'अभी का वक़्त')}
                            </span>
                          )}
                          {carried && (
                            <span className="text-[11px] font-medium text-[#B88E44] dark:text-[#D4AA5E]">
                              · {tr('Sent to Qaza', 'क़ज़ा में जुड़ी')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#7A827D] font-mono-num mt-0.5">
                          {win ? `${win.startFormatted} – ${win.endFormatted}` : prayerHint(p.id)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => void updateDailyCheckIn(p.id, 'prayed', false)}
                          className={`min-h-[38px] px-3 rounded-lg text-xs font-medium border transition-colors ${
                            status === 'prayed'
                              ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                              : 'border-[#E5E2DC] dark:border-[#242E2A] text-[#5C635E] dark:text-[#9AA59E] hover:border-[#1B4D3E]'
                          }`}
                        >
                          {tr('Prayed', 'पढ़ी')}
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
                          className={`min-h-[38px] px-3 rounded-lg text-xs font-medium border transition-colors ${
                            status === 'missed'
                              ? 'bg-[#B88E44] text-white border-[#B88E44]'
                              : 'border-[#E5E2DC] dark:border-[#242E2A] text-[#5C635E] dark:text-[#9AA59E] hover:border-[#B88E44]'
                          }`}
                        >
                          {tr('Missed', 'छूटी')}
                        </button>
                        {status === 'missed' && !carried && (
                          <button
                            type="button"
                            onClick={() => void updateDailyCheckIn(p.id, 'missed', true)}
                            className="min-h-[38px] px-2.5 rounded-lg bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] text-xs font-medium text-[#1B4D3E] dark:text-[#7FD1B2] whitespace-nowrap"
                          >
                            + {tr('Feed Qaza', 'क़ज़ा में जोड़ें')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl px-6 py-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#B88E44] shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-base font-semibold">
                    {tr("Today's Prayer Check-In is hidden", 'आज का नमाज़ चेक-इन छुपा हुआ है')}
                  </h2>
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-0.5">
                    {tr(
                      "Turn it back on to track today's 5 prayers and automatically send any missed ones to your Qaza queue.",
                      'आज की 5 नमाज़ों को ट्रैक करने और छूटी नमाज़ को क़ज़ा कतार में भेजने के लिए इसे चालू करें।'
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void updatePreferences({ dailyCheckInEnabled: true })}
                className="min-h-[42px] px-4 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs font-medium hover:bg-[#143B2F] whitespace-nowrap"
              >
                {tr('Enable Daily Check-In', 'रोज़ाना चेक-इन चालू करें')}
              </button>
            </div>
          )}
        </div>

        {/* Namaz Timings & Alarms */}
        <div className="lg:col-span-5">
          <PrayerTimesCard />
        </div>
      </section>

      {/* Historical Qaza Backlog Counters */}
      <section className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E2DC] dark:border-[#242E2A] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {tr('Historical Qaza Backlog', 'पिछली छूटी क़ज़ा नमाज़ों का हिसाब')}
            </h2>
            <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
              {tr(
                'Your total past missed prayers. Each time you make up a prayer, tap Mark 1 Completed (saves immediately with Undo).',
                'आपकी पुरानी छूटी हुई नमाज़ें। जब भी एक नमाज़ अदा करें, बटन दबाकर तुरंत दर्ज करें (वापस लेने की सुविधा के साथ)।'
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
                    onClick={() => void markOneCompleted(p.id)}
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
                  "Prayers marked Missed in Today's Check-In above—or added in one tap below—sit here so you can clear recent misses right away.",
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
                      onClick={() => void completeInboxEntry(entry.id)}
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
