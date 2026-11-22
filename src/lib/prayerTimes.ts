import { CalculationMethod, CalculationParameters, Coordinates, Madhab, PrayerTimes } from 'adhan';
import type { PrayerType } from '../types/qaza';

export type CalculationMethodKey =
  | 'karachi'
  | 'muslim_world_league'
  | 'north_america'
  | 'umm_al_qura'
  | 'egyptian'
  | 'dubai'
  | 'singapore'
  | 'turkey';

export type AsrMadhabKey = 'hanafi' | 'shafi';

export interface CityPreset {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  defaultMethod: CalculationMethodKey;
  defaultMadhab: AsrMadhabKey;
}

export const CITY_PRESETS: CityPreset[] = [
  {
    id: 'noida',
    name: 'Noida',
    country: 'India',
    latitude: 28.5355,
    longitude: 77.391,
    timezone: 'Asia/Kolkata',
    defaultMethod: 'karachi',
    defaultMadhab: 'hanafi',
  },
  {
    id: 'new_delhi',
    name: 'New Delhi',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    defaultMethod: 'karachi',
    defaultMadhab: 'hanafi',
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    country: 'India',
    latitude: 19.076,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    defaultMethod: 'karachi',
    defaultMadhab: 'hanafi',
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    country: 'India',
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: 'Asia/Kolkata',
    defaultMethod: 'karachi',
    defaultMadhab: 'hanafi',
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    country: 'India',
    latitude: 17.385,
    longitude: 78.4867,
    timezone: 'Asia/Kolkata',
    defaultMethod: 'karachi',
    defaultMadhab: 'hanafi',
  },
  {
    id: 'lucknow',
    name: 'Lucknow',
    country: 'India',
    latitude: 26.8467,
    longitude: 80.9462,
    timezone: 'Asia/Kolkata',
    defaultMethod: 'karachi',
    defaultMadhab: 'hanafi',
  },
  {
    id: 'kolkata',
    name: 'Kolkata',
    country: 'India',
    latitude: 22.5726,
    longitude: 88.3639,
    timezone: 'Asia/Kolkata',
    defaultMethod: 'karachi',
    defaultMadhab: 'hanafi',
  },
  {
    id: 'chennai',
    name: 'Chennai',
    country: 'India',
    latitude: 13.0827,
    longitude: 80.2707,
    timezone: 'Asia/Kolkata',
    defaultMethod: 'karachi',
    defaultMadhab: 'shafi',
  },
  {
    id: 'lahore',
    name: 'Lahore',
    country: 'Pakistan',
    latitude: 31.5204,
    longitude: 74.3587,
    timezone: 'Asia/Karachi',
    defaultMethod: 'karachi',
    defaultMadhab: 'hanafi',
  },
  {
    id: 'karachi',
    name: 'Karachi',
    country: 'Pakistan',
    latitude: 24.8607,
    longitude: 67.0011,
    timezone: 'Asia/Karachi',
    defaultMethod: 'karachi',
    defaultMadhab: 'hanafi',
  },
  {
    id: 'dhaka',
    name: 'Dhaka',
    country: 'Bangladesh',
    latitude: 23.8103,
    longitude: 90.4125,
    timezone: 'Asia/Dhaka',
    defaultMethod: 'karachi',
    defaultMadhab: 'hanafi',
  },
  {
    id: 'dubai',
    name: 'Dubai',
    country: 'UAE',
    latitude: 25.2048,
    longitude: 55.2708,
    timezone: 'Asia/Dubai',
    defaultMethod: 'dubai',
    defaultMadhab: 'shafi',
  },
  {
    id: 'riyadh',
    name: 'Riyadh',
    country: 'Saudi Arabia',
    latitude: 24.7136,
    longitude: 46.6753,
    timezone: 'Asia/Riyadh',
    defaultMethod: 'umm_al_qura',
    defaultMadhab: 'shafi',
  },
  {
    id: 'makkah',
    name: 'Makkah',
    country: 'Saudi Arabia',
    latitude: 21.3891,
    longitude: 39.8579,
    timezone: 'Asia/Riyadh',
    defaultMethod: 'umm_al_qura',
    defaultMadhab: 'shafi',
  },
  {
    id: 'london',
    name: 'London',
    country: 'UK',
    latitude: 51.5072,
    longitude: -0.1276,
    timezone: 'Europe/London',
    defaultMethod: 'muslim_world_league',
    defaultMadhab: 'hanafi',
  },
  {
    id: 'istanbul',
    name: 'Istanbul',
    country: 'Turkey',
    latitude: 41.0082,
    longitude: 28.9784,
    timezone: 'Europe/Istanbul',
    defaultMethod: 'turkey',
    defaultMadhab: 'hanafi',
  },
  {
    id: 'new_york',
    name: 'New York',
    country: 'USA',
    latitude: 40.7128,
    longitude: -74.006,
    timezone: 'America/New_York',
    defaultMethod: 'north_america',
    defaultMadhab: 'shafi',
  },
  {
    id: 'toronto',
    name: 'Toronto',
    country: 'Canada',
    latitude: 43.6532,
    longitude: -79.3832,
    timezone: 'America/Toronto',
    defaultMethod: 'north_america',
    defaultMadhab: 'hanafi',
  },
  {
    id: 'kuala_lumpur',
    name: 'Kuala Lumpur',
    country: 'Malaysia',
    latitude: 3.139,
    longitude: 101.6869,
    timezone: 'Asia/Kuala_Lumpur',
    defaultMethod: 'singapore',
    defaultMadhab: 'shafi',
  },
  {
    id: 'jakarta',
    name: 'Jakarta',
    country: 'Indonesia',
    latitude: -6.2088,
    longitude: 106.8456,
    timezone: 'Asia/Jakarta',
    defaultMethod: 'singapore',
    defaultMadhab: 'shafi',
  },
];

