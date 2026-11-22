import React, { useMemo, useState } from 'react';
import { Calculator, Check, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { PRAYERS, type PrayerType } from '../types/qaza';

interface QazaCalculatorProps {
  mode: 'onboarding' | 'tracker';
  currentPendingTotal?: number;
  onApplyBalances: (
    calculatedPerPrayer: Record<PrayerType, number>,
    strategy: 'replace' | 'add',
    summaryNote: string
  ) => Promise<void> | void;
  onOpenFinishTime?: (estimatedTotal: number) => void;
  onClose?: () => void;
}

export const QazaCalculator: React.FC<QazaCalculatorProps> = ({
  mode,
  currentPendingTotal = 0,
  onApplyBalances,
  onOpenFinishTime,
  onClose,
}) => {
  const [inputMode, setInputMode] = useState<'age' | 'duration'>('age');
  const [currentAge, setCurrentAge] = useState<number>(28);
  const [obligationAge, setObligationAge] = useState<number>(13);
  const [startedPrayingRegularlyAge, setStartedPrayingRegularlyAge] = useState<number>(24);
  const [stillNotRegular, setStillNotRegular] = useState<boolean>(false);

  const [durationYears, setDurationYears] = useState<number>(5);
  const [durationMonths, setDurationMonths] = useState<number>(0);

  // Easy-to-understand prayer exemptions (no confusing percentage bar required)
  const [neverMissedJummah, setNeverMissedJummah] = useState<boolean>(false);
  const [prayedAllFiveOnFridays, setPrayedAllFiveOnFridays] = useState<boolean>(false);
  const [neverMissedRamadan, setNeverMissedRamadan] = useState<boolean>(false);

  // Optional advanced refinements
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [calendarBasis, setCalendarBasis] = useState<'solar' | 'lunar'>('solar');
  const [consistencyPct, setConsistencyPct] = useState<number>(0);
  const [monthlyExemptDays, setMonthlyExemptDays] = useState<number>(0);
  const [cautionBufferPct, setCautionBufferPct] = useState<number>(0);

  const [applying, setApplying] = useState(false);
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  const calculation = useMemo(() => {
    const daysPerYear = calendarBasis === 'lunar' ? 354.37 : 365.25;
    let totalYears = 0;

    if (inputMode === 'age') {
      const effectiveEndAge = stillNotRegular ? currentAge : startedPrayingRegularlyAge;
      const clampedStart = Math.max(0, obligationAge);
      const clampedEnd = Math.min(currentAge, Math.max(clampedStart, effectiveEndAge));
      totalYears = Math.max(0, clampedEnd - clampedStart);
    } else {
      totalYears = Math.max(0, durationYears) + Math.max(0, durationMonths) / 12;
    }

    const grossDays = totalYears * daysPerYear;

    // Deduct optional monthly exempt days (scaled cleanly within grossDays)
    const exemptDaysPerYear = Math.max(0, Math.min(15, monthlyExemptDays)) * 12;
    const exemptRatio = grossDays > 0 ? Math.max(0, 1 - (totalYears * exemptDaysPerYear) / grossDays) : 1;
    const obligatoryDays = grossDays * exemptRatio;

    // 1. Ramadan deduction (~30 days per year, scaled if monthly exemptions apply)
    const ramadanDaysDeducted = neverMissedRamadan
      ? Math.min(obligatoryDays, totalYears * 30 * exemptRatio)
      : 0;
    const daysAfterRamadan = Math.max(0, obligatoryDays - ramadanDaysDeducted);

    // 2. Jummah / Friday deduction (calculated on non-Ramadan days so Ramadan Fridays aren't double-deducted)
    const jummahFridaysDeducted = neverMissedJummah ? daysAfterRamadan / 7 : 0;

    const remainingGeneralDays = prayedAllFiveOnFridays && neverMissedJummah
      ? Math.max(0, daysAfterRamadan - jummahFridaysDeducted)
      : daysAfterRamadan;

    const remainingDhuhrDays = neverMissedJummah && !prayedAllFiveOnFridays
      ? Math.max(0, daysAfterRamadan - jummahFridaysDeducted)
      : remainingGeneralDays;

    // 3. Optional additional partial consistency & caution buffer
    const missedRatio = Math.max(0, Math.min(1, 1 - consistencyPct / 100));
    const bufferMult = 1 + cautionBufferPct / 100;

    const baseCount = Math.max(0, Math.round(remainingGeneralDays * missedRatio * bufferMult));
    const dhuhrCount = Math.max(0, Math.round(remainingDhuhrDays * missedRatio * bufferMult));

    const perPrayer: Record<PrayerType, number> = {
      fajr: baseCount,
      dhuhr: dhuhrCount,
      asr: baseCount,
      maghrib: baseCount,
      isha: baseCount,
    };

    const totalPrayers = baseCount * 4 + dhuhrCount;

    return {
      totalYears: Number(totalYears.toFixed(1)),
      grossDaysRounded: Math.round(grossDays),
      ramadanDaysRounded: Math.round(ramadanDaysDeducted),
      jummahFridaysRounded: Math.round(jummahFridaysDeducted),
      baseDaysRounded: baseCount,
      dhuhrDaysRounded: dhuhrCount,
      totalPrayers,
      perPrayer,
    };
  }, [
    inputMode,
    currentAge,
    obligationAge,
    startedPrayingRegularlyAge,
    stillNotRegular,
    durationYears,
    durationMonths,
    neverMissedJummah,
    prayedAllFiveOnFridays,
    neverMissedRamadan,
    calendarBasis,
    consistencyPct,
    monthlyExemptDays,
    cautionBufferPct,
  ]);

  const formatDurationEstimate = (dailyRate: number): string => {
    if (calculation.totalPrayers === 0) return '0 days';
    const days = Math.ceil(calculation.totalPrayers / dailyRate);
    if (days < 60) return `~${days} days`;
    const months = Math.round(days / 30.4);
    if (months < 24) return `~${months} months`;
    const years = (days / 365.25).toFixed(1);
    return `~${years} years`;
  };

  const handleApply = async (strategy: 'replace' | 'add') => {
    setApplying(true);
    try {
      const parts: string[] = [];
      if (inputMode === 'age') {
        parts.push(
          `${calculation.totalYears} yrs (age ${obligationAge} to ${
            stillNotRegular ? currentAge : startedPrayingRegularlyAge
          })`
        );
      } else {
        parts.push(`${durationYears}y ${durationMonths}m`);
      }
      if (neverMissedRamadan) parts.push('excl. Ramadan');
      if (neverMissedJummah) {
        parts.push(prayedAllFiveOnFridays ? 'excl. Fridays' : 'excl. Jummah');
      }
      const summaryNote = `Calculator estimate: ${parts.join(', ')}`;

      await onApplyBalances(calculation.perPrayer, strategy, summaryNote);
      setAppliedBanner(
        strategy === 'replace'
          ? `Applied ${calculation.totalPrayers.toLocaleString()} prayers as your starting balance.`
          : `Added ${calculation.totalPrayers.toLocaleString()} prayers to your pending balance.`
      );
      window.setTimeout(() => setAppliedBanner(null), 4500);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5 text-[#1B4D3E] dark:text-[#7FD1B2]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Qaza Namaz Calculator</h2>
            <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
              Estimate pending Qaza prayers from your age and easily deduct Jummah or Ramadan prayers you never missed.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A]">
          <button
            type="button"
            onClick={() => setInputMode('age')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              inputMode === 'age'
                ? 'bg-white dark:bg-[#151C19] text-[#1A1D1B] dark:text-[#F1F3F2] shadow-sm'
                : 'text-[#5C635E] dark:text-[#9AA59E]'
            }`}
          >
            By Age
          </button>
          <button
            type="button"
            onClick={() => setInputMode('duration')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              inputMode === 'duration'
                ? 'bg-white dark:bg-[#151C19] text-[#1A1D1B] dark:text-[#F1F3F2] shadow-sm'
                : 'text-[#5C635E] dark:text-[#9AA59E]'
            }`}
          >
            By Years & Months
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Inputs Column */}
        <div className="lg:col-span-7 space-y-5">
          {inputMode === 'age' ? (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="calc-current-age"
                    className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1.5"
                  >
                    Your current age
                  </label>
                  <input
                    id="calc-current-age"
                    type="number"
                    min={7}
                    max={110}
                    value={currentAge}
                    onChange={(e) => {
                      const val = Math.max(7, Math.min(110, parseInt(e.target.value, 10) || 7));
                      setCurrentAge(val);
                      if (startedPrayingRegularlyAge > val) setStartedPrayingRegularlyAge(val);
                    }}
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] font-mono-num text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="calc-obligation-age"
                    className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1.5"
                  >
                    Age prayers became obligatory
                  </label>
                  <input
                    id="calc-obligation-age"
                    type="number"
                    min={7}
                    max={30}
                    value={obligationAge}
                    onChange={(e) =>
                      setObligationAge(Math.max(7, Math.min(30, parseInt(e.target.value, 10) || 7)))
                    }
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] font-mono-num text-sm"
                  />
                  <p className="mt-1 text-[11px] text-[#7A827D]">
                    Often estimated around 12–15 depending on maturity.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="calc-regular-age"
                    className="text-xs font-medium text-[#1A1D1B] dark:text-[#F1F3F2]"
                  >
                    Age you started praying regularly
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-[#5C635E] dark:text-[#9AA59E] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stillNotRegular}
                      onChange={(e) => setStillNotRegular(e.target.checked)}
                      className="w-4 h-4 accent-[#1B4D3E]"
                    />
                    <span>Starting now (age {currentAge})</span>
                  </label>
                </div>

                <input
                  id="calc-regular-age"
                  type="number"
                  disabled={stillNotRegular}
                  min={obligationAge}
                  max={currentAge}
                  value={stillNotRegular ? currentAge : startedPrayingRegularlyAge}
                  onChange={(e) =>
                    setStartedPrayingRegularlyAge(
                      Math.max(0, Math.min(currentAge, parseInt(e.target.value, 10) || 0))
                    )
                  }
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] font-mono-num text-sm disabled:opacity-50"
                />
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="calc-duration-years"
                  className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1.5"
                >
                  Missed years
                </label>
                <input
                  id="calc-duration-years"
                  type="number"
                  min={0}
                  max={80}
                  value={durationYears}
                  onChange={(e) =>
                    setDurationYears(Math.max(0, Math.min(80, parseInt(e.target.value, 10) || 0)))
                  }
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] font-mono-num text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="calc-duration-months"
                  className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1.5"
                >
                  Additional months
                </label>
                <input
                  id="calc-duration-months"
                  type="number"
                  min={0}
                  max={11}
                  value={durationMonths}
                  onChange={(e) =>
                    setDurationMonths(Math.max(0, Math.min(11, parseInt(e.target.value, 10) || 0)))
                  }
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] font-mono-num text-sm"
                />
              </div>
            </div>
          )}

          {/* Simple One-Tap Deductions: Jummah & Ramadan */}
          <div className="pt-4 border-t border-[#E5E2DC] dark:border-[#242E2A] space-y-3">
            <div>
              <p className="text-xs font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">
                Prayers you did not miss (Auto-Deduct)
              </p>
              <p className="text-[11px] text-[#7A827D] mt-0.5">
                Select any prayers you consistently kept up during those years.
              </p>
            </div>

            {/* Ramadan Toggle */}
            <button
              type="button"
              onClick={() => setNeverMissedRamadan((v) => !v)}
              aria-pressed={neverMissedRamadan}
              className={`w-full text-left p-3.5 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
                neverMissedRamadan
                  ? 'border-[#1B4D3E] dark:border-[#2A6F5A] bg-[#1B4D3E]/8 dark:bg-[#2A6F5A]/15'
                  : 'border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:border-[#C8C3B8]'
              }`}
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">
                  I never missed prayers in Ramadan
                </p>
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                  Auto-deducts 30 days per year from all 5 prayers
                  {neverMissedRamadan && calculation.ramadanDaysRounded > 0
                    ? ` (−${calculation.ramadanDaysRounded.toLocaleString()} days / −${(
                        calculation.ramadanDaysRounded * 5
                      ).toLocaleString()} prayers)`
                    : ''}
                </p>
              </div>
              <span
                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                  neverMissedRamadan
                    ? 'bg-[#1B4D3E] border-[#1B4D3E] text-white'
                    : 'border-[#C8C3B8] dark:border-[#3A4741] bg-white dark:bg-[#151C19]'
                }`}
              >
                {neverMissedRamadan && <Check className="w-3.5 h-3.5" />}
              </span>
            </button>

            {/* Jummah Toggle */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setNeverMissedJummah((v) => !v)}
                aria-pressed={neverMissedJummah}
                className={`w-full text-left p-3.5 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
                  neverMissedJummah
                    ? 'border-[#1B4D3E] dark:border-[#2A6F5A] bg-[#1B4D3E]/8 dark:bg-[#2A6F5A]/15'
                    : 'border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:border-[#C8C3B8]'
                }`}
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">
                    I never missed a Jummah prayer
                  </p>
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                    Auto-deducts Fridays from Dhuhr (without double-counting Ramadan Fridays)
                    {neverMissedJummah && calculation.jummahFridaysRounded > 0
                      ? ` (−${calculation.jummahFridaysRounded.toLocaleString()} Dhuhr)`
                      : ''}
                  </p>
                </div>
                <span
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                    neverMissedJummah
                      ? 'bg-[#1B4D3E] border-[#1B4D3E] text-white'
                      : 'border-[#C8C3B8] dark:border-[#3A4741] bg-white dark:bg-[#151C19]'
                  }`}
                >
                  {neverMissedJummah && <Check className="w-3.5 h-3.5" />}
                </span>
              </button>

              {neverMissedJummah && (
                <div className="pl-3 sm:pl-4">
                  <div className="inline-flex rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setPrayedAllFiveOnFridays(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        !prayedAllFiveOnFridays
                          ? 'bg-white dark:bg-[#151C19] text-[#1A1D1B] dark:text-[#F1F3F2] shadow-sm'
                          : 'text-[#5C635E] dark:text-[#9AA59E]'
                      }`}
                    >
                      Jummah only (deduct Dhuhr)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrayedAllFiveOnFridays(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        prayedAllFiveOnFridays
                          ? 'bg-white dark:bg-[#151C19] text-[#1A1D1B] dark:text-[#F1F3F2] shadow-sm'
                          : 'text-[#5C635E] dark:text-[#9AA59E]'
                      }`}
                    >
                      All 5 prayers every Friday
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Optional Advanced Refinements Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-xs font-medium text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline"
            >
              {showAdvanced
                ? 'Hide additional refinements'
                : '+ More options (exempt days, Lunar/Solar year, caution buffer)'}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="calc-exempt-days"
                      className="block text-xs text-[#5C635E] dark:text-[#9AA59E] mb-1"
                    >
                      Exempt days / month
                    </label>
                    <input
                      id="calc-exempt-days"
                      type="number"
                      min={0}
                      max={15}
                      value={monthlyExemptDays}
                      onChange={(e) =>
                        setMonthlyExemptDays(
                          Math.max(0, Math.min(15, parseInt(e.target.value, 10) || 0))
                        )
                      }
                      className="w-full min-h-[40px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] font-mono-num text-xs"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="calc-calendar-basis"
                      className="block text-xs text-[#5C635E] dark:text-[#9AA59E] mb-1"
                    >
                      Year length
                    </label>
                    <select
                      id="calc-calendar-basis"
                      value={calendarBasis}
                      onChange={(e) => setCalendarBasis(e.target.value as 'solar' | 'lunar')}
                      className="w-full min-h-[40px] px-2.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-xs"
                    >
                      <option value="solar">Solar (365 days/yr)</option>
                      <option value="lunar">Lunar / Hijri (354 days/yr)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="calc-caution-buffer"
                      className="block text-xs text-[#5C635E] dark:text-[#9AA59E] mb-1"
                    >
                      Caution buffer
                    </label>
                    <select
                      id="calc-caution-buffer"
                      value={cautionBufferPct}
                      onChange={(e) => setCautionBufferPct(parseInt(e.target.value, 10))}
                      className="w-full min-h-[40px] px-2.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-xs"
                    >
                      <option value={0}>None (0%)</option>
                      <option value={5}>+5% buffer</option>
                      <option value={10}>+10% buffer</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="calc-extra-consistency"
                    className="block text-xs text-[#5C635E] dark:text-[#9AA59E] mb-1"
                  >
                    Other prayers offered outside Ramadan/Jummah (optional)
                  </label>
                  <select
                    id="calc-extra-consistency"
                    value={consistencyPct}
                    onChange={(e) => setConsistencyPct(parseInt(e.target.value, 10))}
                    className="w-full sm:w-64 min-h-[40px] px-2.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-xs"
                  >
                    <option value={0}>None (0% additional deduction)</option>
                    <option value={10}>Occasionally (~10%)</option>
                    <option value={25}>About a quarter (~25%)</option>
                    <option value={50}>About half (~50%)</option>
                    <option value={75}>Most of the time (~75%)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Result & Pace Forecast Column */}
        <div className="lg:col-span-5 rounded-2xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] p-5 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">Estimated Period</p>
              <p className="text-base font-semibold font-mono-num">
                {calculation.totalYears} {calculation.totalYears === 1 ? 'year' : 'years'} ·{' '}
                {calculation.grossDaysRounded.toLocaleString()} base days
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">Total Qaza</p>
              <p className="text-2xl font-semibold font-mono-num text-[#1B4D3E] dark:text-[#7FD1B2]">
                {calculation.totalPrayers.toLocaleString()}
              </p>
            </div>
          </div>

          {(neverMissedRamadan || neverMissedJummah) && (
            <div className="text-[11px] text-[#2E7D5B] dark:text-[#7FD1B2] bg-[#1B4D3E]/6 dark:bg-[#2A6F5A]/15 rounded-lg px-3 py-2 font-mono-num">
              {[
                neverMissedRamadan
                  ? `Ramadan: −${calculation.ramadanDaysRounded.toLocaleString()} days/prayer`
                  : null,
                neverMissedJummah
                  ? prayedAllFiveOnFridays
                    ? `Fridays: −${calculation.jummahFridaysRounded.toLocaleString()} days/prayer`
                    : `Jummah: −${calculation.jummahFridaysRounded.toLocaleString()} Dhuhr`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
          )}

          <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A] border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl bg-white dark:bg-[#151C19] overflow-hidden">
            {PRAYERS.map((p) => (
              <div key={p.id} className="px-3.5 py-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium">{p.label}</span>
                  {p.id === 'dhuhr' && neverMissedJummah && !prayedAllFiveOnFridays && (
                    <span className="ml-1.5 text-[11px] text-[#7A827D]">
                      (excl. Jummah)
                    </span>
                  )}
                </div>
                <span className="font-mono-num text-[#1A1D1B] dark:text-[#F1F3F2]">
                  {calculation.perPrayer[p.id].toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Pace Forecast to reduce overwhelm */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">
                <Sparkles className="w-3.5 h-3.5 text-[#B88E44]" />
                <span>Completion Pace Preview</span>
              </div>
              {onOpenFinishTime && calculation.totalPrayers > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenFinishTime(calculation.totalPrayers)}
                  className="text-[11px] font-medium text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline whitespace-nowrap"
                >
                  Custom pace →
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: '2 / day', rate: 2 },
                { label: '5 / day', rate: 5 },
                { label: '10 / day', rate: 10 },
              ].map((pace) => (
                <div
                  key={pace.rate}
                  className="p-2 rounded-lg bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A]"
                >
                  <p className="text-[11px] text-[#7A827D] font-mono-num">{pace.label}</p>
                  <p className="text-xs font-semibold font-mono-num mt-0.5">
                    {formatDurationEstimate(pace.rate)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {appliedBanner && (
            <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{appliedBanner}</span>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={applying}
              onClick={() => void handleApply('replace')}
              className="w-full min-h-[44px] px-4 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs sm:text-sm font-medium hover:bg-[#143B2F] transition-colors disabled:opacity-50"
            >
              {mode === 'onboarding'
                ? 'Use These Estimates'
                : 'Set as My Starting Balance'}
            </button>

            {mode === 'tracker' && currentPendingTotal > 0 && (
              <button
                type="button"
                disabled={applying || calculation.totalPrayers === 0}
                onClick={() => void handleApply('add')}
                className="w-full min-h-[42px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-xs font-medium hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] transition-colors disabled:opacity-50"
              >
                Add to Existing Pending ({currentPendingTotal.toLocaleString()})
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[38px] text-xs text-[#5C635E] dark:text-[#9AA59E] hover:underline"
              >
                Close calculator
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2.5 text-[11px] text-[#7A827D] leading-relaxed pt-2 border-t border-[#E5E2DC] dark:border-[#242E2A]">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          This calculator provides a personal estimation across the five daily prayers (Fajr, Dhuhr,
          Asr, Maghrib, Isha) and does not automatically include Witr. Different scholars and
          schools of thought have specific guidance on age of obligation and makeup prayers—please
          consult a qualified scholar for religious rulings.
        </p>
      </div>
    </div>
  );
};
