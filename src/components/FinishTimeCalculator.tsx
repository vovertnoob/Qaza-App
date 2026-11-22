import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2, Clock, Minus, Plus, Target } from 'lucide-react';
import { useQaza } from '../context/QazaContext';

interface FinishTimeCalculatorProps {
  initialBacklogOverride?: number | null;
  onClearOverride?: () => void;
  onOpenEstimator?: () => void;
}

function diffCalendarYMD(
  start: Date,
  totalDays: number
): { years: number; months: number; days: number; estDate: Date | null } {
  if (totalDays <= 0) {
    return { years: 0, months: 0, days: 0, estDate: start };
  }
  // Safe cap for JS Date arithmetic (~150 years = 54,787 days)
  if (totalDays > 54787) {
    const years = Math.floor(totalDays / 365.25);
    const remDays = totalDays - Math.round(years * 365.25);
    const months = Math.floor(remDays / 30.4375);
    const days = Math.max(0, Math.round(remDays - months * 30.4375));
    return { years, months, days, estDate: null };
  }

  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + totalDays);
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    const prevMonthLastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthLastDay;
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
    estDate: end,
  };
}

export function formatReadableDuration(totalDays: number): string {
  if (totalDays <= 0) return '0 days';
  const { years, months, days } = diffCalendarYMD(new Date(), totalDays);
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  if (days > 0 && years < 5) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  if (parts.length === 0) return `${totalDays} ${totalDays === 1 ? 'day' : 'days'}`;
  return parts.join(', ');
}

const PRESET_PACES = [
  { rate: 1, label: '1 / day', hint: 'Gentle start' },
  { rate: 2, label: '2 / day', hint: 'Steady' },
  { rate: 3, label: '3 / day', hint: 'Balanced' },
  { rate: 5, label: '5 / day', hint: '1 full Qaza day' },
  { rate: 10, label: '10 / day', hint: '2 full Qaza days' },
  { rate: 15, label: '15 / day', hint: 'Accelerated' },
];

