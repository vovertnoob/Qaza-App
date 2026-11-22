import React, { useMemo, useState } from 'react';
import {
  Award,
  Calculator,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useQaza } from '../context/QazaContext';
import {
  MILESTONES,
  PRAYERS,
  ROUTINE_OPTIONS,
  type PrayerType,
} from '../types/qaza';
import { QazaCalculator } from './QazaCalculator';
import { FinishTimeCalculator, formatReadableDuration } from './FinishTimeCalculator';

interface QazaTrackerViewProps {
  initialSection?: 'tracker' | 'calculator' | 'pace';
}

export const QazaTrackerView: React.FC<QazaTrackerViewProps> = ({
  initialSection = 'tracker',
}) => {
  const {
    snapshot,
    batchComplete,
    completeInboxEntry,
    removeInboxEntry,
    adjustBalances,
    updatePreferences,
  } = useQaza();
  const { lang, tr, prayerLabel, routineInfo } = useLanguage();

  const [section, setSection] = useState<'tracker' | 'calculator' | 'pace'>(initialSection);
  const [paceBacklogOverride, setPaceBacklogOverride] = useState<number | null>(null);
  const [batchCounts, setBatchCounts] = useState<Record<PrayerType, number>>({
    fajr: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  });
  const [confirmFullDay, setConfirmFullDay] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [inboxFilter, setInboxFilter] = useState<'pending' | 'completed'>('pending');
  const [previewPace, setPreviewPace] = useState<number>(
    snapshot.profile.targetType === 'daily' && snapshot.profile.targetCount > 0
      ? snapshot.profile.targetCount
      : 2
  );

  const totals = useMemo(() => {
    let pending = 0;
    let completed = 0;
    let initial = 0;
    for (const p of PRAYERS) {
      const b = snapshot.balances[p.id];
      pending += b.pendingBalance;
      completed += b.completedBalance;
      initial += b.initialBalance;
    }
    const denom = pending + completed;
    const pct = denom > 0 ? Math.round((completed / denom) * 100) : 0;
    return { pending, completed, initial, pct };
  }, [snapshot.balances]);

  const batchTotal = PRAYERS.reduce((sum, p) => sum + (batchCounts[p.id] || 0), 0);

  const canDoFullDay = PRAYERS.some((p) => snapshot.balances[p.id].pendingBalance > 0);
  const fullDayApplicablePrayers = PRAYERS.filter(
    (p) => snapshot.balances[p.id].pendingBalance > 0
  );

  const applyBulkPreset = (daysCount: number) => {
    const next = {} as Record<PrayerType, number>;
    for (const p of PRAYERS) {
      next[p.id] = Math.min(snapshot.balances[p.id].pendingBalance, daysCount);
    }
    setBatchCounts(next);
  };

  const handleApplyBatch = async () => {
    if (batchTotal === 0) return;
    await batchComplete(batchCounts, false);
    setBatchCounts({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 });
  };

  const handleApplyFullDay = async () => {
    await batchComplete({ fajr: 1, dhuhr: 1, asr: 1, maghrib: 1, isha: 1 }, true);
    setConfirmFullDay(false);
  };

  const handleApplyCalculatedBalances = async (
    perPrayer: Record<PrayerType, number>,
    strategy: 'replace' | 'add'
  ) => {
    const nextMap = {} as Record<
      PrayerType,
      { initialBalance: number; pendingBalance: number; completedBalance: number }
    >;
    for (const p of PRAYERS) {
      const old = snapshot.balances[p.id];
      const added = perPrayer[p.id] || 0;
      if (strategy === 'replace') {
        nextMap[p.id] = {
          initialBalance: added,
          pendingBalance: added,
          completedBalance: old.completedBalance,
        };
      } else {
        nextMap[p.id] = {
          initialBalance: old.initialBalance + added,
          pendingBalance: old.pendingBalance + added,
          completedBalance: old.completedBalance,
        };
      }
    }
    await adjustBalances(nextMap);
  };

  const activityByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const log of snapshot.activityLogs) {
      if (log.undoneByLogId) continue;
      if (
        log.actionType === 'completed' ||
        log.actionType === 'batch_completed' ||
        log.actionType === 'inbox_completed'
      ) {
        const key = log.clientTimestamp.slice(0, 10);
        map[key] = (map[key] || 0) + log.quantity;
      }
    }
    return map;
  }, [snapshot.activityLogs]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { day: number | null; dateKey: string | null; count: number }[] = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, dateKey: null, count: 0 });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateKey, count: activityByDay[dateKey] || 0 });
    }
    return cells;
  }, [calendarMonth, activityByDay]);

  const completionEstimate = useMemo(() => {
    if (totals.pending === 0) {
      return tr('All logged pending Qaza prayers are completed.', 'सभी दर्ज बाक़ी क़ज़ा नमाज़ें पूरी हो चुकी हैं।');
    }
    const rate = Math.max(1, previewPace);
    const daysRemaining = Math.ceil(totals.pending / rate);
    const readable = formatReadableDuration(daysRemaining, lang);
    const estDate = new Date(Date.now() + daysRemaining * 86400000);
    const estDateFmt = estDate.toLocaleDateString(lang === 'hi' ? 'hi-IN' : [], {
      month: 'short',
      year: 'numeric',
    });
    return tr(
      `${readable} · around ${estDateFmt} (${daysRemaining.toLocaleString()} days at ${rate}/day)`,
      `${readable} · लगभग ${estDateFmt} (रोज़ ${rate} पढ़ने पर ${daysRemaining.toLocaleString()} दिन)`
    );
  }, [totals.pending, previewPace, lang, tr]);

  const filteredInbox = useMemo(
    () => snapshot.qazaEntries.filter((e) => e.status === inboxFilter),
    [snapshot.qazaEntries, inboxFilter]
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Sub-view Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A]">
          <button
            type="button"
            onClick={() => setSection('tracker')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
              section === 'tracker'
                ? 'bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white'
                : 'text-[#5C635E] dark:text-[#9AA59E] hover:text-[#1A1D1B] dark:hover:text-[#F1F3F2]'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>{tr('Batch Log', 'बैच लॉग')}</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('calculator')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
              section === 'calculator'
                ? 'bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white'
                : 'text-[#5C635E] dark:text-[#9AA59E] hover:text-[#1A1D1B] dark:hover:text-[#F1F3F2]'
            }`}
          >
            <Calculator className="w-4 h-4 shrink-0" />
            <span>{tr('Qaza Calculator', 'क़ज़ा कैलकुलेटर')}</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('pace')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
              section === 'pace'
                ? 'bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white'
                : 'text-[#5C635E] dark:text-[#9AA59E] hover:text-[#1A1D1B] dark:hover:text-[#F1F3F2]'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>{tr('Finish-Time Calculator', 'समय कैलकुलेटर')}</span>
          </button>
        </div>

        <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] font-mono-num">
          {totals.pending.toLocaleString()} {tr('pending', 'बाक़ी')} ·{' '}
          {totals.completed.toLocaleString()} {tr('completed', 'पूरी')}
        </p>
      </div>

      {section === 'calculator' ? (
        <QazaCalculator
          mode="tracker"
          currentPendingTotal={totals.pending}
          onApplyBalances={handleApplyCalculatedBalances}
          onOpenFinishTime={(estimatedTotal) => {
            setPaceBacklogOverride(estimatedTotal);
            setSection('pace');
          }}
        />
      ) : section === 'pace' ? (
        <FinishTimeCalculator
          initialBacklogOverride={paceBacklogOverride}
          onClearOverride={() => setPaceBacklogOverride(null)}
          onOpenEstimator={() => setSection('calculator')}
        />
      ) : (
        <>
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-7 bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {tr('Log Multiple Qaza Prayers', 'एक साथ कई क़ज़ा नमाज़ें दर्ज करें')}
                  </h2>
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                    {tr(
                      'Log several prayers or use a quick bulk preset (1 day, 1 week, 1 month).',
                      'गिनती चुनें या सीधे 1 दिन, 1 हफ़्ता या 1 महीने का प्रीसेट चुनें।'
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: tr('1 Day (5)', '1 दिन (5)'), days: 1 },
                    { label: tr('1 Week (35)', '1 हफ़्ता (35)'), days: 7 },
                    { label: tr('1 Month (150)', '1 महीना (150)'), days: 30 },
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      disabled={totals.pending === 0}
                      onClick={() => applyBulkPreset(preset.days)}
                      className="min-h-[34px] px-2.5 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:border-[#1B4D3E] text-[11px] font-medium whitespace-nowrap disabled:opacity-40"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A] border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl overflow-hidden">
                {PRAYERS.map((p) => {
                  const bal = snapshot.balances[p.id];
                  const count = batchCounts[p.id] || 0;
                  return (
                    <div
                      key={p.id}
                      className="px-4 py-3 flex items-center justify-between gap-3 bg-white dark:bg-[#151C19]"
                    >
                      <div>
                        <p className="text-sm font-medium">{prayerLabel(p.id)}</p>
                        <p className="text-xs text-[#7A827D] font-mono-num">
                          {bal.pendingBalance.toLocaleString()} {tr('pending', 'बाक़ी')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={count <= 0}
                          onClick={() =>
                            setBatchCounts((prev) => ({
                              ...prev,
                              [p.id]: Math.max(0, (prev[p.id] || 0) - 1),
                            }))
                          }
                          aria-label={tr(`Decrease ${p.label} count`, 'कम करें')}
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] disabled:opacity-40"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={bal.pendingBalance}
                          aria-label={`${prayerLabel(p.id)} count`}
                          value={count}
                          onChange={(e) => {
                            const val = Math.max(
                              0,
                              Math.min(bal.pendingBalance, parseInt(e.target.value, 10) || 0)
                            );
                            setBatchCounts((prev) => ({ ...prev, [p.id]: val }));
                          }}
                          className="w-16 min-h-[40px] text-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-sm font-mono-num"
                        />
                        <button
                          type="button"
                          disabled={count >= bal.pendingBalance}
                          onClick={() =>
                            setBatchCounts((prev) => ({
                              ...prev,
                              [p.id]: Math.min(bal.pendingBalance, (prev[p.id] || 0) + 1),
                            }))
                          }
                          aria-label={tr(`Increase ${p.label} count`, 'बढ़ाएं')}
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] disabled:opacity-40"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-xs text-[#5C635E] dark:text-[#9AA59E] font-mono-num">
                  {tr('Selected', 'चुनी गईं')}: {batchTotal.toLocaleString()}{' '}
                  {tr(batchTotal === 1 ? 'prayer' : 'prayers', 'नमाज़ें')}
                </span>
                <div className="flex items-center gap-2">
                  {batchTotal > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setBatchCounts({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 })
                      }
                      className="min-h-[44px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] text-xs font-medium"
                    >
                      {tr('Clear', 'साफ़ करें')}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={batchTotal === 0}
                    onClick={() => void handleApplyBatch()}
                    className="min-h-[44px] px-5 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-sm font-medium hover:bg-[#143B2F] disabled:opacity-40 transition-colors"
                  >
                    {tr('Log Selected Prayers', 'चुनी हुई दर्ज करें')}
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-5">
              <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">{tr('Full Qaza Day', 'पूरा क़ज़ा दिन')}</h2>
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-1">
                    {tr(
                      'Complete 1 Qaza from each of the five daily prayers in a single batch action.',
                      'पांचों नमाज़ों की 1-1 क़ज़ा एक साथ एक क्लिक में दर्ज करें।'
                    )}
                  </p>
                </div>

                {!confirmFullDay ? (
                  <button
                    type="button"
                    disabled={!canDoFullDay}
                    onClick={() => setConfirmFullDay(true)}
                    className="w-full min-h-[46px] rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-sm font-medium hover:bg-[#143B2F] disabled:opacity-40 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{tr('Log 1 Full Qaza Day', '1 पूरा क़ज़ा दिन दर्ज करें')}</span>
                  </button>
                ) : (
                  <div className="p-4 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] space-y-3">
                    <p className="text-xs font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">
                      {tr(
                        `Summary before applying (${fullDayApplicablePrayers.length} prayers):`,
                        `पुष्टि करें (${fullDayApplicablePrayers.length} नमाज़ें):`
                      )}
                    </p>
                    <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                      {fullDayApplicablePrayers.map((p) => `1 ${prayerLabel(p.id)}`).join(' · ')}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleApplyFullDay()}
                        className="flex-1 min-h-[40px] rounded-lg bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs font-medium"
                      >
                        {tr('Confirm & Save', 'पक्का करें और सेव करें')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmFullDay(false)}
                        className="min-h-[40px] px-3 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] text-xs font-medium"
                      >
                        {tr('Cancel', 'रद्द करें')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-3 flex-1">
                <h3 className="text-sm font-semibold">
                  {tr('Active Tracking Routine', 'मौजूदा पढ़ने का तरीक़ा')}
                </h3>
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                  {tr(
                    'Switch anytime without losing your history. Organisational preference only.',
                    'कभी भी बदलें—आपका पिछला रिकॉर्ड सुरक्षित रहेगा।'
                  )}
                </p>
                <div className="space-y-2">
                  {ROUTINE_OPTIONS.slice(0, 4).map((opt) => {
                    const active = snapshot.profile.routine === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => void updatePreferences({ routine: opt.id })}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs transition-colors flex items-center justify-between gap-2 ${
                          active
                            ? 'border-[#1B4D3E] dark:border-[#2A6F5A] bg-[#1B4D3E]/8 dark:bg-[#2A6F5A]/15 font-medium text-[#1B4D3E] dark:text-[#7FD1B2]'
                            : 'border-[#E5E2DC] dark:border-[#242E2A] hover:bg-[#F8F7F4] dark:hover:bg-[#0E1311]'
                        }`}
                      >
                        <span>{routineInfo(opt.id).title}</span>
                        {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {tr('Prayer-Wise Progress', 'नमाज़ के हिसाब से प्रगति')}
                  </h2>
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                    {tr('Completed vs remaining balance across all five prayers.', 'पांचों नमाज़ों में पूरी और बाक़ी संख्या।')}
                  </p>
                </div>
                <span className="text-sm font-mono-num font-semibold text-[#1B4D3E] dark:text-[#7FD1B2]">
                  {totals.pct}% {tr('overall', 'कुल')}
                </span>
              </div>

              <div className="space-y-4">
                {PRAYERS.map((p) => {
                  const b = snapshot.balances[p.id];
                  const denom = b.pendingBalance + b.completedBalance;
                  const pct = denom > 0 ? Math.round((b.completedBalance / denom) * 100) : 0;
                  return (
                    <div key={p.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-sm">{prayerLabel(p.id)}</span>
                        <span className="font-mono-num text-[#5C635E] dark:text-[#9AA59E]">
                          {b.completedBalance.toLocaleString()} {tr('done', 'पूरी')} ·{' '}
                          {b.pendingBalance.toLocaleString()} {tr('left', 'बाक़ी')} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#F1EFE9] dark:bg-[#242E2A] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#1B4D3E] dark:bg-[#2E7D5B] transition-all duration-300"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-[#E5E2DC] dark:border-[#242E2A] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-[#5C635E] dark:text-[#9AA59E]">
                    {tr('Completion Estimate (Not a Deadline)', 'पूरा होने का अंदाज़ा')}
                  </p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 5, 10].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setPreviewPace(rate)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono-num font-medium border transition-colors ${
                          previewPace === rate
                            ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                            : 'border-[#E5E2DC] dark:border-[#242E2A] text-[#5C635E] dark:text-[#9AA59E]'
                        }`}
                      >
                        {rate}/{tr('d', 'दिन')}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-sm font-medium text-[#1A1D1B] dark:text-[#F1F3F2] font-mono-num">
                  {completionEstimate}
                </p>
                <button
                  type="button"
                  onClick={() => setSection('pace')}
                  className="text-xs font-medium text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline"
                >
                  {tr('Open full Finish-Time Calculator →', 'पूरा समय कैलकुलेटर खोलें →')}
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2]" />
                  <h2 className="text-lg font-semibold">
                    {calendarMonth.toLocaleDateString(lang === 'hi' ? 'hi-IN' : [], {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth(
                        (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)
                      )
                    }
                    aria-label={tr('Previous month', 'पिछला महीना')}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] hover:bg-[#F8F7F4] dark:hover:bg-[#0E1311]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth(
                        (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)
                      )
                    }
                    aria-label={tr('Next month', 'अगला महीना')}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] hover:bg-[#F8F7F4] dark:hover:bg-[#0E1311]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center">
                {(lang === 'hi'
                  ? ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि']
                  : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                ).map((day) => (
                  <div key={day} className="text-[11px] font-medium text-[#7A827D] py-1">
                    {day}
                  </div>
                ))}
                {calendarDays.map((cell, idx) => {
                  if (!cell.day) {
                    return <div key={`empty-${idx}`} className="h-9" />;
                  }
                  const active = cell.count > 0;
                  return (
                    <div
                      key={cell.dateKey}
                      title={active ? `${cell.dateKey}: ${cell.count}` : cell.dateKey || ''}
                      className={`h-9 rounded-lg flex flex-col items-center justify-center text-xs font-mono-num border ${
                        cell.count >= 5
                          ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                          : active
                            ? 'bg-[#1B4D3E]/15 dark:bg-[#2E7D5B]/30 text-[#1B4D3E] dark:text-[#7FD1B2] border-[#1B4D3E]/25'
                            : 'bg-[#F8F7F4] dark:bg-[#0E1311] text-[#5C635E] dark:text-[#9AA59E] border-transparent'
                      }`}
                    >
                      <span>{cell.day}</span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-[#E5E2DC] dark:border-[#242E2A] space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#B88E44]" />
                  <h3 className="text-sm font-semibold">{tr('Milestones', 'उपलब्धियां')}</h3>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {MILESTONES.map((m) => {
                    const reached = totals.completed >= m;
                    return (
                      <div
                        key={m}
                        className={`py-2.5 px-2 rounded-xl border text-center ${
                          reached
                            ? 'border-[#B88E44]/50 bg-[#B88E44]/10 text-[#1A1D1B] dark:text-[#F1F3F2]'
                            : 'border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-[#7A827D]'
                        }`}
                      >
                        <p className="text-xs font-mono-num font-semibold">{m.toLocaleString()}</p>
                        <p className="text-[10px] mt-0.5">
                          {reached ? tr('Reached', 'पूरा') : tr('Goal', 'लक्ष्य')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {tr('Qaza Inbox Queue', 'क़ज़ा इनबॉक्स कतार')}
                </h2>
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                  {tr(
                    'Newly missed prayers kept separate from your historical balance.',
                    'हाल ही में छूटी हुई नमाज़ें पुराने हिसाब से अलग रखी जाती हैं।'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A]">
                {(['pending', 'completed'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setInboxFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                      inboxFilter === tab
                        ? 'bg-white dark:bg-[#151C19] text-[#1A1D1B] dark:text-[#F1F3F2] shadow-sm'
                        : 'text-[#5C635E] dark:text-[#9AA59E]'
                    }`}
                  >
                    {tab === 'pending' ? tr('Pending', 'बाक़ी') : tr('Completed', 'पूरी')}
                  </button>
                ))}
              </div>
            </div>

            {filteredInbox.length === 0 ? (
              <p className="text-sm text-[#7A827D] py-6 text-center bg-[#F8F7F4] dark:bg-[#0E1311] rounded-xl">
                {inboxFilter === 'pending'
                  ? tr('No pending inbox entries.', 'इनबॉक्स में कोई बाक़ी नमाज़ नहीं।')
                  : tr('No completed inbox entries.', 'अभी कोई पूरी की गई इनबॉक्स नमाज़ नहीं।')}
              </p>
            ) : (
              <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A] border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl overflow-hidden">
                {filteredInbox.map((entry) => (
                  <div
                    key={entry.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 bg-white dark:bg-[#151C19]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {prayerLabel(entry.prayerType)}
                        <span className="ml-2 text-xs font-normal text-[#7A827D]">
                          · {tr('Added', 'जोड़ी गई')}{' '}
                          {new Date(entry.dateAdded).toLocaleString(lang === 'hi' ? 'hi-IN' : [])}
                          {entry.completedAt
                            ? ` · ${tr('Completed', 'पूरी')} ${new Date(entry.completedAt).toLocaleString(lang === 'hi' ? 'hi-IN' : [])}`
                            : ''}
                        </span>
                      </p>
                      {entry.note && (
                        <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-0.5 truncate">
                          {entry.note}
                        </p>
                      )}
                    </div>
                    {entry.status === 'pending' ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => void completeInboxEntry(entry.id)}
                          className="min-h-[40px] px-3 rounded-lg bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs font-medium"
                        >
                          {tr('Complete', 'पूरी करें')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeInboxEntry(entry.id)}
                          aria-label={tr(`Remove ${entry.prayerType}`, 'हटाएं')}
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] text-[#7A827D] hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-[#2E7D5B] dark:text-[#7FD1B2] shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{tr('Done', 'पूरा')}</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