export const CALCULATION_METHOD_OPTIONS: { id: CalculationMethodKey; label: string }[] = [
  { id: 'karachi', label: 'Karachi (India / Pakistan)' },
  { id: 'muslim_world_league', label: 'Muslim World League' },
  { id: 'north_america', label: 'ISNA (North America)' },
  { id: 'umm_al_qura', label: 'Umm al-Qura (Makkah)' },
  { id: 'dubai', label: 'Dubai / UAE' },
  { id: 'egyptian', label: 'Egyptian General Authority' },
  { id: 'singapore', label: 'Singapore / SE Asia' },
  { id: 'turkey', label: 'Diyanet (Turkey)' },
];

export type AlarmVoiceType = 'adhan_voice' | 'hijaz_chime' | 'voice_only' | 'gentle_chime';

export const ALARM_VOICE_OPTIONS: { id: AlarmVoiceType; labelEn: string; labelHi: string }[] = [
  {
    id: 'adhan_voice',
    labelEn: 'Hijaz Chime + Voice Announcement',
    labelHi: 'हिजाज़ धुन + आवाज़ में ऐलान',
  },
  {
    id: 'hijaz_chime',
    labelEn: 'Warm Mosque Chime (No Speech)',
    labelHi: 'मस्जिद जैसी सुकून भरी धुन (सिर्फ़ घंटी)',
  },
  {
    id: 'voice_only',
    labelEn: 'Spoken Prayer Reminder Only',
    labelHi: 'सिर्फ़ बोलकर नमाज़ अलार्म',
  },
  {
    id: 'gentle_chime',
    labelEn: 'Soft Bell Chime',
    labelHi: 'हल्की घंटी',
  },
];

export interface PrayerTimeSettings {
  locationConfigured: boolean;
  locationLabel: string;
  latitude: number;
  longitude: number;
  timezone: string;
  method: CalculationMethodKey;
  madhab: AsrMadhabKey;
  alarms: Record<PrayerType, boolean>;
  soundEnabled: boolean;
  alarmVoice: AlarmVoiceType;
}

export interface PrayerWindow {
  id: PrayerType;
  label: string;
  start: Date;
  end: Date;
  startFormatted: string;
  endFormatted: string;
  endHint: string;
  isActive: boolean;
}

const STORAGE_KEY = 'qazaflow_prayer_settings_v1';

export function getDefaultPrayerSettings(): PrayerTimeSettings {
  const tz =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
      : 'Asia/Kolkata';

  const matchedCity =
    CITY_PRESETS.find((c) => c.timezone === tz) || CITY_PRESETS[0];

  return {
    locationConfigured: false,
    locationLabel: `${matchedCity.name}, ${matchedCity.country}`,
    latitude: matchedCity.latitude,
    longitude: matchedCity.longitude,
    timezone: matchedCity.timezone,
    method: matchedCity.defaultMethod,
    madhab: matchedCity.defaultMadhab,
    alarms: {
      fajr: false,
      dhuhr: false,
      asr: false,
      maghrib: false,
      isha: false,
    },
    soundEnabled: true,
    alarmVoice: 'adhan_voice',
  };
}

export function loadPrayerSettings(): PrayerTimeSettings {
  const fallback = getDefaultPrayerSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PrayerTimeSettings>;
    return {
      ...fallback,
      ...parsed,
      alarmVoice: parsed.alarmVoice || fallback.alarmVoice,
      alarms: {
        ...fallback.alarms,
        ...(parsed.alarms || {}),
      },
    };
  } catch {
    return fallback;
  }
}

