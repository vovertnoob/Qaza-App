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

export type AlarmVoiceType =
  | 'loud_digital_beep'
  | 'loud_classic_bell'
  | 'loud_siren_pulse'
  | 'loud_wake_buzzer'
  | 'adhan_voice'
  | 'hijaz_chime'
  | 'voice_only'
  | 'gentle_chime';

export const ALARM_VOICE_OPTIONS: {
  id: AlarmVoiceType;
  labelEn: string;
  labelHi: string;
  group: 'loud' | 'chime';
}[] = [
  {
    id: 'loud_digital_beep',
    labelEn: 'Loud Digital Alarm (Beep-Beep-Beep · No Voice/Music)',
    labelHi: 'तेज़ डिजिटल अलार्म (बीप-बीप · बिना आवाज़/संगीत)',
    group: 'loud',
  },
  {
    id: 'loud_classic_bell',
    labelEn: 'Loud Classic Alarm Bell (Ringing · No Voice/Music)',
    labelHi: 'तेज़ क्लासिक अलार्म घंटी (बिना आवाज़/संगीत)',
    group: 'loud',
  },
  {
    id: 'loud_siren_pulse',
    labelEn: 'Loud Urgent Tone Alert (Dual-Tone · No Voice/Music)',
    labelHi: 'तेज़ अलर्ट टोन (डबल-टोन · बिना आवाज़/संगीत)',
    group: 'loud',
  },
  {
    id: 'loud_wake_buzzer',
    labelEn: 'Loud Wake-Up Buzzer (Strong · No Voice/Music)',
    labelHi: 'तेज़ जागने का बज़र (फ़ज्र/गहरी नींद · बिना आवाज़/संगीत)',
    group: 'loud',
  },
  {
    id: 'adhan_voice',
    labelEn: 'Hijaz Chime + Spoken Voice Reminder',
    labelHi: 'हिजाज़ धुन + बोलकर नमाज़ अलार्म',
    group: 'chime',
  },
  {
    id: 'hijaz_chime',
    labelEn: 'Warm Mosque Chime (No Voice)',
    labelHi: 'सुकून भरी मस्जिद धुन (बिना आवाज़)',
    group: 'chime',
  },
  {
    id: 'voice_only',
    labelEn: 'Spoken Prayer Reminder Only',
    labelHi: 'सिर्फ़ बोलकर याद दिलाने वाला अलार्म',
    group: 'chime',
  },
  {
    id: 'gentle_chime',
    labelEn: 'Soft Bell Chime',
    labelHi: 'हल्की घंटी',
    group: 'chime',
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
  beforeEndReminderEnabled: boolean;
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
  closingAlertAt: Date;
  closingAlertFormatted: string;
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
    beforeEndReminderEnabled: true,
    soundEnabled: true,
    alarmVoice: 'loud_digital_beep',
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
      beforeEndReminderEnabled:
        typeof parsed.beforeEndReminderEnabled === 'boolean'
          ? parsed.beforeEndReminderEnabled
          : fallback.beforeEndReminderEnabled,
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

function zonedTimeForDate(
  refDate: Date,
  hour24: number,
  minute: number,
  timezone: string
): Date {
  const { year, month, day } = getDatePartsInTimezone(refDate, timezone);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour24, minute, 0, 0));
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(utcGuess);
    const tzYear = parseInt(parts.find((p) => p.type === 'year')?.value || '', 10);
    const tzMonth = parseInt(parts.find((p) => p.type === 'month')?.value || '', 10);
    const tzDay = parseInt(parts.find((p) => p.type === 'day')?.value || '', 10);
    const rawH = parseInt(parts.find((p) => p.type === 'hour')?.value || '', 10);
    const tzHour = rawH === 24 ? 0 : rawH;
    const tzMin = parseInt(parts.find((p) => p.type === 'minute')?.value || '', 10);
    if (
      !Number.isNaN(tzYear) &&
      !Number.isNaN(tzMonth) &&
      !Number.isNaN(tzDay) &&
      !Number.isNaN(tzHour) &&
      !Number.isNaN(tzMin)
    ) {
      const tzAsUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, 0, 0);
      const offsetMs = tzAsUtc - utcGuess.getTime();
      return new Date(utcGuess.getTime() - offsetMs);
    }
  } catch {
    // fallback below
  }
  return new Date(year, month - 1, day, hour24, minute, 0, 0);
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

  const ishaStart = isBeforeTodayFajr ? yesterdayTimes.isha : todayTimes.isha;
  const ishaEnd = isBeforeTodayFajr ? todayTimes.fajr : tomorrowTimes.fajr;
  // User-requested Isha ending reminder: 30 minutes before 10:00 PM (9:30 PM)
  const isha930Pm = zonedTimeForDate(ishaStart, 21, 30, settings.timezone);

  const rawList: {
    id: PrayerType;
    label: string;
    start: Date;
    end: Date;
    closingAlertAt: Date;
    endHint: string;
  }[] = [
    {
      id: 'fajr',
      label: 'Fajr',
      start: todayTimes.fajr,
      end: todayTimes.sunrise,
      closingAlertAt: new Date(todayTimes.sunrise.getTime() - 30 * 60_000),
      endHint: 'Ends at Sunrise',
    },
    {
      id: 'dhuhr',
      label: 'Dhuhr',
      start: todayTimes.dhuhr,
      end: todayTimes.asr,
      closingAlertAt: new Date(todayTimes.asr.getTime() - 30 * 60_000),
      endHint: 'Ends at Asr',
    },
    {
      id: 'asr',
      label: 'Asr',
      start: todayTimes.asr,
      end: todayTimes.maghrib,
      closingAlertAt: new Date(todayTimes.maghrib.getTime() - 30 * 60_000),
      endHint: 'Ends at Maghrib',
    },
    {
      id: 'maghrib',
      label: 'Maghrib',
      start: todayTimes.maghrib,
      end: todayTimes.isha,
      closingAlertAt: new Date(todayTimes.isha.getTime() - 30 * 60_000),
      endHint: 'Ends at Isha',
    },
    {
      id: 'isha',
      label: 'Isha',
      start: ishaStart,
      end: ishaEnd,
      closingAlertAt: isha930Pm,
      endHint: 'Ends at Fajr (Alert 9:30 PM)',
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
      closingAlertAt: item.closingAlertAt,
      closingAlertFormatted: formatClockTime(item.closingAlertAt, settings.timezone),
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
      closingAlertAt: new Date(tomorrowTimes.sunrise.getTime() - 30 * 60_000),
      closingAlertFormatted: formatClockTime(
        new Date(tomorrowTimes.sunrise.getTime() - 30 * 60_000),
        settings.timezone
      ),
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

function playLoudAlarmPulses(
  pulses: { freq: number; delay: number; dur: number; peak: number; wave: OscillatorType }[]
): void {
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

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-10, ctx.currentTime);
    compressor.ratio.setValueAtTime(8, ctx.currentTime);
    compressor.connect(ctx.destination);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(3400, ctx.currentTime);
    lowpass.connect(compressor);

    pulses.forEach(({ freq, delay, dur, peak, wave }) => {
      const start = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = wave;
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(peak, start + 0.015);
      gain.gain.setValueAtTime(peak, start + Math.max(0.02, dur - 0.025));
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      osc.connect(gain);
      gain.connect(lowpass);

      osc.start(start);
      osc.stop(start + dur + 0.03);
    });
  } catch {
    // Ignore audio context restrictions
  }
}