export const FinishTimeCalculator: React.FC<FinishTimeCalculatorProps> = ({
  initialBacklogOverride = null,
  onClearOverride,
  onOpenEstimator,
}) => {
  const { snapshot, updatePreferences } = useQaza();

  const currentPendingTotal = useMemo(
    () =>
      Object.values(snapshot.balances).reduce((sum, b) => sum + b.pendingBalance, 0),
    [snapshot.balances]
  );

  const [backlogSource, setBacklogSource] = useState<'current' | 'custom'>(() =>
    initialBacklogOverride && initialBacklogOverride > 0
      ? 'custom'
      : currentPendingTotal > 0
        ? 'current'
        : 'custom'
  );
  const [customBacklogText, setCustomBacklogText] = useState<string>(() =>
    String(
      initialBacklogOverride && initialBacklogOverride > 0
        ? initialBacklogOverride
        : currentPendingTotal > 0
          ? currentPendingTotal
          : 5000
    )
  );
  const customBacklog = Math.max(0, Math.min(200000, parseInt(customBacklogText, 10) || 0));

  const [paceText, setPaceText] = useState<string>(() =>
    String(
      snapshot.profile.targetType === 'daily' && snapshot.profile.targetCount > 0
        ? snapshot.profile.targetCount
        : 5
    )
  );
  const pacePerDay = Math.max(1, Math.min(100, parseInt(paceText, 10) || 1));
  const setPacePerDay = (next: number | ((prev: number) => number)) => {
    const resolved = typeof next === 'function' ? next(pacePerDay) : next;
    setPaceText(String(Math.max(1, Math.min(100, resolved))));
  };

  const [daysPerWeek, setDaysPerWeek] = useState<number>(7);
  const [goalSavedMsg, setGoalSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialBacklogOverride && initialBacklogOverride > 0) {
      setBacklogSource('custom');
      setCustomBacklogText(String(initialBacklogOverride));
    }
  }, [initialBacklogOverride]);

  const activeBacklog =
    backlogSource === 'current' ? currentPendingTotal : customBacklog;

  const computePlan = (backlog: number, dailyRate: number, activeDaysPerWeek: number) => {
    if (backlog <= 0) {
      return {
        totalDays: 0,
        decimalYears: '0.0',
        weeklyPrayers: 0,
        monthlyPrayers: 0,
        readable: '0 days',
        estDateStr: 'Completed',
      };
    }
    const safeDaily = Math.max(1, dailyRate);
    const safeWeekDays = Math.max(1, Math.min(7, activeDaysPerWeek));
    const effectiveDailyAvg = (safeDaily * safeWeekDays) / 7;
    const totalDays = Math.ceil(backlog / effectiveDailyAvg);
    const decimalYears = (totalDays / 365.25).toFixed(1);
    const weeklyPrayers = safeDaily * safeWeekDays;
    const monthlyPrayers = Math.round(effectiveDailyAvg * 30.4375);

    const { estDate } = diffCalendarYMD(new Date(), totalDays);
    const estDateStr = estDate
      ? estDate.toLocaleDateString([], { month: 'short', year: 'numeric' })
      : `~${Math.round(totalDays / 365.25)} yrs out`;

    return {
      totalDays,
      decimalYears,
      weeklyPrayers,
      monthlyPrayers,
      readable: formatReadableDuration(totalDays),
      estDateStr,
    };
  };

  const primaryResult = useMemo(
    () => computePlan(activeBacklog, pacePerDay, daysPerWeek),
    [activeBacklog, pacePerDay, daysPerWeek]
  );

  const comparisonRows = useMemo(() => {
    const rates = Array.from(new Set([1, 2, 3, 5, 10, 15, pacePerDay])).sort((a, b) => a - b);
    return rates.map((rate) => ({
      rate,
      isSelected: rate === pacePerDay,
      ...computePlan(activeBacklog, rate, daysPerWeek),
    }));
  }, [activeBacklog, pacePerDay, daysPerWeek]);

  const handleSaveAsGoal = async () => {
    const safePace = Math.max(1, Math.min(100, pacePerDay));
    await updatePreferences({
      targetType: 'daily',
      targetCount: safePace,
    });
    setGoalSavedMsg(`Saved ${safePace} prayers/day as your daily goal.`);
    window.setTimeout(() => setGoalSavedMsg(null), 4000);
  };

  return (
    <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-[#1B4D3E] dark:text-[#7FD1B2]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Finish-Time &amp; Pace Calculator</h2>
            <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
              See how many years it will take to finish your Qaza backlog based on how many prayers you do each day.
            </p>
          </div>
        </div>

        {/* Backlog Source Switch */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A]">
          <button
            type="button"
            onClick={() => {
              setBacklogSource('current');
              onClearOverride?.();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              backlogSource === 'current'
                ? 'bg-white dark:bg-[#151C19] text-[#1A1D1B] dark:text-[#F1F3F2] shadow-sm'
                : 'text-[#5C635E] dark:text-[#9AA59E]'
            }`}
          >
            My Pending ({currentPendingTotal.toLocaleString()})
          </button>
          <button
            type="button"
            onClick={() => setBacklogSource('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              backlogSource === 'custom'
                ? 'bg-white dark:bg-[#151C19] text-[#1A1D1B] dark:text-[#F1F3F2] shadow-sm'
                : 'text-[#5C635E] dark:text-[#9AA59E]'
            }`}
          >
            Custom Backlog
          </button>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Controls */}
        <div className="lg:col-span-6 space-y-5">
          {/* Backlog Box */}
          <div className="p-4 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="finish-backlog-input"
                className="text-xs font-medium text-[#5C635E] dark:text-[#9AA59E]"
              >
                {backlogSource === 'current'
                  ? 'Your current pending Qaza backlog'
                  : 'Enter backlog size to test (total prayers)'}
              </label>
              {initialBacklogOverride && backlogSource === 'custom' && (
                <span className="text-[11px] font-medium text-[#1B4D3E] dark:text-[#7FD1B2]">
                  From Qaza Calculator
                </span>
              )}
            </div>

            {backlogSource === 'current' ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-2xl font-semibold font-mono-num">
                  {currentPendingTotal.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-[#5C635E] dark:text-[#9AA59E]">
                    prayers
                  </span>
                </p>
                {currentPendingTotal === 0 && onOpenEstimator && (
                  <button
                    type="button"
                    onClick={onOpenEstimator}
                    className="text-xs font-medium text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline whitespace-nowrap"
                  >
                    Estimate my Qaza →
                  </button>
                )}
              </div>
            ) : (
              <input
                id="finish-backlog-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={customBacklogText}
                placeholder="0"
                onChange={(e) =>
                  setCustomBacklogText(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                onBlur={() => {
                  const n = parseInt(customBacklogText, 10);
                  setCustomBacklogText(
                    String(Number.isNaN(n) ? 0 : Math.max(0, Math.min(200000, n)))
                  );
                }}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] font-mono-num text-base font-medium"
              />
            )}
          </div>

          {/* Daily Pace Stepper & Presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="finish-daily-pace"
                className="text-xs font-medium text-[#1A1D1B] dark:text-[#F1F3F2]"
              >
                Qaza prayers you plan to pray each day
              </label>
              <span className="text-[11px] text-[#7A827D] font-mono-num">
                {pacePerDay === 5
                  ? '1 full Qaza day / day'
                  : pacePerDay === 10
                    ? '2 full Qaza days / day'
                    : `${pacePerDay} per day`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPacePerDay((p) => Math.max(1, p - 1))}
                aria-label="Decrease daily Qaza prayers"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:border-[#1B4D3E] transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                id="finish-daily-pace"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={paceText}
                placeholder="1"
                onChange={(e) =>
                  setPaceText(e.target.value.replace(/\D/g, '').slice(0, 3))
                }
                onBlur={() => {
                  const n = parseInt(paceText, 10);
                  setPaceText(String(Number.isNaN(n) ? 1 : Math.max(1, Math.min(100, n))));
                }}
                className="flex-1 min-h-[44px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-center font-mono-num text-lg font-semibold"
              />
              <button
                type="button"
                onClick={() => setPacePerDay((p) => Math.min(100, p + 1))}
                aria-label="Increase daily Qaza prayers"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:border-[#1B4D3E] transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_PACES.map((preset) => {
                const active = pacePerDay === preset.rate;
                return (
                  <button
                    key={preset.rate}
                    type="button"
                    onClick={() => setPacePerDay(preset.rate)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-left transition-colors ${
                      active
                        ? 'border-[#1B4D3E] dark:border-[#2A6F5A] bg-[#1B4D3E]/8 dark:bg-[#2A6F5A]/15'
                        : 'border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] hover:border-[#C8C3B8]'
                    }`}
                  >
                    <p className="text-xs font-semibold font-mono-num text-[#1A1D1B] dark:text-[#F1F3F2]">
                      {preset.label}
                    </p>
                    <p className="text-[11px] text-[#7A827D] truncate">{preset.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Days per week consistency selector */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#5C635E] dark:text-[#9AA59E]">
                How many days a week?
              </span>
              <span className="font-mono-num text-[#1A1D1B] dark:text-[#F1F3F2]">
                {daysPerWeek === 7 ? 'Every day' : `${daysPerWeek} days / week`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { days: 7, label: '7 days' },
                { days: 6, label: '6 days' },
                { days: 5, label: '5 days' },
                { days: 2, label: 'Weekends (2)' },
              ].map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setDaysPerWeek(opt.days)}
                  className={`min-h-[40px] px-2 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap ${
                    daysPerWeek === opt.days
                      ? 'border-[#1B4D3E] bg-[#1B4D3E] text-white dark:border-[#2A6F5A] dark:bg-[#2A6F5A]'
                      : 'border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-[#5C635E] dark:text-[#9AA59E]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Result Column */}
        <div className="lg:col-span-6 rounded-2xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] p-5 space-y-5">
          {activeBacklog === 0 ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-base font-semibold">No pending backlog selected</p>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                Switch to &ldquo;Custom Backlog&rdquo; above to test any number, or estimate your pending Qaza first.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                  At{' '}
                  <span className="font-semibold text-[#1A1D1B] dark:text-[#F1F3F2] font-mono-num">
                    {pacePerDay} {pacePerDay === 1 ? 'prayer' : 'prayers'}/day
                  </span>{' '}
                  ({daysPerWeek === 7 ? 'every day' : `${daysPerWeek} days/week`}) for{' '}
                  <span className="font-mono-num">{activeBacklog.toLocaleString()}</span> prayers:
                </p>
                <p className="text-2xl sm:text-3xl font-semibold tracking-tight font-mono-num text-[#1B4D3E] dark:text-[#7FD1B2]">
                  {primaryResult.readable}
                </p>
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] font-mono-num">
                  ~{primaryResult.decimalYears} years · {primaryResult.totalDays.toLocaleString()}{' '}
                  days total
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#E5E2DC] dark:border-[#242E2A]">
                <div>
                  <p className="text-[11px] text-[#7A827D]">Est. Finish</p>
                  <p className="text-sm font-semibold font-mono-num mt-0.5 flex items-center gap-1">
                    <CalendarCheck className="w-3.5 h-3.5 text-[#1B4D3E] dark:text-[#7FD1B2] shrink-0" />
                    <span>{primaryResult.estDateStr}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#7A827D]">Per Week</p>
                  <p className="text-sm font-semibold font-mono-num mt-0.5">
                    {primaryResult.weeklyPrayers.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#7A827D]">Per Month</p>
                  <p className="text-sm font-semibold font-mono-num mt-0.5">
                    ~{primaryResult.monthlyPrayers.toLocaleString()}
                  </p>
                </div>
              </div>

              {goalSavedMsg && (
                <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{goalSavedMsg}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleSaveAsGoal()}
                className="w-full min-h-[44px] px-4 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs sm:text-sm font-medium hover:bg-[#143B2F] transition-colors inline-flex items-center justify-center gap-2"
              >
                <Target className="w-4 h-4 shrink-0" />
                <span>Set {pacePerDay} / day as My Daily Goal</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Side-by-Side Pace Comparison Table */}
      {activeBacklog > 0 && (
        <div className="pt-2 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-[#1A1D1B] dark:text-[#F1F3F2]">
              Compare Daily Paces (Tap any row to select)
            </h3>
            <span className="text-[11px] text-[#7A827D] font-mono-num">
              Backlog: {activeBacklog.toLocaleString()}
            </span>
          </div>

          <div className="border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F7F4] dark:bg-[#0E1311] border-b border-[#E5E2DC] dark:border-[#242E2A] text-[#5C635E] dark:text-[#9AA59E]">
                  <th className="py-2.5 px-3.5 font-medium">Daily Pace</th>
                  <th className="py-2.5 px-3.5 font-medium text-right">Per Week</th>
                  <th className="py-2.5 px-3.5 font-medium">Time to Finish</th>
                  <th className="py-2.5 px-3.5 font-medium text-right">Est. Finish</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A]">
                {comparisonRows.map((row) => (
                  <tr
                    key={row.rate}
                    onClick={() => setPacePerDay(row.rate)}
                    className={`cursor-pointer transition-colors ${
                      row.isSelected
                        ? 'bg-[#1B4D3E]/8 dark:bg-[#2A6F5A]/20 font-medium'
                        : 'hover:bg-[#F8F7F4]/70 dark:hover:bg-[#0E1311]/60'
                    }`}
                  >
                    <td className="py-2.5 px-3.5 font-mono-num whitespace-nowrap">
                      {row.rate} / day
                      {row.rate === 5 ? ' (1 Qaza day)' : row.rate === 10 ? ' (2 Qaza days)' : ''}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono-num text-right text-[#5C635E] dark:text-[#9AA59E]">
                      {row.weeklyPrayers.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono-num text-[#1B4D3E] dark:text-[#7FD1B2]">
                      {row.readable} ({row.decimalYears} yrs)
                    </td>
                    <td className="py-2.5 px-3.5 font-mono-num text-right whitespace-nowrap text-[#5C635E] dark:text-[#9AA59E]">
                      {row.estDateStr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