export function savePrayerSettings(settings: PrayerTimeSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Unable to save prayer settings:', err);
  }
}

function getCalculationParams(
  method: CalculationMethodKey,
  madhab: AsrMadhabKey
): CalculationParameters {
  let params: CalculationParameters;
  switch (method) {
    case 'karachi':
      params = CalculationMethod.Karachi();
      break;
    case 'north_america':
      params = CalculationMethod.NorthAmerica();
      break;
    case 'umm_al_qura':
      params = CalculationMethod.UmmAlQura();
      break;
    case 'egyptian':
      params = CalculationMethod.Egyptian();
      break;
    case 'dubai':
      params = CalculationMethod.Dubai();
      break;
    case 'singapore':
      params = CalculationMethod.Singapore();
      break;
    case 'turkey':
      params = CalculationMethod.Turkey();
      break;
    case 'muslim_world_league':
    default:
      params = CalculationMethod.MuslimWorldLeague();
      break;
  }
  params.madhab = madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  return params;
}

export function formatClockTime(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat([], {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
}

export function formatRemainingDuration(targetMs: number, nowMs: number): string {
  const diffMin = Math.max(0, Math.round((targetMs - nowMs) / 60000));
  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

function getDatePartsInTimezone(date: Date, timezone: string): { year: number; month: number; day: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(date);
    const year = parseInt(parts.find((p) => p.type === 'year')?.value || '', 10);
    const month = parseInt(parts.find((p) => p.type === 'month')?.value || '', 10);
    const day = parseInt(parts.find((p) => p.type === 'day')?.value || '', 10);
    if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
      return { year, month, day };
    }
  } catch {
    // fallback below
  }
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

export function calculatePrayerWindows(
  settings: PrayerTimeSettings,
  now = new Date()
): {
  windows: PrayerWindow[];
  sunriseFormatted: string;
  activeWindow: PrayerWindow | null;
  nextWindow: PrayerWindow | null;
} {
  const coords = new Coordinates(settings.latitude, settings.longitude);
  const params = getCalculationParams(settings.method, settings.madhab);

  const { year, month, day } = getDatePartsInTimezone(now, settings.timezone);
  const todayRef = new Date(year, month - 1, day);
  const tomorrowRef = new Date(year, month - 1, day + 1);
  const yesterdayRef = new Date(year, month - 1, day - 1);

  const todayTimes = new PrayerTimes(coords, todayRef, params);
  const tomorrowTimes = new PrayerTimes(coords, tomorrowRef, params);
  const yesterdayTimes = new PrayerTimes(coords, yesterdayRef, params);

  const nowMs = now.getTime();
  const isBeforeTodayFajr = nowMs < todayTimes.fajr.getTime();

  const rawList: {
    id: PrayerType;
    label: string;
    start: Date;
    end: Date;
    endHint: string;
  }[] = [
    {
      id: 'fajr',
      label: 'Fajr',
      start: todayTimes.fajr,
      end: todayTimes.sunrise,
      endHint: 'Ends at Sunrise',
    },
    {
      id: 'dhuhr',
      label: 'Dhuhr',
      start: todayTimes.dhuhr,
      end: todayTimes.asr,
      endHint: 'Ends at Asr',
    },
    {
      id: 'asr',
      label: 'Asr',
      start: todayTimes.asr,
      end: todayTimes.maghrib,
      endHint: 'Ends at Maghrib',
    },
    {
      id: 'maghrib',
      label: 'Maghrib',
      start: todayTimes.maghrib,
      end: todayTimes.isha,
      endHint: 'Ends at Isha',
    },
    {
      id: 'isha',
      label: 'Isha',
      start: isBeforeTodayFajr ? yesterdayTimes.isha : todayTimes.isha,
      end: isBeforeTodayFajr ? todayTimes.fajr : tomorrowTimes.fajr,
      endHint: 'Ends at Fajr',
    },
  ];

  const windows: PrayerWindow[] = rawList.map((item) => {
    const isActive = nowMs >= item.start.getTime() && nowMs < item.end.getTime();
    return {
      id: item.id,
      label: item.label,
      start: item.start,
      end: item.end,
      startFormatted: formatClockTime(item.start, settings.timezone),
      endFormatted: formatClockTime(item.end, settings.timezone),
      endHint: item.endHint,
      isActive,
    };
  });

  const activeWindow = windows.find((w) => w.isActive) || null;
  const upcoming = windows
    .filter((w) => w.start.getTime() > nowMs)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const nextWindow =
    upcoming[0] ||
    ({
      id: 'fajr',
      label: 'Fajr',
      start: tomorrowTimes.fajr,
      end: tomorrowTimes.sunrise,
      startFormatted: formatClockTime(tomorrowTimes.fajr, settings.timezone),
      endFormatted: formatClockTime(tomorrowTimes.sunrise, settings.timezone),
      endHint: 'Ends at Sunrise',
      isActive: false,
    } as PrayerWindow);

  return {
    windows,
    sunriseFormatted: formatClockTime(todayTimes.sunrise, settings.timezone),
    activeWindow,
    nextWindow,
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function inferDefaultsFromLocation(
  latitude: number,
  longitude: number,
  timezone: string
): {
  locationLabel: string;
  method: CalculationMethodKey;
  madhab: AsrMadhabKey;
} {
  let nearest: CityPreset | null = null;
  let minKm = Infinity;
  for (const city of CITY_PRESETS) {
    const d = haversineKm(latitude, longitude, city.latitude, city.longitude);
    if (d < minKm) {
      minKm = d;
      nearest = city;
    }
  }

  if (nearest && minKm <= 55) {
    return {
      locationLabel: `${nearest.name}, ${nearest.country}`,
      method: nearest.defaultMethod,
      madhab: nearest.defaultMadhab,
    };
  }

  // Regional fallback based on timezone / coordinates without calling any external API
  const tzLower = timezone.toLowerCase();
  let method: CalculationMethodKey = 'muslim_world_league';
  let madhab: AsrMadhabKey = 'shafi';

  if (
    tzLower.includes('kolkata') ||
    tzLower.includes('calcutta') ||
    tzLower.includes('karachi') ||
    tzLower.includes('dhaka')
  ) {
    method = 'karachi';
    madhab = 'hanafi';
  } else if (tzLower.startsWith('america/')) {
    method = 'north_america';
  } else if (tzLower.includes('riyadh')) {
    method = 'umm_al_qura';
  } else if (tzLower.includes('dubai')) {
    method = 'dubai';
  } else if (tzLower.includes('cairo')) {
    method = 'egyptian';
  } else if (tzLower.includes('singapore') || tzLower.includes('jakarta') || tzLower.includes('kuala_lumpur')) {
    method = 'singapore';
  } else if (tzLower.includes('istanbul')) {
    method = 'turkey';
    madhab = 'hanafi';
  }

  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';
  return {
    locationLabel: `${Math.abs(latitude).toFixed(2)}°${latDir}, ${Math.abs(longitude).toFixed(2)}°${lonDir}`,
    method,
    madhab,
  };
}

function playWarmHarmonicNotes(notes: { freq: number; delay: number; dur: number; peak: number }[]): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const masterFilter = ctx.createBiquadFilter();
    masterFilter.type = 'lowpass';
    masterFilter.frequency.setValueAtTime(2200, ctx.currentTime);
    masterFilter.connect(ctx.destination);

    notes.forEach(({ freq, delay, dur, peak }) => {
      const start = ctx.currentTime + delay;

      // Fundamental warm triangle + soft 2nd harmonic sine
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, start);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, start);

      const harmGain = ctx.createGain();
      harmGain.gain.setValueAtTime(0.22, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.06);
      gain.gain.exponentialRampToValueAtTime(peak * 0.45, start + dur * 0.45);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      osc1.connect(gain);
      osc2.connect(harmGain);
      harmGain.connect(gain);
      gain.connect(masterFilter);

      osc1.start(start);
      osc2.start(start);
      osc1.stop(start + dur + 0.05);
      osc2.stop(start + dur + 0.05);
    });
  } catch {
    // Ignore audio context autoplay errors
  }
}