export function playPrayerAlarmAudio(
  voiceType: AlarmVoiceType = 'loud_digital_beep',
  options?: {
    prayerLabel?: string;
    prayerLabelHi?: string;
    locationLabel?: string;
    lang?: 'en' | 'hi';
  }
): void {
  // Loud Digital Alarm: Classic triple-beep bursts (non-music, no voice)
  if (voiceType === 'loud_digital_beep') {
    const pulses: { freq: number; delay: number; dur: number; peak: number; wave: OscillatorType }[] = [];
    for (let cycle = 0; cycle < 4; cycle += 1) {
      const base = cycle * 0.95;
      pulses.push(
        { freq: 1180, delay: base, dur: 0.14, peak: 0.45, wave: 'square' },
        { freq: 1180, delay: base + 0.2, dur: 0.14, peak: 0.45, wave: 'square' },
        { freq: 1180, delay: base + 0.4, dur: 0.18, peak: 0.48, wave: 'square' }
      );
    }
    playLoudAlarmPulses(pulses);
    return;
  }

  // Loud Classic Alarm Bell: Rapid mechanical ringing oscillation (no voice/music)
  if (voiceType === 'loud_classic_bell') {
    const pulses: { freq: number; delay: number; dur: number; peak: number; wave: OscillatorType }[] = [];
    for (let burst = 0; burst < 3; burst += 1) {
      const offset = burst * 1.1;
      for (let i = 0; i < 12; i += 1) {
        pulses.push({
          freq: i % 2 === 0 ? 1240 : 1480,
          delay: offset + i * 0.06,
          dur: 0.055,
          peak: 0.44,
          wave: 'triangle',
        });
      }
    }
    playLoudAlarmPulses(pulses);
    return;
  }

  // Loud Dual-Tone Urgent Alert (no voice/music)
  if (voiceType === 'loud_siren_pulse') {
    const pulses: { freq: number; delay: number; dur: number; peak: number; wave: OscillatorType }[] = [];
    for (let cycle = 0; cycle < 4; cycle += 1) {
      const base = cycle * 0.85;
      pulses.push(
        { freq: 820, delay: base, dur: 0.34, peak: 0.46, wave: 'sawtooth' },
        { freq: 1080, delay: base + 0.36, dur: 0.36, peak: 0.48, wave: 'sawtooth' }
      );
    }
    playLoudAlarmPulses(pulses);
    return;
  }

  // Loud Wake-Up Buzzer: Heavy sustained alarm pulses (no voice/music)
  if (voiceType === 'loud_wake_buzzer') {
    const pulses: { freq: number; delay: number; dur: number; peak: number; wave: OscillatorType }[] = [];
    for (let cycle = 0; cycle < 4; cycle += 1) {
      const base = cycle * 0.9;
      pulses.push(
        { freq: 920, delay: base, dur: 0.55, peak: 0.52, wave: 'square' },
        { freq: 920, delay: base + 0.62, dur: 0.16, peak: 0.48, wave: 'square' }
      );
    }
    playLoudAlarmPulses(pulses);
    return;
  }

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

  // Hijaz maqam-inspired warm resonant cadence
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
  const activeList =
    enabledPrayers.length > 0
      ? enabledPrayers
      : (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as PrayerType[]);

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
    const { windows } = calculatePrayerWindows(
      settings,
      new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 12, 0, 0)
    );

    for (const w of windows) {
      if (activeList.includes(w.id) && w.start.getTime() >= now.getTime() - 60000) {
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
          `DESCRIPTION:${w.label} prayer window for ${settings.locationLabel}: ${w.startFormatted} to ${w.endFormatted}.`,
          'BEGIN:VALARM',
          'TRIGGER:PT0M',
          'ACTION:DISPLAY',
          `DESCRIPTION:Time for ${w.label} (${w.startFormatted} - ${w.endFormatted})`,
          'END:VALARM',
          'END:VEVENT'
        );
        eventCount += 1;
      }

      if (
        settings.beforeEndReminderEnabled &&
        w.closingAlertAt.getTime() >= now.getTime() - 60000
      ) {
        const warnStart = w.closingAlertAt;
        const warnEnd = new Date(warnStart.getTime() + 10 * 60000);
        const warnSummary =
          w.id === 'isha'
            ? `Isha Reminder (9:30 PM - 30 min before 10 PM)`
            : `${w.label} Ending Soon (30 min left until ${w.endFormatted})`;

        lines.push(
          'BEGIN:VEVENT',
          `UID:qazaflow-endwarn-${w.id}-${warnStart.getTime()}@qazaflow.app`,
          `DTSTAMP:${formatIcsUtc(now)}`,
          `DTSTART:${formatIcsUtc(warnStart)}`,
          `DTEND:${formatIcsUtc(warnEnd)}`,
          `SUMMARY:${warnSummary}`,
          `DESCRIPTION:${warnSummary} in ${settings.locationLabel}.`,
          'BEGIN:VALARM',
          'TRIGGER:PT0M',
          'ACTION:DISPLAY',
          `DESCRIPTION:${warnSummary}`,
          'END:VALARM',
          'END:VEVENT'
        );
        eventCount += 1;
      }
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
