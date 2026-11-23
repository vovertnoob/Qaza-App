import React, { useMemo, useState } from 'react';
import {
  Bell,
  BellOff,
  CalendarPlus,
  CheckCircle2,
  Clock,
  LocateFixed,
  MapPin,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useQaza } from '../context/QazaContext';
import {
  ALARM_VOICE_OPTIONS,
  CALCULATION_METHOD_OPTIONS,
  CITY_PRESETS,
  calculatePrayerWindows,
  downloadPrayerAlarmsIcs,
  formatRemainingDuration,
  inferDefaultsFromLocation,
  type AlarmVoiceType,
  type AsrMadhabKey,
  type CalculationMethodKey,
} from '../lib/prayerTimes';
import type { PrayerType } from '../types/qaza';

export const PrayerTimesCard: React.FC = () => {
  const { prayerSettings, updatePrayerSettings, prayerNow, sendTestPrayerAlarm } = useQaza();
  const { lang, tr, prayerLabel } = useLanguage();
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const schedule = useMemo(
    () => calculatePrayerWindows(prayerSettings, prayerNow),
    [prayerSettings, prayerNow]
  );

  const anyAlarmEnabled = Object.values(prayerSettings.alarms).some(Boolean);

  const flashNotice = (msg: string) => {
    setStatusNotice(msg);
    window.setTimeout(() => setStatusNotice(null), 4500);
  };

  const getEndHint = (prayerId: PrayerType, fallback: string) => {
    if (lang !== 'hi') return fallback;
    switch (prayerId) {
      case 'fajr':
        return 'सूरज निकलने तक';
      case 'dhuhr':
        return 'अस्र शुरू होने तक';
      case 'asr':
        return 'मग़रिब शुरू होने तक';
      case 'maghrib':
        return 'इशा शुरू होने तक';
      case 'isha':
        return 'फ़ज्र शुरू होने तक';
    }
  };

  const requestNotificationsIfNeeded = async () => {
    if (typeof Notification === 'undefined') {
      setNotifPerm('unsupported');
      return;
    }
    if (Notification.permission === 'default') {
      try {
        const res = await Notification.requestPermission();
        setNotifPerm(res);
      } catch {
        // ignore
      }
    } else {
      setNotifPerm(Notification.permission);
    }
  };

  const handleUseCurrentLocation = () => {
    setLocError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocError(
        tr(
          'Location services are unavailable in this browser. Pick your city below instead.',
          'इस ब्राउज़र में लोकेशन सेवा उपलब्ध नहीं है। नीचे अपना शहर चुनें।'
        )
      );
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const timezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone || prayerSettings.timezone;
        const inferred = inferDefaultsFromLocation(latitude, longitude, timezone);
        updatePrayerSettings({
          locationConfigured: true,
          locationLabel: inferred.locationLabel,
          latitude,
          longitude,
          timezone,
          method: inferred.method,
          madhab: inferred.madhab,
        });
        setLocating(false);
        setShowLocationPicker(false);
        flashNotice(
          tr(
            `Location set to ${inferred.locationLabel} (${timezone}).`,
            `लोकेशन ${inferred.locationLabel} (${timezone}) पर सेट हो गई।`
          )
        );
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocError(
            tr(
              'Location permission was denied. Choose your city below—no API needed.',
              'लोकेशन की अनुमति नहीं मिली। नीचे से अपना शहर चुनें—किसी API की ज़रूरत नहीं।'
            )
          );
        } else {
          setLocError(
            tr(
              'Could not read GPS location right now. Pick your city below instead.',
              'अभी GPS लोकेशन नहीं मिल सकी। नीचे से अपना शहर चुनें।'
            )
          );
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleSelectCity = (cityId: string) => {
    const city = CITY_PRESETS.find((c) => c.id === cityId);
    if (!city) return;
    setLocError(null);
    updatePrayerSettings({
      locationConfigured: true,
      locationLabel: `${city.name}, ${city.country}`,
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: city.timezone,
      method: city.defaultMethod,
      madhab: city.defaultMadhab,
    });
    setShowLocationPicker(false);
    flashNotice(
      tr(
        `Prayer timings updated for ${city.name} (${city.timezone}).`,
        `${city.name} (${city.timezone}) के लिए नमाज़ का समय अपडेट हो गया।`
      )
    );
  };

  const handleTogglePrayerAlarm = async (prayerId: PrayerType) => {
    const turningOn = !prayerSettings.alarms[prayerId];
    if (turningOn) {
      await requestNotificationsIfNeeded();
    }
    updatePrayerSettings((prev) => ({
      ...prev,
      alarms: {
        ...prev.alarms,
        [prayerId]: turningOn,
      },
    }));
  };

  const handleToggleAllAlarms = async () => {
    const nextState = !anyAlarmEnabled;
    if (nextState) {
      await requestNotificationsIfNeeded();
    }
    updatePrayerSettings((prev) => ({
      ...prev,
      alarms: {
        fajr: nextState,
        dhuhr: nextState,
        asr: nextState,
        maghrib: nextState,
        isha: nextState,
      },
    }));
    flashNotice(
      nextState
        ? tr('All 5 prayer alarms turned on.', 'पांचों नमाज़ों के अलार्म चालू हो गए।')
        : tr('All prayer alarms muted.', 'सभी नमाज़ अलार्म बंद कर दिए गए।')
    );
  };

  const handleDownloadIcs = () => {
    const count = downloadPrayerAlarmsIcs(prayerSettings, 7);
    flashNotice(
      tr(
        `Downloaded ${count} prayer alarms (.ics). Open the file on your phone to add native calendar alerts.`,
        `${count} नमाज़ अलार्म (.ics) डाउनलोड हुए। फ़ोन पर इस फ़ाइल को खोलकर कैलेंडर अलार्म जोड़ें।`
      )
    );
  };

  if (!prayerSettings.locationConfigured) {
    return (
      <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-[#1B4D3E] dark:text-[#7FD1B2]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {tr("Today's Namaz Timings & Alarms", 'आज की नमाज़ का वक़्त और अलार्म')}
            </h2>
            <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-0.5">
              {tr(
                'Enable location to see exact local prayer windows (e.g. Fajr from start to sunrise) and set prayer-time alarms—calculated offline on your device.',
                'अपने शहर के हिसाब से नमाज़ का सही वक़्त (जैसे फ़ज्र कब से कब तक) देखने और अलार्म लगाने के लिए लोकेशन चालू करें या शहर चुनें।'
              )}
            </p>
          </div>
        </div>

        {locError && (
          <p className="text-xs text-[#B88E44] dark:text-[#D4AA5E] bg-[#B88E44]/10 border border-[#B88E44]/30 rounded-xl px-3.5 py-2.5">
            {locError}
          </p>
        )}

        <div className="space-y-3">
          <button
            type="button"
            disabled={locating}
            onClick={handleUseCurrentLocation}
            className="w-full min-h-[44px] px-4 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-sm font-medium hover:bg-[#143B2F] transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <LocateFixed className="w-4 h-4 shrink-0" />
            <span>
              {locating
                ? tr('Detecting location & timezone...', 'लोकेशन और टाइमज़ोन पता लगाया जा रहा है...')
                : tr('Enable Location for My Timezone', 'अपने टाइमज़ोन के लिए लोकेशन चालू करें')}
            </span>
          </button>

          <div className="pt-2 border-t border-[#E5E2DC] dark:border-[#242E2A] space-y-2">
            <label
              htmlFor="prayer-city-select-initial"
              className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E]"
            >
              {tr(
                'Or pick your city directly (no GPS required):',
                'या सीधे अपना शहर चुनें (GPS के बिना):'
              )}
            </label>
            <div className="flex items-center gap-2">
              <select
                id="prayer-city-select-initial"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) handleSelectCity(e.target.value);
                }}
                className="flex-1 min-h-[42px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-sm"
              >
                <option value="" disabled>
                  {tr('Choose a city (e.g. Noida, Delhi, Dubai...)', 'शहर चुनें (जैसे नोएडा, दिल्ली, मुंबई...)')}
                </option>
                {CITY_PRESETS.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}, {city.country}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleSelectCity('noida')}
                className="min-h-[42px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:border-[#1B4D3E] text-xs font-medium whitespace-nowrap"
              >
                {tr('Use Noida', 'नोएडा चुनें')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2] shrink-0" />
            <h2 className="text-lg font-semibold truncate">
              {tr('Namaz Timings & Alarms', 'नमाज़ का वक़्त और अलार्म')}
            </h2>
          </div>
          <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] mt-0.5 truncate">
            {prayerSettings.locationLabel} · {prayerSettings.timezone}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowLocationPicker((v) => !v)}
          className="text-xs font-medium text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline whitespace-nowrap shrink-0"
        >
          {showLocationPicker
            ? tr('Close settings', 'सेटिंग्स बंद करें')
            : tr('Change location / method', 'शहर / तरीक़ा बदलें')}
        </button>
      </div>

      {/* Location & Calculation Method Drawer */}
      {showLocationPicker && (
        <div className="p-4 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] space-y-3">
          {locError && (
            <p className="text-xs text-[#B88E44] dark:text-[#D4AA5E]">{locError}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={locating}
              onClick={handleUseCurrentLocation}
              className="min-h-[40px] px-3 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              <span>
                {locating
                  ? tr('Locating...', 'खोजा जा रहा है...')
                  : tr('Detect GPS Location', 'GPS से लोकेशन लें')}
              </span>
            </button>

            <select
              aria-label={tr('Pick city preset', 'शहर चुनें')}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleSelectCity(e.target.value);
              }}
              className="flex-1 min-w-[160px] min-h-[40px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-xs"
            >
              <option value="" disabled>
                {tr('Switch city preset...', 'शहर बदलें...')}
              </option>
              {CITY_PRESETS.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}, {city.country}
                </option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor="prayer-calc-method"
                className="block text-[11px] text-[#5C635E] dark:text-[#9AA59E] mb-1"
              >
                {tr('Calculation Method', 'हिसाब का तरीक़ा')}
              </label>
              <select
                id="prayer-calc-method"
                value={prayerSettings.method}
                onChange={(e) =>
                  updatePrayerSettings({ method: e.target.value as CalculationMethodKey })
                }
                className="w-full min-h-[38px] px-2.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-xs"
              >
                {CALCULATION_METHOD_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="prayer-asr-madhab"
                className="block text-[11px] text-[#5C635E] dark:text-[#9AA59E] mb-1"
              >
                {tr('Asr Calculation', 'अस्र का वक़्त')}
              </label>
              <select
                id="prayer-asr-madhab"
                value={prayerSettings.madhab}
                onChange={(e) =>
                  updatePrayerSettings({ madhab: e.target.value as AsrMadhabKey })
                }
                className="w-full min-h-[38px] px-2.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-xs"
              >
                <option value="hanafi">
                  {tr('Hanafi (standard in India/South Asia)', 'हनफ़ी (भारत/दक्षिण एशिया)')}
                </option>
                <option value="shafi">
                  {tr('Standard (Shafi / Maliki / Hanbali)', 'शाफ़ई / मानक')}
                </option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Active / Next Window Banner */}
      <div className="px-3.5 py-2.5 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] flex flex-wrap items-center justify-between gap-2 text-xs">
        {schedule.activeWindow ? (
          <>
            <span className="font-medium text-[#1B4D3E] dark:text-[#7FD1B2]">
              {tr('Active now', 'अभी का वक़्त')}: {prayerLabel(schedule.activeWindow.id)} (
              {schedule.activeWindow.startFormatted} – {schedule.activeWindow.endFormatted})
            </span>
            <span className="font-mono-num text-[#5C635E] dark:text-[#9AA59E]">
              {tr('Ends in', 'ख़त्म होने में')}{' '}
              {formatRemainingDuration(schedule.activeWindow.end.getTime(), prayerNow.getTime())}
            </span>
          </>
        ) : schedule.nextWindow ? (
          <>
            <span className="font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">
              {tr('Next prayer', 'अगली नमाज़')}: {prayerLabel(schedule.nextWindow.id)}{' '}
              {tr('at', 'बजे')} {schedule.nextWindow.startFormatted}
            </span>
            <span className="font-mono-num text-[#5C635E] dark:text-[#9AA59E]">
              {tr('Sunrise', 'तुलू-ए-आफ़ताब')} {schedule.sunriseFormatted}
            </span>
          </>
        ) : null}
      </div>

      {/* Five Prayer Windows + Per-Prayer Alarm Toggle */}
      <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A] border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl overflow-hidden">
        {schedule.windows.map((w) => {
          const alarmOn = prayerSettings.alarms[w.id];
          return (
            <div
              key={w.id}
              className={`px-3.5 py-2.5 flex items-center justify-between gap-3 ${
                w.isActive
                  ? 'bg-[#1B4D3E]/8 dark:bg-[#2A6F5A]/15'
                  : 'bg-white dark:bg-[#151C19]'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{prayerLabel(w.id)}</span>
                  {w.isActive && (
                    <span className="text-[11px] font-medium text-[#1B4D3E] dark:text-[#7FD1B2]">
                      · {tr('Now', 'अभी')}
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono-num text-[#5C635E] dark:text-[#9AA59E]">
                  {w.startFormatted} – {w.endFormatted}{' '}
                  <span className="font-sans text-[11px] text-[#7A827D]">
                    ({getEndHint(w.id, w.endHint)})
                  </span>
                </p>
                {prayerSettings.beforeEndReminderEnabled && (
                  <p className="text-[11px] text-[#7A827D] font-mono-num mt-0.5">
                    {w.id === 'isha'
                      ? tr(
                          `Ending alert: ${w.closingAlertFormatted} (30m before 10 PM)`,
                          `अंतिम रिमाइंडर: ${w.closingAlertFormatted} (रात 10 से 30 मिनट पहले)`
                        )
                      : tr(
                          `30m before end alert: ${w.closingAlertFormatted}`,
                          `ख़त्म होने से 30 मिनट पहले अलर्ट: ${w.closingAlertFormatted}`
                        )}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => void handleTogglePrayerAlarm(w.id)}
                aria-pressed={alarmOn}
                aria-label={`${alarmOn ? tr('Disable', 'बंद करें') : tr('Enable', 'चालू करें')} ${prayerLabel(w.id)}`}
                className={`min-h-[38px] px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  alarmOn
                    ? 'bg-[#1B4D3E] text-white border-[#1B4D3E] dark:bg-[#2A6F5A] dark:border-[#2A6F5A]'
                    : 'border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-[#5C635E] dark:text-[#9AA59E]'
                }`}
              >
                {alarmOn ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                <span>{alarmOn ? tr('Alarm On', 'चालू') : tr('Alarm', 'अलार्म')}</span>
              </button>
            </div>
          );
        })}
      </div>

      {statusNotice && (
        <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* 30-Min Before-End Reminder Toggle & Alarm Sound Selector */}
      <div className="space-y-3 pt-1">
        <label className="px-3.5 py-2.5 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] flex items-center justify-between gap-3 cursor-pointer">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#1A1D1B] dark:text-[#F1F3F2]">
              {tr(
                '30-Min Before-End Alert (Isha at 9:30 PM)',
                'वक़्त ख़त्म होने से 30 मिनट पहले अलर्ट (इशा 9:30 PM)'
              )}
            </p>
            <p className="text-[11px] text-[#5C635E] dark:text-[#9AA59E]">
              {tr(
                'Notifies 30 mins before Fajr–Maghrib end, and at 9:30 PM (30m before 10 PM) for Isha.',
                'फ़ज्र–मग़रिब ख़त्म होने से 30 मिनट पहले और इशा के लिए रात 9:30 बजे अलर्ट भेजता है।'
              )}
            </p>
          </div>
          <input
            type="checkbox"
            checked={prayerSettings.beforeEndReminderEnabled}
            onChange={(e) => {
              const checked = e.target.checked;
              if (checked) void requestNotificationsIfNeeded();
              updatePrayerSettings({ beforeEndReminderEnabled: checked });
            }}
            className="w-4 h-4 accent-[#1B4D3E] shrink-0"
          />
        </label>

        <div className="space-y-1.5">
          <label
            htmlFor="alarm-voice-select"
            className="block text-[11px] font-medium text-[#5C635E] dark:text-[#9AA59E]"
          >
            {tr('Alarm Sound / Tone Style', 'अलार्म की आवाज़ / रिंगटोन चुनें')}
          </label>
          <select
            id="alarm-voice-select"
            value={prayerSettings.alarmVoice || 'loud_digital_beep'}
            onChange={(e) =>
              updatePrayerSettings({
                alarmVoice: e.target.value as AlarmVoiceType,
                soundEnabled: true,
              })
            }
            className="w-full min-h-[40px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-xs font-medium"
          >
            <optgroup label={tr('Loud Alarms (No Voice, No Music)', 'तेज़ अलार्म (बिना आवाज़ और बिना संगीत)')}>
              {ALARM_VOICE_OPTIONS.filter((opt) => opt.group === 'loud').map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {lang === 'hi' ? opt.labelHi : opt.labelEn}
                </option>
              ))}
            </optgroup>
            <optgroup label={tr('Chimes & Spoken Alerts', 'धुन और बोलकर अलार्म')}>
              {ALARM_VOICE_OPTIONS.filter((opt) => opt.group === 'chime').map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {lang === 'hi' ? opt.labelHi : opt.labelEn}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleToggleAllAlarms()}
            className="min-h-[40px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:border-[#1B4D3E] text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Bell className="w-3.5 h-3.5 text-[#1B4D3E] dark:text-[#7FD1B2]" />
            <span>
              {anyAlarmEnabled
                ? tr('Mute All Alarms', 'सभी अलार्म बंद करें')
                : tr('Turn On All 5 Alarms', 'पांचों अलार्म चालू करें')}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              updatePrayerSettings({ soundEnabled: !prayerSettings.soundEnabled })
            }
            aria-pressed={prayerSettings.soundEnabled}
            className="min-h-[40px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            {prayerSettings.soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[#1B4D3E] dark:text-[#7FD1B2]" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-[#7A827D]" />
            )}
            <span>{prayerSettings.soundEnabled ? tr('Sound On', 'आवाज़ चालू') : tr('Muted', 'म्यूट')}</span>
          </button>

          <button
            type="button"
            onClick={() => void sendTestPrayerAlarm()}
            className="min-h-[40px] px-3 rounded-xl border border-[#1B4D3E]/30 dark:border-[#2A6F5A]/50 bg-[#1B4D3E]/8 dark:bg-[#2A6F5A]/15 text-[#1B4D3E] dark:text-[#7FD1B2] text-xs font-medium hover:bg-[#1B4D3E]/15 whitespace-nowrap"
          >
            {tr('Test Voice / Alarm', 'आवाज़ सुनें / टेस्ट')}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E5E2DC] dark:border-[#242E2A]">
          <button
            type="button"
            onClick={handleDownloadIcs}
            className="min-h-[40px] px-3.5 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] hover:border-[#1B4D3E] text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-[#1B4D3E] dark:text-[#7FD1B2]" />
            <span>{tr('Add Alarms to Phone Calendar (.ics)', 'फ़ोन कैलेंडर में अलार्म जोड़ें (.ics)')}</span>
          </button>

          {notifPerm === 'default' && (
            <button
              type="button"
              onClick={() => void requestNotificationsIfNeeded()}
              className="text-xs font-medium text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline whitespace-nowrap"
            >
              {tr('Allow notifications', 'नोटिफ़िकेशन चालू करें')}
            </button>
          )}
          {notifPerm === 'denied' && (
            <span className="text-[11px] text-[#7A827D]">
              {tr(
                'Browser notifications blocked — use Calendar (.ics) for phone alerts',
                'ब्राउज़र नोटिफ़िकेशन बंद हैं — फ़ोन अलर्ट के लिए कैलेंडर (.ics) इस्तेमाल करें'
              )}
            </span>
          )}
        </div>

        <p className="text-[11px] text-[#7A827D] leading-relaxed">
          {tr(
            'All timings and voices run offline on your device. Calendar (.ics) files send phone alerts even when the app is closed.',
            'सभी समय और आवाज़ें बिना इंटरनेट आपके फ़ोन पर चलती हैं। ऐप बंद होने पर भी अलर्ट पाने के लिए कैलेंडर (.ics) जोड़ें।'
          )}
        </p>
      </div>
    </div>
  );
};