function speakPrayerAnnouncement(params: {
  prayerLabel: string;
  prayerLabelHi: string;
  locationLabel: string;
  lang: 'en' | 'hi';
}): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();

    const text =
      params.lang === 'hi'
        ? `अस्सलामु अलैकुम। अभी ${params.prayerLabelHi} की नमाज़ का वक़्त शुरू हो गया है।`
        : `As-salamu alaykum. It is now time for ${params.prayerLabel} prayer.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = params.lang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 0.95;

    const voices = synth.getVoices();
    if (voices.length > 0) {
      const preferred =
        voices.find((v) =>
          params.lang === 'hi'
            ? v.lang.toLowerCase().startsWith('hi')
            : v.lang.toLowerCase().startsWith('en-in') || v.lang.toLowerCase().startsWith('en')
        ) || null;
      if (preferred) utterance.voice = preferred;
    }

    synth.speak(utterance);
  } catch {
    // Ignore speech synthesis errors on restricted browsers
  }
}

export function playPrayerAlarmAudio(
  voiceType: AlarmVoiceType = 'adhan_voice',
  options?: {
    prayerLabel?: string;
    prayerLabelHi?: string;
    locationLabel?: string;
    lang?: 'en' | 'hi';
  }
): void {
  const prayerLabel = options?.prayerLabel || 'Salah';
  const prayerLabelHi = options?.prayerLabelHi || 'नमाज़';
  const locationLabel = options?.locationLabel || 'your area';
  const lang = options?.lang || 'en';

  if (voiceType === 'gentle_chime') {
    playWarmHarmonicNotes([
      { freq: 523.25, delay: 0, dur: 0.75, peak: 0.16 },
      { freq: 659.25, delay: 0.24, dur: 0.85, peak: 0.16 },
      { freq: 783.99, delay: 0.48, dur: 1.1, peak: 0.15 },
    ]);
    return;
  }

  if (voiceType === 'voice_only') {
    playWarmHarmonicNotes([
      { freq: 440, delay: 0, dur: 0.55, peak: 0.1 },
      { freq: 587.33, delay: 0.18, dur: 0.75, peak: 0.12 },
    ]);
    window.setTimeout(() => {
      speakPrayerAnnouncement({ prayerLabel, prayerLabelHi, locationLabel, lang });
    }, 350);
    return;
  }

  // Hijaz maqam-inspired warm resonant cadence (D4 - Eb4 - F#4 - G4 - A4 - Bb4 - A4 - G4)
  playWarmHarmonicNotes([
    { freq: 293.66, delay: 0.0, dur: 0.65, peak: 0.15 },
    { freq: 311.13, delay: 0.34, dur: 0.65, peak: 0.15 },
    { freq: 369.99, delay: 0.68, dur: 0.85, peak: 0.17 },
    { freq: 392.0, delay: 1.12, dur: 0.95, peak: 0.18 },
    { freq: 440.0, delay: 1.65, dur: 0.7, peak: 0.15 },
    { freq: 466.16, delay: 2.02, dur: 0.65, peak: 0.14 },
    { freq: 392.0, delay: 2.42, dur: 1.25, peak: 0.16 },
  ]);

  if (voiceType === 'adhan_voice') {
    window.setTimeout(() => {
      speakPrayerAnnouncement({ prayerLabel, prayerLabelHi, locationLabel, lang });
    }, 1500);
  }
}

export function playPrayerChime(): void {
  playPrayerAlarmAudio('hijaz_chime');
}

function formatIcsUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}` +
    `${pad(date.getUTCMonth() + 1)}` +
    `${pad(date.getUTCDate())}T` +
    `${pad(date.getUTCHours())}` +
    `${pad(date.getUTCMinutes())}` +
    `${pad(date.getUTCSeconds())}Z`
  );
}

