import type { DeenCategory, DeenFrequency, DeenTask } from '../types/qaza';

export interface DeenTemplate {
  key: string;
  title: string;
  titleHi: string;
  subtitle: string;
  subtitleHi: string;
  category: DeenCategory;
  targetCount: number;
  unit: string;
  frequency: DeenFrequency;
  starter?: boolean;
}

export const DEEN_TEMPLATES: DeenTemplate[] = [
  {
    key: 'pahla_kalma',
    title: 'Pahla Kalma Tasbeeh',
    titleHi: 'पहला कलमा तस्बीह',
    subtitle: 'La ilaha illallahu Muhammadur Rasulullah',
    subtitleHi: 'ला इलाहा इल्लल्लाहु मुहम्मदुर रसूलुल्लाह',
    category: 'tasbeeh',
    targetCount: 100,
    unit: 'times',
    frequency: 'daily',
    starter: true,
  },
  {
    key: 'astaghfar',
    title: 'Astaghfar (Istighfar)',
    titleHi: 'अस्तग़फ़ार (इस्तिग़फ़ार)',
    subtitle: 'Astaghfirullaha Rabbi min kulli dhanb',
    subtitleHi: 'अस्तग़फ़िरुल्लाह रब्बी मिन कुल्लि ज़म्बिन',
    category: 'tasbeeh',
    targetCount: 100,
    unit: 'times',
    frequency: 'daily',
    starter: true,
  },
  {
    key: 'durood_sharif',
    title: 'Durood Sharif',
    titleHi: 'दुरूद शरीफ़',
    subtitle: 'Send salutations upon the Prophet (SAW)',
    subtitleHi: 'नबी (स.अ.व.) पर दुरूद भेजें',
    category: 'tasbeeh',
    targetCount: 100,
    unit: 'times',
    frequency: 'daily',
    starter: true,
  },
  {
    key: 'quran_page',
    title: 'Quran Tilawat',
    titleHi: 'क़ुरआन तिलावत',
    subtitle: 'Read at least 1 page daily with reflection',
    subtitleHi: 'रोज़ कम से कम 1 सफ़हा क़ुरआन पढ़ें',
    category: 'quran',
    targetCount: 1,
    unit: 'page',
    frequency: 'daily',
    starter: true,
  },
  {
    key: 'tasbeeh_fatima',
    title: 'Tasbeeh-e-Fatima (33-33-34)',
    titleHi: 'तस्बीह-ए-फ़ातिमा (33-33-34)',
    subtitle: '33x SubhanAllah, 33x Alhamdulillah, 34x Allahu Akbar',
    subtitleHi: '33 बार सुब्हानल्लाह, 33 बार अल्हम्दुलिल्लाह, 34 बार अल्लाहु अकबर',
    category: 'tasbeeh',
    targetCount: 1,
    unit: 'set',
    frequency: 'daily',
    starter: true,
  },
  {
    key: 'subhanallahi_bihamdihi',
    title: 'SubhanAllahi wa bihamdihi',
    titleHi: 'सुब्हानल्लाहि व बिहम्दिहि',
    subtitle: '100x morning/evening dhikr',
    subtitleHi: 'सुबह या शाम 100 बार ज़िक्र',
    category: 'tasbeeh',
    targetCount: 100,
    unit: 'times',
    frequency: 'daily',
  },
  {
    key: 'morning_evening_adhkar',
    title: 'Morning & Evening Adhkar',
    titleHi: 'सुबह व शाम के अज़कार',
    subtitle: 'Daily protection duas after Fajr and Asr',
    subtitleHi: 'फ़ज्र और अस्र के बाद हिफ़ाज़त की दुआएं',
    category: 'dua',
    targetCount: 1,
    unit: 'set',
    frequency: 'daily',
  },
  {
    key: 'tahajjud',
    title: 'Tahajjud Prayer',
    titleHi: 'तहज्जुद की नमाज़',
    subtitle: 'Night voluntary prayer before Fajr',
    subtitleHi: 'फ़ज्र से पहले रात की नफ़्ल नमाज़',
    category: 'sunnah',
    targetCount: 2,
    unit: 'rakat',
    frequency: 'daily',
  },
  {
    key: 'surah_mulk',
    title: 'Surah Al-Mulk before sleep',
    titleHi: 'सोने से पहले सूरह मुल्क',
    subtitle: 'Daily recitation before sleeping',
    subtitleHi: 'रात को सोने से पहले तिलावत',
    category: 'quran',
    targetCount: 1,
    unit: 'time',
    frequency: 'daily',
  },
  {
    key: 'surah_kahf',
    title: 'Surah Al-Kahf (Friday)',
    titleHi: 'सूरह अल-कहफ़ (जुमा)',
    subtitle: 'Weekly Jummah recitation',
    subtitleHi: 'हर जुमे की तिलावत',
    category: 'quran',
    targetCount: 1,
    unit: 'time',
    frequency: 'weekly',
  },
  {
    key: 'weekly_sadaqah',
    title: 'Sadaqah / Charity',
    titleHi: 'सदक़ा / ख़ैरात',
    subtitle: 'Give any amount for the sake of Allah',
    subtitleHi: 'अल्लाह की राह में अपनी हैसियत के मुताबिक़ मदद',
    category: 'charity',
    targetCount: 1,
    unit: 'time',
    frequency: 'weekly',
  },
];

export function createStarterDeenTasks(userId = 'guest'): DeenTask[] {
  const nowIso = new Date().toISOString();
  return DEEN_TEMPLATES.filter((t) => t.starter).map((tpl, idx) => ({
    id: `deen_${tpl.key}`,
    userId,
    title: tpl.title,
    titleHi: tpl.titleHi,
    category: tpl.category,
    targetCount: tpl.targetCount,
    unit: tpl.unit,
    frequency: tpl.frequency,
    isActive: true,
    sortOrder: idx,
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
  }));
}
