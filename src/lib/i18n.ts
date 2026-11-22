import type { DeenCategory, PrayerType, RoutineType } from '../types/qaza';

export type AppLanguage = 'en' | 'hi';

export const PRAYER_LABELS_I18N: Record<AppLanguage, Record<PrayerType | 'all', string>> = {
  en: {
    fajr: 'Fajr',
    dhuhr: 'Dhuhr',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha',
    all: 'All 5 Prayers',
  },
  hi: {
    fajr: 'फ़ज्र',
    dhuhr: 'ज़ुहर',
    asr: 'अस्र',
    maghrib: 'मग़रिब',
    isha: 'इशा',
    all: 'सभी 5 नमाज़ें',
  },
};

export const PRAYER_HINTS_I18N: Record<AppLanguage, Record<PrayerType, string>> = {
  en: {
    fajr: 'Dawn',
    dhuhr: 'Midday',
    asr: 'Afternoon',
    maghrib: 'Sunset',
    isha: 'Night',
  },
  hi: {
    fajr: 'सुबह सवेरे',
    dhuhr: 'दोपहर',
    asr: 'शाम से पहले',
    maghrib: 'सूरज डूबने पर',
    isha: 'रात',
  },
};

export const ROUTINE_I18N: Record<
  AppLanguage,
  Record<RoutineType, { title: string; description: string }>
> = {
  en: {
    after_each_prayer: {
      title: 'Pair with daily Salah',
      description: 'Pray one corresponding Qaza after each daily prayer.',
    },
    full_qaza_day: {
      title: 'Complete one full Qaza day',
      description: 'Complete one Fajr, Dhuhr, Asr, Maghrib, and Isha as a unit.',
    },
    one_prayer_at_a_time: {
      title: 'Focus on one prayer category',
      description: 'Work through one prayer category at a time before moving on.',
    },
    custom_daily: {
      title: 'Custom daily target',
      description: 'Set a steady daily number of Qaza prayers at your own pace.',
    },
    custom_weekly: {
      title: 'Custom weekly target',
      description: 'Spread your Qaza goal flexibly across each week.',
    },
  },
  hi: {
    after_each_prayer: {
      title: 'हर वक़्त की नमाज़ के साथ',
      description: 'हर फ़र्ज़ नमाज़ के बाद उसी वक़्त की एक क़ज़ा नमाज़ पढ़ें।',
    },
    full_qaza_day: {
      title: 'एक पूरा क़ज़ा दिन मुकम्मल करें',
      description: 'फ़ज्र, ज़ुहर, अस्र, मग़रिब और इशा—पांचों एक साथ पूरी करें।',
    },
    one_prayer_at_a_time: {
      title: 'एक समय में एक नमाज़ पर ध्यान',
      description: 'पहले एक नमाज़ (जैसे फ़ज्र) पूरी करें, फिर अगली शुरू करें।',
    },
    custom_daily: {
      title: 'अपना रोज़ाना लक्ष्य',
      description: 'अपनी सहूलियत के हिसाब से रोज़ की क़ज़ा गिनती तय करें।',
    },
    custom_weekly: {
      title: 'हफ़्तावार लक्ष्य',
      description: 'पूरे हफ़्ते में अपनी सहूलियत से क़ज़ा नमाज़ें पूरी करें।',
    },
  },
};

export const DEEN_CATEGORY_LABELS: Record<AppLanguage, Record<DeenCategory, string>> = {
  en: {
    tasbeeh: 'Tasbeeh / Dhikr',
    quran: 'Quran',
    sunnah: 'Sunnah & Nafl',
    dua: 'Dua & Adhkar',
    charity: 'Charity / Good Deed',
    custom: 'Custom',
  },
  hi: {
    tasbeeh: 'तस्बीह / ज़िक्र',
    quran: 'क़ुरआन',
    sunnah: 'सुन्नत और नफ़्ल',
    dua: 'दुआ और अज़कार',
    charity: 'सदक़ा / नेक काम',
    custom: 'कस्टम',
  },
};

export const DEEN_UNIT_LABELS: Record<AppLanguage, Record<string, string>> = {
  en: {
    times: 'times',
    page: 'page',
    pages: 'pages',
    set: 'set',
    rakat: 'rakat',
    time: 'time',
    minutes: 'min',
  },
  hi: {
    times: 'बार',
    page: 'सफ़हा',
    pages: 'सफ़हे',
    set: 'सेट',
    rakat: 'रकात',
    time: 'बार',
    minutes: 'मिनट',
  },
};

export const UNIT_SUGGESTIONS = ['times', 'page', 'pages', 'set', 'rakat', 'minutes'];

export function translateUnit(lang: AppLanguage, unit: string): string {
  const key = unit.trim().toLowerCase();
  return DEEN_UNIT_LABELS[lang][key] || unit;
}