export function downloadPrayerAlarmsIcs(settings: PrayerTimeSettings, daysAhead = 7): number {
  const enabledPrayers = (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as PrayerType[]).filter(
    (p) => settings.alarms[p]
  );
  const activeList = enabledPrayers.length > 0 ? enabledPrayers : (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as PrayerType[]);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//QazaFlow//Namaz Alarms//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const now = new Date();
  let eventCount = 0;

  for (let offset = 0; offset < daysAhead; offset += 1) {
    const dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const { windows } = calculatePrayerWindows(settings, new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 12, 0, 0));

    for (const w of windows) {
      if (!activeList.includes(w.id)) continue;
      if (w.start.getTime() < now.getTime() - 60000) continue;

      const alarmStart = w.start;
      const alarmEnd = new Date(w.start.getTime() + 15 * 60000);
      const uid = `qazaflow-${w.id}-${alarmStart.getTime()}@qazaflow.app`;

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatIcsUtc(now)}`,
        `DTSTART:${formatIcsUtc(alarmStart)}`,
        `DTEND:${formatIcsUtc(alarmEnd)}`,
        `SUMMARY:${w.label} Prayer Time (${w.startFormatted} - ${w.endFormatted})`,
        `DESCRIPTION:${w.label} prayer window for ${settings.locationLabel}: ${w.startFormatted} to ${w.endFormatted} (${w.endHint}).`,
        'BEGIN:VALARM',
        'TRIGGER:PT0M',
        'ACTION:DISPLAY',
        `DESCRIPTION:Time for ${w.label} (${w.startFormatted} - ${w.endFormatted})`,
        'END:VALARM',
        'END:VEVENT'
      );
      eventCount += 1;
    }
  }

  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `qazaflow-namaz-alarms-${settings.locationLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return eventCount;
}
