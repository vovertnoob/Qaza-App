import React, { useMemo, useState } from 'react';
import { Calculator, Check, CheckCircle2, ChevronDown, Info, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
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

interface AgeFieldProps {
  id: string;
  label: string;
  valueText: string;
  onChangeText: (next: string) => void;
  min: number;
  max: number;
  fallback: number;
  disabled?: boolean;
  inputBgClass?: string;
}

const AgeField: React.FC<AgeFieldProps> = ({
  id,
  label,
  valueText,
  onChangeText,
  min,
  max,
  fallback,
  disabled = false,
  inputBgClass = 'bg-[#F8F7F4] dark:bg-[#0E1311]',
}) => {
  const { tr } = useLanguage();
  const options = useMemo(() => {
    const arr: number[] = [];
    for (let a = min; a <= max; a += 1) arr.push(a);
    return arr;
  }, [min, max]);

  const parsed = parseInt(valueText, 10);
  const inOptions = !Number.isNaN(parsed) && parsed >= min && parsed <= max;

  const handleBlur = () => {
    if (valueText.trim() === '') {
      onChangeText(String(Math.max(min, Math.min(max, fallback))));
      return;
    }
    const n = parseInt(valueText, 10);
    if (Number.isNaN(n)) {
      onChangeText(String(Math.max(min, Math.min(max, fallback))));
    } else {
      onChangeText(String(Math.max(min, Math.min(max, n))));
    }
  };

  return (
    <div
      className={`flex items-stretch rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] ${inputBgClass} focus-within:ring-2 focus-within:ring-[#1B4D3E] overflow-hidden ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={disabled}
        value={valueText}
        placeholder={`${min}–${max}`}
        onChange={(e) => {
          const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 3);
          onChangeText(digitsOnly);
        }}
        onBlur={handleBlur}
        className="w-full min-w-0 min-h-[44px] px-3.5 bg-transparent font-mono-num text-sm focus:outline-none"
      />
      <div className="relative border-l border-[#E5E2DC] dark:border-[#242E2A] shrink-0 flex items-center">
        <select
          aria-label={`${label} dropdown`}
          disabled={disabled}
          value={inOptions ? String(parsed) : ''}
          onChange={(e) => {
            if (e.target.value) onChangeText(e.target.value);
          }}
          className="appearance-none bg-transparent pl-3 pr-7 min-h-[44px] text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] cursor-pointer focus:outline-none"
        >
          <option value="" disabled>
            {tr('Pick', 'चुनें')}
          </option>
          {options.map((age) => (
            <option key={age} value={String(age)}>
              {age} {tr('yrs', 'साल')}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 pointer-events-none absolute right-2 text-[#7A827D]" />
      </div>
    </div>
  );
};

export const QazaCalculator: React.FC<QazaCalculatorProps> = ({
  mode,
  currentPendingTotal = 0,
  onApplyBalances,
  onOpenFinishTime,
  onClose,
}) => {
  const { tr, prayerLabel } = useLanguage();
  const [inputMode, setInputMode] = useState<'age' | 'duration'>('age');
  const [currentAgeText, setCurrentAgeText] = useState<string>('28');
  const [obligationAgeText, setObligationAgeText] = useState<string>('13');
  const [startedRegularAgeText, setStartedRegularAgeText] = useState<string>('24');
  const [stillNotRegular, setStillNotRegular] = useState<boolean>(false);

  const [durationYearsText, setDurationYearsText] = useState<string>('5');
  const [durationMonthsText, setDurationMonthsText] = useState<string>('0');

  const [neverMissedJummah, setNeverMissedJummah] = useState<boolean>(false);
  const [prayedAllFiveOnFridays, setPrayedAllFiveOnFridays] = useState<boolean>(false);
  const [neverMissedRamadan, setNeverMissedRamadan] = useState<boolean>(false);

  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [calendarBasis, setCalendarBasis] = useState<'solar' | 'lunar'>('solar');
  const [consistencyPct, setConsistencyPct] = useState<number>(0);
  const [monthlyExemptDaysText, setMonthlyExemptDaysText] = useState<string>('0');
  const [cautionBufferPct, setCautionBufferPct] = useState<number>(0);

  const [applying, setApplying] = useState(false);
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  const currentAge = Math.max(0, Math.min(110, parseInt(currentAgeText, 10) || 0));
  const obligationAge = Math.max(0, Math.min(30, parseInt(obligationAgeText, 10) || 0));
  const startedPrayingRegularlyAge = Math.max(
    0,
    Math.min(110, parseInt(startedRegularAgeText, 10) || 0)
  );
  const durationYears = Math.max(0, Math.min(80, parseInt(durationYearsText, 10) || 0));
  const durationMonths = Math.max(0, Math.min(11, parseInt(durationMonthsText, 10) || 0));
  const monthlyExemptDays = Math.max(0, Math.min(15, parseInt(monthlyExemptDaysText, 10) || 0));

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
    const exemptDaysPerYear = Math.max(0, Math.min(15, monthlyExemptDays)) * 12;
    const exemptRatio = grossDays > 0 ? Math.max(0, 1 - (totalYears * exemptDaysPerYear) / grossDays) : 1;
    const obligatoryDays = grossDays * exemptRatio;

    const ramadanDaysDeducted = neverMissedRamadan
      ? Math.min(obligatoryDays, totalYears * 30 * exemptRatio)
      : 0;
    const daysAfterRamadan = Math.max(0, obligatoryDays - ramadanDaysDeducted);

    const jummahFridaysDeducted = neverMissedJummah ? daysAfterRamadan / 7 : 0;

    const remainingGeneralDays = prayedAllFiveOnFridays && neverMissedJummah
      ? Math.max(0, daysAfterRamadan - jummahFridaysDeducted)
      : daysAfterRamadan;

    const remainingDhuhrDays = neverMissedJummah && !prayedAllFiveOnFridays
      ? Math.max(0, daysAfterRamadan - jummahFridaysDeducted)
      : remainingGeneralDays;

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
    if (calculation.totalPrayers === 0) return tr('0 days', '0 दिन');
    const days = Math.ceil(calculation.totalPrayers / dailyRate);
    if (days < 60) return tr(`~${days} days`, `~${days} दिन`);
    const months = Math.round(days / 30.4);
    if (months < 24) return tr(`~${months} months`, `~${months} महीने`);
    const years = (days / 365.25).toFixed(1);
    return tr(`~${years} years`, `~${years} साल`);
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
          ? tr(
              `Applied ${calculation.totalPrayers.toLocaleString()} prayers as your starting balance.`,
              `${calculation.totalPrayers.toLocaleString()} नमाज़ें शुरुआती हिसाब में दर्ज हो गईं।`
            )
          : tr(
              `Added ${calculation.totalPrayers.toLocaleString()} prayers to your pending balance.`,
              `${calculation.totalPrayers.toLocaleString()} नमाज़ें आपकी बाक़ी गिनती में जोड़ दी गईं।`
            )
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
            <h2 className="text-lg font-semibold">
              {tr('Qaza Namaz Calculator', 'क़ज़ा नमाज़ कैलकुलेटर')}
            </h2>
            <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
              {tr(
                'Estimate pending Qaza prayers from your age and easily deduct Jummah or Ramadan prayers you never missed.',
                'अपनी उम्र से बाक़ी क़ज़ा का अंदाज़ा लगाएं और जुमा या रमज़ान की पढ़ी हुई नमाज़ें आसानी से घटाएं।'
              )}
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
            {tr('By Age', 'उम्र से')}
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
            {tr('By Years & Months', 'साल और महीनों से')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-5">
          {inputMode === 'age' ? (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="calc-current-age"
                    className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1.5"
                  >
                    {tr('Your current age', 'आपकी मौजूदा उम्र')}
                  </label>
                  <AgeField
                    id="calc-current-age"
                    label={tr('Your current age', 'आपकी मौजूदा उम्र')}
                    valueText={currentAgeText}
                    onChangeText={(next) => {
                      setCurrentAgeText(next);
                      const parsedNext = parseInt(next, 10);
                      if (!Number.isNaN(parsedNext) && parsedNext >= 7 && startedPrayingRegularlyAge > parsedNext) {
                        setStartedRegularAgeText(String(parsedNext));
                      }
                    }}
                    min={7}
                    max={110}
                    fallback={28}
                  />
                </div>

                <div>
                  <label
                    htmlFor="calc-obligation-age"
                    className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1.5"
                  >
                    {tr('Age prayers became obligatory', 'नमाज़ फ़र्ज़ होने की उम्र (बालिग़)')}
                  </label>
                  <AgeField
                    id="calc-obligation-age"
                    label={tr('Age prayers became obligatory', 'बालिग़ होने की उम्र')}
                    valueText={obligationAgeText}
                    onChangeText={setObligationAgeText}
                    min={7}
                    max={30}
                    fallback={13}
                  />
                  <p className="mt-1 text-[11px] text-[#7A827D]">
                    {tr('Often estimated around 12–15 depending on maturity.', 'अक्सर 12–15 साल के आसपास मानी जाती है।')}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="calc-regular-age"
                    className="text-xs font-medium text-[#1A1D1B] dark:text-[#F1F3F2]"
                  >
                    {tr('Age you started praying regularly', 'पाबंदी से नमाज़ शुरू करने की उम्र')}
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-[#5C635E] dark:text-[#9AA59E] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stillNotRegular}
                      onChange={(e) => setStillNotRegular(e.target.checked)}
                      className="w-4 h-4 accent-[#1B4D3E]"
                    />
                    <span>{tr(`Starting now (age ${currentAge || 7})`, `अभी शुरू कर रहे हैं (${currentAge || 7} साल)`)}</span>
                  </label>
                </div>

                <AgeField
                  id="calc-regular-age"
                  label={tr('Age you started praying regularly', 'पाबंदी की उम्र')}
                  disabled={stillNotRegular}
                  valueText={stillNotRegular ? String(currentAge || 7) : startedRegularAgeText}
                  onChangeText={setStartedRegularAgeText}
                  min={Math.max(7, obligationAge || 7)}
                  max={Math.max(7, obligationAge || 7, currentAge || 7)}
                  fallback={Math.min(currentAge || 24, Math.max(obligationAge || 13, 24))}
                  inputBgClass="bg-white dark:bg-[#151C19]"
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
                  {tr('Missed years', 'छूटे हुए साल')}
                </label>
                <input
                  id="calc-duration-years"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={durationYearsText}
                  placeholder="0"
                  onChange={(e) =>
                    setDurationYearsText(e.target.value.replace(/\D/g, '').slice(0, 2))
                  }
                  onBlur={() => {
                    const n = parseInt(durationYearsText, 10);
                    setDurationYearsText(
                      String(Number.isNaN(n) ? 0 : Math.max(0, Math.min(80, n)))
                    );
                  }}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] font-mono-num text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="calc-duration-months"
                  className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1.5"
                >
                  {tr('Additional months', 'अतिरिक्त महीने')}
                </label>
                <input
                  id="calc-duration-months"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={durationMonthsText}
                  placeholder="0"
                  onChange={(e) =>
                    setDurationMonthsText(e.target.value.replace(/\D/g, '').slice(0, 2))
                  }
                  onBlur={() => {
                    const n = parseInt(durationMonthsText, 10);
                    setDurationMonthsText(
                      String(Number.isNaN(n) ? 0 : Math.max(0, Math.min(11, n)))
                    );
                  }}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] font-mono-num text-sm"
                />
              </div>
            </div>
          )}

          {/* Auto-Deduct */}
          <div className="pt-4 border-t border-[#E5E2DC] dark:border-[#242E2A] space-y-3">
            <div>
              <p className="text-xs font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">
                {tr('Prayers you did not miss (Auto-Deduct)', 'जो नमाज़ें आपने नहीं छोड़ीं (अपने आप घटाएं)')}
              </p>
              <p className="text-[11px] text-[#7A827D] mt-0.5">
                {tr(
                  'Select any prayers you consistently kept up during those years.',
                  'अगर आपने उन सालों में रमज़ान या जुमे की नमाज़ें पढ़ी हैं तो चुनें।'
                )}
              </p>
            </div>

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
                  {tr('I never missed prayers in Ramadan', 'मैंने रमज़ान की नमाज़ें कभी नहीं छोड़ीं')}
                </p>
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                  {tr('Auto-deducts 30 days per year from all 5 prayers', 'पांचों नमाज़ों से हर साल के 30 दिन घटाता है')}
                  {neverMissedRamadan && calculation.ramadanDaysRounded > 0
                    ? ` (−${calculation.ramadanDaysRounded.toLocaleString()} ${tr('days', 'दिन')})`
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
                    {tr('I never missed a Jummah prayer', 'मैंने जुमा की नमाज़ कभी नहीं छोड़ी')}
                  </p>
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                    {tr('Auto-deducts Fridays from Dhuhr', 'ज़ुहर से हर जुमे के दिन घटाता है')}
                    {neverMissedJummah && calculation.jummahFridaysRounded > 0
                      ? ` (−${calculation.jummahFridaysRounded.toLocaleString()} ${prayerLabel('dhuhr')})`
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
                      {tr('Jummah only (deduct Dhuhr)', 'सिर्फ़ जुमा (ज़ुहर घटाएं)')}
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
                      {tr('All 5 prayers every Friday', 'जुमे को पांचों नमाज़ें')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Optional Advanced */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-xs font-medium text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline"
            >
              {showAdvanced
                ? tr('Hide additional refinements', 'अतिरिक्त विकल्प छुपाएं')
                : tr(
                    '+ More options (exempt days, Lunar/Solar year, caution buffer)',
                    '+ और विकल्प (माफ़ दिन, चांद/सूरज साल, बफ़र)'
                  )}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="calc-exempt-days"
                      className="block text-xs text-[#5C635E] dark:text-[#9AA59E] mb-1"
                    >
                      {tr('Exempt days / month', 'छूट वाले दिन / महीना')}
                    </label>
                    <input
                      id="calc-exempt-days"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={monthlyExemptDaysText}
                      placeholder="0"
                      onChange={(e) =>
                        setMonthlyExemptDaysText(e.target.value.replace(/\D/g, '').slice(0, 2))
                      }
                      onBlur={() => {
                        const n = parseInt(monthlyExemptDaysText, 10);
                        setMonthlyExemptDaysText(
                          String(Number.isNaN(n) ? 0 : Math.max(0, Math.min(15, n)))
                        );
                      }}
                      className="w-full min-h-[40px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] font-mono-num text-xs"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="calc-calendar-basis"
                      className="block text-xs text-[#5C635E] dark:text-[#9AA59E] mb-1"
                    >
                      {tr('Year length', 'साल का हिसाब')}
                    </label>
                    <select
                      id="calc-calendar-basis"
                      value={calendarBasis}
                      onChange={(e) => setCalendarBasis(e.target.value as 'solar' | 'lunar')}
                      className="w-full min-h-[40px] px-2.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-xs"
                    >
                      <option value="solar">{tr('Solar (365 days/yr)', 'अंग्रेज़ी साल (365 दिन)')}</option>
                      <option value="lunar">{tr('Lunar / Hijri (354 days/yr)', 'इस्लामी / हिजरी (354 दिन)')}</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="calc-caution-buffer"
                      className="block text-xs text-[#5C635E] dark:text-[#9AA59E] mb-1"
                    >
                      {tr('Caution buffer', 'एहतियात बफ़र')}
                    </label>
                    <select
                      id="calc-caution-buffer"
                      value={cautionBufferPct}
                      onChange={(e) => setCautionBufferPct(parseInt(e.target.value, 10))}
                      className="w-full min-h-[40px] px-2.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-xs"
                    >
                      <option value={0}>{tr('None (0%)', 'कोई नहीं (0%)')}</option>
                      <option value={5}>+5%</option>
                      <option value={10}>+10%</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="calc-extra-consistency"
                    className="block text-xs text-[#5C635E] dark:text-[#9AA59E] mb-1"
                  >
                    {tr(
                      'Other prayers offered outside Ramadan/Jummah (optional)',
                      'रमज़ान/जुमे के अलावा जो नमाज़ें पढ़ीं (वैकल्पिक)'
                    )}
                  </label>
                  <select
                    id="calc-extra-consistency"
                    value={consistencyPct}
                    onChange={(e) => setConsistencyPct(parseInt(e.target.value, 10))}
                    className="w-full sm:w-64 min-h-[40px] px-2.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-xs"
                  >
                    <option value={0}>{tr('None (0% additional deduction)', 'कोई नहीं (0%)')}</option>
                    <option value={10}>{tr('Occasionally (~10%)', 'कभी-कभी (~10%)')}</option>
                    <option value={25}>{tr('About a quarter (~25%)', 'लगभग एक चौथाई (~25%)')}</option>
                    <option value={50}>{tr('About half (~50%)', 'लगभग आधी (~50%)')}</option>
                    <option value={75}>{tr('Most of the time (~75%)', 'ज़्यादातर (~75%)')}</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Result Column */}
        <div className="lg:col-span-5 rounded-2xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] p-5 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                {tr('Estimated Period', 'अंदाज़न अवधि')}
              </p>
              <p className="text-base font-semibold font-mono-num">
                {calculation.totalYears} {tr(calculation.totalYears === 1 ? 'year' : 'years', 'साल')} ·{' '}
                {calculation.grossDaysRounded.toLocaleString()} {tr('base days', 'दिन')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                {tr('Total Qaza', 'कुल क़ज़ा')}
              </p>
              <p className="text-2xl font-semibold font-mono-num text-[#1B4D3E] dark:text-[#7FD1B2]">
                {calculation.totalPrayers.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A] border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl bg-white dark:bg-[#151C19] overflow-hidden">
            {PRAYERS.map((p) => (
              <div key={p.id} className="px-3.5 py-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium">{prayerLabel(p.id)}</span>
                  {p.id === 'dhuhr' && neverMissedJummah && !prayedAllFiveOnFridays && (
                    <span className="ml-1.5 text-[11px] text-[#7A827D]">
                      ({tr('excl. Jummah', 'जुमा घटाकर')})
                    </span>
                  )}
                </div>
                <span className="font-mono-num text-[#1A1D1B] dark:text-[#F1F3F2]">
                  {calculation.perPrayer[p.id].toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">
                <Sparkles className="w-3.5 h-3.5 text-[#B88E44]" />
                <span>{tr('Completion Pace Preview', 'पूरा होने की रफ़्तार')}</span>
              </div>
              {onOpenFinishTime && calculation.totalPrayers > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenFinishTime(calculation.totalPrayers)}
                  className="text-[11px] font-medium text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline whitespace-nowrap"
                >
                  {tr('Custom pace →', 'अपनी रफ़्तार चुनें →')}
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: tr('2 / day', '2 / दिन'), rate: 2 },
                { label: tr('5 / day', '5 / दिन'), rate: 5 },
                { label: tr('10 / day', '10 / दिन'), rate: 10 },
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
                ? tr('Use These Estimates', 'यह संख्या इस्तेमाल करें')
                : tr('Set as My Starting Balance', 'इसे शुरुआती हिसाब बनाएं')}
            </button>

            {mode === 'tracker' && currentPendingTotal > 0 && (
              <button
                type="button"
                disabled={applying || calculation.totalPrayers === 0}
                onClick={() => void handleApply('add')}
                className="w-full min-h-[42px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-xs font-medium hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] transition-colors disabled:opacity-50"
              >
                {tr(
                  `Add to Existing Pending (${currentPendingTotal.toLocaleString()})`,
                  `मौजूदा बाक़ी में जोड़ें (${currentPendingTotal.toLocaleString()})`
                )}
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[38px] text-xs text-[#5C635E] dark:text-[#9AA59E] hover:underline"
              >
                {tr('Close calculator', 'कैलकुलेटर बंद करें')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2.5 text-[11px] text-[#7A827D] leading-relaxed pt-2 border-t border-[#E5E2DC] dark:border-[#242E2A]">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          {tr(
            'This calculator provides a personal estimation across the five daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha) and does not automatically include Witr. Consult a qualified scholar for religious rulings.',
            'यह कैलकुलेटर पाँच वक़्त की फ़र्ज़ नमाज़ों का अंदाज़ा लगाता है (इसमें वित्र शामिल नहीं हैं)। शरिया मसाइल के लिए किसी आलिम से मशवरा लें।'
          )}
        </p>
      </div>
    </div>
  );
};
