import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Calculator, Check, Cloud, Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
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
  const { lang, toggleLang, tr, prayerLabel, prayerHint, routineInfo } = useLanguage();
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
  const [customTargetCountText, setCustomTargetCountText] = useState<string>('3');
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
      case 'custom': {
        const parsed = parseInt(customTargetCountText, 10);
        return {
          targetType: customTargetType,
          targetCount: Math.max(1, Math.min(500, Number.isNaN(parsed) ? 1 : parsed)),
        };
      }
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
        <div className="max-w-3xl mx-auto px-3 sm:px-5 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/icon.svg" alt="" className="w-7 h-7 rounded-lg shrink-0" />
            <span className="font-display font-semibold text-sm sm:text-base tracking-tight truncate">
              QazaFlow
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleLang}
              className="inline-flex items-center gap-1 min-h-[36px] px-2 sm:px-2.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] text-xs font-medium hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] whitespace-nowrap shrink-0"
            >
              <Languages className="w-3.5 h-3.5 text-[#1B4D3E] dark:text-[#7FD1B2]" />
              <span className="sm:hidden">{lang === 'en' ? 'हिंदी' : 'EN'}</span>
              <span className="hidden sm:inline">{lang === 'en' ? 'हिंदी' : 'English'}</span>
            </button>
            <PWAInstallButton variant="compact" />
            {!user && (
              <button
                type="button"
                onClick={onOpenAuth}
                aria-label={tr('Sign In', 'साइन इन')}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-2 sm:px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] text-xs font-medium text-[#1A1D1B] dark:text-[#F1F3F2] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] transition-colors whitespace-nowrap shrink-0"
              >
                <Cloud className="w-3.5 h-3.5 text-[#1B4D3E] dark:text-[#7FD1B2]" />
                <span className="hidden sm:inline">{tr('Sign In', 'साइन इन')}</span>
              </button>
            )}
            <span className="text-xs font-mono-num text-[#5C635E] dark:text-[#9AA59E] whitespace-nowrap">
              <span className="sm:hidden">{step}/5</span>
              <span className="hidden sm:inline">{tr(`Step ${step} of 5`, `क़दम ${step}/5`)}</span>
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 gap-4">
        {step === 1 && (
          <div className="w-full max-w-2xl">
            <PWAInstallButton variant="banner" />
          </div>
        )}
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
                  {tr('Your Qaza journey, made easier.', 'आपका क़ज़ा और दीन का सफ़र, अब आसान।')}
                </h1>
                <p className="text-base text-[#5C635E] dark:text-[#9AA59E] leading-relaxed max-w-xl">
                  {tr(
                    'Keep track of your pending prayers, build a manageable routine, and see your progress over time.',
                    'अपनी बाक़ी क़ज़ा नमाज़ों और रोज़ाना दीन की आदतों (तस्बीह, क़ुरआन) का हिसाब बिना किसी झंझट के रखें।'
                  )}
                </p>
              </div>

              <div className="border-t border-[#E5E2DC] dark:border-[#242E2A] pt-5 grid sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">
                    {tr('Know what remains', 'साफ़ हिसाब रखें')}
                  </p>
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-1">
                    {tr(
                      'Track Fajr, Dhuhr, Asr, Maghrib, and Isha separately.',
                      'फ़ज्र, ज़ुहर, अस्र, मग़रिब और इशा का अलग-अलग हिसाब।'
                    )}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">
                    {tr('Log it in seconds', 'कुछ सेकंड में दर्ज करें')}
                  </p>
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-1">
                    {tr(
                      'One-tap completion, undo support, and offline saving.',
                      'एक टैप में पूरा दर्ज करें, ऑफ़लाइन भी सेव होता है।'
                    )}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">
                    {tr('Keep moving forward', 'बिना दबाव आगे बढ़ें')}
                  </p>
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-1">
                    {tr(
                      'No guilt, no streak penalties, pick up anytime.',
                      'कोई तनाव नहीं—अपनी रफ़्तार से जब चाहें आगे बढ़ें।'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="min-h-[48px] px-7 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-sm font-medium hover:bg-[#143B2F] transition-colors inline-flex items-center gap-2"
                >
                  <span>{tr('Get Started', 'शुरू करें')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                {!user && (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="text-sm text-[#5C635E] dark:text-[#9AA59E] hover:text-[#1A1D1B] dark:hover:text-[#F1F3F2] underline-offset-4 hover:underline"
                  >
                    {tr('Already have an account? Sign in', 'पहले से खाता है? साइन इन करें')}
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
                    {tr('Estimate your starting Qaza balance', 'अपनी शुरुआती क़ज़ा नमाज़ों का अंदाज़ा लिखें')}
                  </h2>
                  <p className="text-sm text-[#5C635E] dark:text-[#9AA59E]">
                    {tr(
                      'Enter an estimate, calculate by age, or skip for now. You can edit any balance anytime in Settings.',
                      'संख्या लिखें, उम्र से कैलकुलेट करें या अभी छोड़ दें। बाद में सेटिंग्स से कभी भी बदल सकते हैं।'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCalculator((v) => !v)}
                  className="min-h-[40px] px-3.5 rounded-xl border border-[#1B4D3E]/30 dark:border-[#2A6F5A]/50 bg-[#1B4D3E]/8 dark:bg-[#2A6F5A]/15 text-[#1B4D3E] dark:text-[#7FD1B2] text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Calculator className="w-4 h-4" />
                  <span>
                    {showCalculator
                      ? tr('Hide Calculator', 'कैलकुलेटर छुपाएं')
                      : tr('Calculate by Age', 'उम्र से हिसाब लगाएं')}
                  </span>
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
                    {tr('Apply the same estimate to all five', 'पांचों नमाज़ों में एक जैसी संख्या भरें')}
                  </label>
                  <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                    {tr('For example, 365 for roughly one year of prayers.', 'उदाहरण के लिए लगभग 1 साल के लिए 365 लिखें।')}
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
                      <span className="text-sm font-medium">{prayerLabel(p.id)}</span>
                      <span className="ml-2 text-xs text-[#7A827D]">{prayerHint(p.id)}</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={1000000}
                      aria-label={`${prayerLabel(p.id)} balance`}
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
                <span>{tr('Total starting estimate', 'कुल शुरुआती संख्या')}</span>
                <span className="font-mono-num text-sm font-semibold text-[#1A1D1B] dark:text-[#F1F3F2]">
                  {totalPending.toLocaleString()} {tr('prayers', 'नमाज़ें')}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="min-h-[44px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] text-sm font-medium hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{tr('Back', 'पीछे')}</span>
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
                    {tr('Skip calculation', 'अभी छोड़ें')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="min-h-[44px] px-6 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-sm font-medium hover:bg-[#143B2F] inline-flex items-center gap-2"
                  >
                    <span>{tr('Continue', 'आगे बढ़ें')}</span>
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
                  {tr('Choose a tracking routine', 'पढ़ने का तरीक़ा चुनें')}
                </h2>
                <p className="text-sm text-[#5C635E] dark:text-[#9AA59E]">
                  {tr(
                    'Pick a rhythm that feels sustainable. These are personal tracking preferences, not religious rulings, and you can switch anytime.',
                    'जो तरीक़ा आपको आसान लगे उसे चुनें। आप इसे कभी भी बदल सकते हैं।'
                  )}
                </p>
              </div>

              <div className="space-y-2.5">
                {ROUTINE_OPTIONS.map((opt) => {
                  const selected = routine === opt.id;
                  const info = routineInfo(opt.id);
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
                          {info.title}
                        </p>
                        <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-0.5">
                          {info.description}
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
                    {tr('Which prayer would you like to focus on first?', 'पहले किस नमाज़ से शुरुआत करेंगे?')}
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
                        {prayerLabel(p.id)}
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
                  <span>{tr('Back', 'पीछे')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="min-h-[44px] px-6 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-sm font-medium hover:bg-[#143B2F] inline-flex items-center gap-2"
                >
                  <span>{tr('Continue', 'आगे बढ़ें')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {tr('Set a gentle target', 'रोज़ाना या हफ़्तावार आसान लक्ष्य चुनें')}
                </h2>
                <p className="text-sm text-[#5C635E] dark:text-[#9AA59E]">
                  {tr(
                    'Start small so the habit stays light. You can skip setting a target or adjust it anytime.',
                    'छोटी शुरुआत करें ताकि आदत बनी रहे। आप इसे कभी भी बदल सकते हैं।'
                  )}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: '1_day',
                    label: tr('1 Qaza per day', 'रोज़ 1 क़ज़ा नमाज़'),
                    sub: tr('Start Small · Gentle pace', 'आसान और हल्की शुरुआत'),
                  },
                  {
                    id: '2_day',
                    label: tr('2 Qaza per day', 'रोज़ 2 क़ज़ा नमाज़ें'),
                    sub: tr('Steady daily rhythm', 'नियमित रोज़ाना रफ़्तार'),
                  },
                  {
                    id: '5_day',
                    label: tr('5 Qaza per day', 'रोज़ 5 क़ज़ा नमाज़ें'),
                    sub: tr('1 full Qaza day daily', 'रोज़ 1 पूरा क़ज़ा दिन'),
                  },
                  {
                    id: '1_full_week',
                    label: tr('1 full Qaza day per week', 'हफ़्ते में 1 पूरा क़ज़ा दिन'),
                    sub: tr('5 prayers weekly', 'हफ़्ते में 5 नमाज़ें'),
                  },
                  {
                    id: 'custom',
                    label: tr('Custom target', 'अपना लक्ष्य लिखें'),
                    sub: tr('Choose daily or weekly count', 'रोज़ या हफ़्ते की गिनती चुनें'),
                  },
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={customTargetCountText}
                    placeholder="1"
                    onChange={(e) =>
                      setCustomTargetCountText(e.target.value.replace(/\D/g, '').slice(0, 3))
                    }
                    onBlur={() => {
                      const n = parseInt(customTargetCountText, 10);
                      setCustomTargetCountText(
                        String(Number.isNaN(n) ? 1 : Math.max(1, Math.min(500, n)))
                      );
                    }}
                    className="w-24 min-h-[42px] px-3 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] font-mono-num text-sm"
                  />
                  <span className="text-sm text-[#5C635E] dark:text-[#9AA59E]">
                    {tr('prayers per', 'नमाज़ें प्रति')}
                  </span>
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
                        {t === 'daily' ? tr('daily', 'दिन') : tr('weekly', 'हफ़्ता')}
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
                  <span>{tr('Back', 'पीछे')}</span>
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
                    {tr('Skip for now', 'अभी छोड़ें')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className="min-h-[44px] px-6 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-sm font-medium hover:bg-[#143B2F] inline-flex items-center gap-2"
                  >
                    <span>{tr('Continue', 'आगे बढ़ें')}</span>
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
                  {tr('Ready to start tracking', 'सब तैयार है')}
                </h2>
                <p className="text-sm text-[#5C635E] dark:text-[#9AA59E]">
                  {tr(
                    'Here is your starting setup. Everything saves automatically and works even offline.',
                    'आपकी शुरुआती जानकारी नीचे है। सब कुछ अपने आप और ऑफ़लाइन भी सेव होता है।'
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] divide-y divide-[#E5E2DC] dark:divide-[#242E2A]">
                <div className="p-4 flex items-center justify-between text-sm">
                  <span className="text-[#5C635E] dark:text-[#9AA59E]">
                    {tr('Starting Balance', 'शुरुआती हिसाब')}
                  </span>
                  <span className="font-mono-num font-semibold">
                    {totalPending.toLocaleString()} {tr('prayers', 'नमाज़ें')}
                  </span>
                </div>
                <div className="p-4 flex items-center justify-between text-sm">
                  <span className="text-[#5C635E] dark:text-[#9AA59E]">
                    {tr('Tracking Routine', 'पढ़ने का तरीक़ा')}
                  </span>
                  <span className="font-medium">{routineInfo(routine).title}</span>
                </div>
                <div className="p-4 flex items-center justify-between text-sm">
                  <span className="text-[#5C635E] dark:text-[#9AA59E]">
                    {tr('Target Pace', 'लक्ष्य')}
                  </span>
                  <span className="font-mono-num font-medium">
                    {resolveTarget().targetType === 'none'
                      ? tr('Flexible (no fixed target)', 'बिना तय लक्ष्य')
                      : `${resolveTarget().targetCount} / ${
                          resolveTarget().targetType === 'daily'
                            ? tr('day', 'दिन')
                            : tr('week', 'हफ़्ता')
                        }`}
                  </span>
                </div>
              </div>

              {!user && (
                <div className="p-4 rounded-xl border border-[#B88E44]/35 bg-[#B88E44]/8 text-xs text-[#5C635E] dark:text-[#C7B99B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span>
                    {tr(
                      'You are currently in Local Guest mode. Sign in anytime to enable automatic cloud backup across devices.',
                      'अभी आपका डेटा इसी डिवाइस पर सेव हो रहा है। दूसरे फ़ोन में सिंक के लिए कभी भी साइन इन करें।'
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="font-medium text-[#1B4D3E] dark:text-[#7FD1B2] underline whitespace-nowrap shrink-0"
                  >
                    {tr('Sign in now', 'अभी साइन इन करें')}
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
                  <span>{tr('Back', 'पीछे')}</span>
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleFinish()}
                  className="min-h-[48px] px-7 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-sm font-medium hover:bg-[#143B2F] transition-colors inline-flex items-center gap-2 disabled:opacity-60"
                >
                  <span>
                    {saving
                      ? tr('Setting up...', 'तैयार हो रहा है...')
                      : tr('Go to Home Dashboard', 'होम डैशबोर्ड पर जाएं')}
                  </span>
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
