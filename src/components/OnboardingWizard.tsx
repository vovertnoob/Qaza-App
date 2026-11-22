import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Calculator, Check, Cloud } from 'lucide-react';
import { useQaza } from '../context/QazaContext';
import { QazaCalculator } from './QazaCalculator';
import { PWAInstallButton } from './PWAInstallButton';
import {
  PRAYERS,
  ROUTINE_OPTIONS,
  type FocusPrayer,
  type PrayerType,
  type RoutineType,
  type TargetType,
} from '../types/qaza';

interface OnboardingWizardProps {
  onOpenAuth: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onOpenAuth }) => {
  const { user, completeOnboarding } = useQaza();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [saving, setSaving] = useState(false);

  const [balances, setBalances] = useState<Record<PrayerType, number>>({
    fajr: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  });
  const [sharedEstimate, setSharedEstimate] = useState<string>('');
  const [routine, setRoutine] = useState<RoutineType>('after_each_prayer');
  const [targetPreset, setTargetPreset] = useState<
    '1_day' | '2_day' | '5_day' | '1_full_week' | 'custom' | 'skip'
  >('2_day');
  const [customTargetType, setCustomTargetType] = useState<TargetType>('daily');
  const [customTargetCount, setCustomTargetCount] = useState<number>(3);
  const [focusPrayer, setFocusPrayer] = useState<FocusPrayer>('fajr');
  const [showCalculator, setShowCalculator] = useState<boolean>(false);

  const applySameToAll = (valStr: string) => {
    setSharedEstimate(valStr);
    const num = Math.max(0, Math.min(1000000, parseInt(valStr, 10) || 0));
    setBalances({
      fajr: num,
      dhuhr: num,
      asr: num,
      maghrib: num,
      isha: num,
    });
  };

  const resolveTarget = (): { targetType: TargetType; targetCount: number } => {
    switch (targetPreset) {
      case '1_day':
        return { targetType: 'daily', targetCount: 1 };
      case '2_day':
        return { targetType: 'daily', targetCount: 2 };
      case '5_day':
        return { targetType: 'daily', targetCount: 5 };
      case '1_full_week':
        return { targetType: 'weekly', targetCount: 5 };
      case 'custom':
        return { targetType: customTargetType, targetCount: Math.max(1, customTargetCount) };
      case 'skip':
        return { targetType: 'none', targetCount: 0 };
    }
  };

  const totalPending = PRAYERS.reduce((sum, p) => sum + (balances[p.id] || 0), 0);

  const handleFinish = async () => {
    setSaving(true);
    try {
      const { targetType, targetCount } = resolveTarget();
      await completeOnboarding({
        initialBalances: balances,
        routine,
        targetType,
        targetCount,
        focusPrayer: routine === 'one_prayer_at_a_time' ? focusPrayer : 'none',
        startSmallMode: targetCount <= 2 || targetPreset === 'skip',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] dark:bg-[#0E1311] text-[#1A1D1B] dark:text-[#F1F3F2] flex flex-col">
      <header className="w-full border-b border-[#E5E2DC] dark:border-[#242E2A] bg-white/80 dark:bg-[#151C19]/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-5 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <img src="/icon.svg" alt="" className="w-7 h-7 rounded-lg" />
            <span className="font-display font-semibold text-base tracking-tight">QazaFlow</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <PWAInstallButton compact />
            {!user && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-2.5 sm:px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] text-xs font-medium text-[#1A1D1B] dark:text-[#F1F3F2] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] transition-colors whitespace-nowrap shrink-0"
              >
                <Cloud className="w-3.5 h-3.5 text-[#1B4D3E] dark:text-[#7FD1B2]" />
                <span>Sign In</span>
              </button>
            )}
            <span className="text-xs font-mono-num text-[#5C635E] dark:text-[#9AA59E] whitespace-nowrap">
              <span className="hidden sm:inline">Step </span>
              {step}
              <span className="hidden sm:inline"> of 5</span>
              <span className="sm:hidden">/5</span>
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 sm:p-10 space-y-8">
          {/* Progress Bar */}
          <div className="h-1.5 w-full rounded-full bg-[#F1EFE9] dark:bg-[#242E2A] overflow-hidden">
            <div
              className="h-full bg-[#1B4D3E] dark:bg-[#2A6F5A] transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
                  Your Qaza journey, made easier.
                </h1>
                <p className="text-base text-[#5C635E] dark:text-[#9AA59E] leading-relaxed max-w-xl">
                  Keep track of your pending prayers, build a manageable routine, and see your
                  progress over time.
                </p>
              </div>

              <div className="border-t border-[#E5E2DC] dark:border-[#242E2A] pt-5 grid sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">Know what remains</p>
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-1">
                    Track Fajr, Dhuhr, Asr, Maghrib, and Isha separately.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">Log it in seconds</p>
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-1">
                    One-tap completion, undo support, and offline saving.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">Keep moving forward</p>
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-1">
                    No guilt, no streak penalties, pick up anytime.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="min-h-[48px] px-7 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-sm font-medium hover:bg-[#143B2F] transition-colors inline-flex items-center gap-2"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                {!user && (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="text-sm text-[#5C635E] dark:text-[#9AA59E] hover:text-[#1A1D1B] dark:hover:text-[#F1F3F2] underline-offset-4 hover:underline"
                  >
                    Already have an account? Sign in
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Estimate your starting Qaza balance
                  </h2>
                  <p className="text-sm text-[#5C635E] dark:text-[#9AA59E]">
                    Enter an estimate, calculate by age, or skip for now. You can edit any balance
                    anytime in Settings.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCalculator((v) => !v)}
                  className="min-h-[40px] px-3.5 rounded-xl border border-[#1B4D3E]/30 dark:border-[#2A6F5A]/50 bg-[#1B4D3E]/8 dark:bg-[#2A6F5A]/15 text-[#1B4D3E] dark:text-[#7FD1B2] text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Calculator className="w-4 h-4" />
                  <span>{showCalculator ? 'Hide Calculator' : 'Calculate by Age'}</span>
                </button>
              </div>

              {showCalculator && (
                <QazaCalculator
                  mode="onboarding"
                  onApplyBalances={(perPrayer) => {
                    setBalances(perPrayer);
                    const allSame = perPrayer.fajr === perPrayer.dhuhr;
                    setSharedEstimate(allSame ? String(perPrayer.fajr) : '');
                    setShowCalculator(false);
                  }}
                  onClose={() => setShowCalculator(false)}
                />
              )}

              <div className="p-4 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label
                    htmlFor="apply-all-input"
                    className="text-sm font-medium text-[#1A1D1B] dark:text-[#F1F3F2]"
                  >
                    Apply the same estimate to all five
                  </label>
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                    For example, 365 for roughly one year of prayers.
                  </p>
                </div>
                <input
                  id="apply-all-input"
                  type="number"
                  min={0}
                  max={1000000}
                  value={sharedEstimate}
                  onChange={(e) => applySameToAll(e.target.value)}
                  placeholder="e.g. 365"
                  className="w-full sm:w-36 min-h-[44px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-sm font-mono-num text-[#1A1D1B] dark:text-[#F1F3F2] focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
                />
              </div>

              <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A] border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl overflow-hidden">
                {PRAYERS.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#151C19]"
                  >
                    <div>
                      <span className="text-sm font-medium">{p.label}</span>
                      <span className="ml-2 text-xs text-[#7A827D]">{p.timeHint}</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={1000000}
                      aria-label={`${p.label} initial pending balance`}
                      value={balances[p.id] === 0 ? '' : balances[p.id]}
                      placeholder="0"
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(1000000, parseInt(e.target.value, 10) || 0));
                        setBalances((prev) => ({ ...prev, [p.id]: v }));
                      }}
                      className="w-28 min-h-[42px] px-3 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-right text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-[#5C635E] dark:text-[#9AA59E]">
                <span>Total starting estimate</span>
                <span className="font-mono-num text-sm font-semibold text-[#1A1D1B] dark:text-[#F1F3F2]">
                  {totalPending.toLocaleString()} prayers
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="min-h-[44px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] text-sm font-medium hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBalances({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 });
                      setStep(3);
                    }}
                    className="min-h-[44px] px-4 rounded-xl text-sm text-[#5C635E] dark:text-[#9AA59E] hover:text-[#1A1D1B] dark:hover:text-[#F1F3F2]"
                  >
                    Skip calculation
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="min-h-[44px] px-6 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-sm font-medium hover:bg-[#143B2F] inline-flex items-center gap-2"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Choose a tracking routine
                </h2>
                <p className="text-sm text-[#5C635E] dark:text-[#9AA59E]">
                  Pick a rhythm that feels sustainable. These are personal tracking preferences, not
                  religious rulings, and you can switch anytime.
                </p>
              </div>

              <div className="space-y-2.5">
                {ROUTINE_OPTIONS.map((opt) => {
                  const selected = routine === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRoutine(opt.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-colors flex items-start justify-between gap-4 ${
                        selected
                          ? 'border-[#1B4D3E] dark:border-[#2A6F5A] bg-[#1B4D3E]/5 dark:bg-[#2A6F5A]/15'
                          : 'border-[#E5E2DC] dark:border-[#242E2A] hover:bg-[#F8F7F4] dark:hover:bg-[#0E1311]'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">
                          {opt.title}
                        </p>
                        <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-0.5">
                          {opt.description}
                        </p>
                      </div>
                      <span
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          selected
                            ? 'bg-[#1B4D3E] border-[#1B4D3E] text-white'
                            : 'border-[#C8C3B8] dark:border-[#3A4741]'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {routine === 'one_prayer_at_a_time' && (
                <div className="p-4 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] space-y-2.5">
                  <label className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E]">
                    Which prayer would you like to focus on first?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRAYERS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setFocusPrayer(p.id)}
                        className={`min-h-[40px] px-3.5 rounded-lg text-xs font-medium border transition-colors ${
                          focusPrayer === p.id
                            ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                            : 'bg-white dark:bg-[#151C19] border-[#E5E2DC] dark:border-[#242E2A] text-[#1A1D1B] dark:text-[#F1F3F2]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="min-h-[44px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] text-sm font-medium hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="min-h-[44px] px-6 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-sm font-medium hover:bg-[#143B2F] inline-flex items-center gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">Set a gentle target</h2>
                <p className="text-sm text-[#5C635E] dark:text-[#9AA59E]">
                  Start small so the habit stays light. You can skip setting a target or adjust it
                  anytime.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5">
                {[
                  { id: '1_day', label: '1 Qaza per day', sub: 'Start Small · Gentle pace' },
                  { id: '2_day', label: '2 Qaza per day', sub: 'Steady daily rhythm' },
                  { id: '5_day', label: '5 Qaza per day', sub: '1 full Qaza day daily' },
                  { id: '1_full_week', label: '1 full Qaza day per week', sub: '5 prayers weekly' },
                  { id: 'custom', label: 'Custom target', sub: 'Choose daily or weekly count' },
                ].map((opt) => {
                  const selected = targetPreset === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTargetPreset(opt.id as typeof targetPreset)}
                      className={`text-left p-4 rounded-xl border transition-colors ${
                        selected
                          ? 'border-[#1B4D3E] dark:border-[#2A6F5A] bg-[#1B4D3E]/5 dark:bg-[#2A6F5A]/15'
                          : 'border-[#E5E2DC] dark:border-[#242E2A] hover:bg-[#F8F7F4] dark:hover:bg-[#0E1311]'
                      }`}
                    >
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-0.5">{opt.sub}</p>
                    </button>
                  );
                })}
              </div>

              {targetPreset === 'custom' && (
                <div className="p-4 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] flex flex-wrap items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={customTargetCount}
                    onChange={(e) =>
                      setCustomTargetCount(Math.max(1, Math.min(500, parseInt(e.target.value, 10) || 1)))
                    }
                    className="w-24 min-h-[42px] px-3 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] font-mono-num text-sm"
                  />
                  <span className="text-sm text-[#5C635E] dark:text-[#9AA59E]">prayers per</span>
                  <div className="flex rounded-lg bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] p-1">
                    {(['daily', 'weekly'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCustomTargetType(t)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                          customTargetType === t
                            ? 'bg-[#1B4D3E] text-white'
                            : 'text-[#5C635E] dark:text-[#9AA59E]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="min-h-[44px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] text-sm font-medium hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetPreset('skip');
                      setStep(5);
                    }}
                    className="min-h-[44px] px-4 rounded-xl text-sm text-[#5C635E] dark:text-[#9AA59E] hover:text-[#1A1D1B]"
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className="min-h-[44px] px-6 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-sm font-medium hover:bg-[#143B2F] inline-flex items-center gap-2"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Ready to start tracking
                </h2>
                <p className="text-sm text-[#5C635E] dark:text-[#9AA59E]">
                  Here is your starting setup. Everything saves automatically and works even offline.
                </p>
              </div>

              <div className="rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] divide-y divide-[#E5E2DC] dark:divide-[#242E2A]">
                <div className="p-4 flex items-center justify-between text-sm">
                  <span className="text-[#5C635E] dark:text-[#9AA59E]">Starting Balance</span>
                  <span className="font-mono-num font-semibold">
                    {totalPending.toLocaleString()} prayers
                  </span>
                </div>
                <div className="p-4 flex items-center justify-between text-sm">
                  <span className="text-[#5C635E] dark:text-[#9AA59E]">Tracking Routine</span>
                  <span className="font-medium">
                    {ROUTINE_OPTIONS.find((r) => r.id === routine)?.title}
                  </span>
                </div>
                <div className="p-4 flex items-center justify-between text-sm">
                  <span className="text-[#5C635E] dark:text-[#9AA59E]">Target Pace</span>
                  <span className="font-mono-num font-medium">
                    {resolveTarget().targetType === 'none'
                      ? 'Flexible (no fixed target)'
                      : `${resolveTarget().targetCount} ${resolveTarget().targetType}`}
                  </span>
                </div>
              </div>

              {!user && (
                <div className="p-4 rounded-xl border border-[#B88E44]/35 bg-[#B88E44]/8 text-xs text-[#5C635E] dark:text-[#C7B99B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span>
                    You are currently in Local Guest mode. Sign in anytime to enable automatic cloud
                    backup across devices.
                  </span>
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="font-medium text-[#1B4D3E] dark:text-[#7FD1B2] underline whitespace-nowrap shrink-0"
                  >
                    Sign in now
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="min-h-[44px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] text-sm font-medium hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleFinish()}
                  className="min-h-[48px] px-7 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-sm font-medium hover:bg-[#143B2F] transition-colors inline-flex items-center gap-2 disabled:opacity-60"
                >
                  <span>{saving ? 'Setting up...' : 'Go to Home Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
