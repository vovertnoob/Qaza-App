export type PrayerType = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type RoutineType =
  | 'after_each_prayer'
  | 'full_qaza_day'
  | 'one_prayer_at_a_time'
  | 'custom_daily'
  | 'custom_weekly';

export type TargetType = 'daily' | 'weekly' | 'none';
export type FocusPrayer = PrayerType | 'none';
export type ThemePreference = 'light' | 'dark' | 'system';

export type QazaEntrySource = 'manual_inbox' | 'daily_checkin';
export type QazaEntryStatus = 'pending' | 'completed' | 'removed';

export type ActivityActionType =
  | 'completed'
  | 'missed_added'
  | 'balance_adjusted'
  | 'batch_completed'
  | 'inbox_completed'
  | 'undone'
  | 'restored';

export type DailyCheckInStatus = 'prayed' | 'missed' | 'unmarked';

export interface PrayerMeta {
  id: PrayerType;
  label: string;
  shortLabel: string;
  timeHint: string;
}

export const PRAYERS: PrayerMeta[] = [
  { id: 'fajr', label: 'Fajr', shortLabel: 'Fajr', timeHint: 'Dawn' },
  { id: 'dhuhr', label: 'Dhuhr', shortLabel: 'Dhuhr', timeHint: 'Midday' },
  { id: 'asr', label: 'Asr', shortLabel: 'Asr', timeHint: 'Afternoon' },
  { id: 'maghrib', label: 'Maghrib', shortLabel: 'Maghrib', timeHint: 'Sunset' },
  { id: 'isha', label: 'Isha', shortLabel: 'Isha', timeHint: 'Night' },
];

export const PRAYER_LABELS: Record<PrayerType | 'all', string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
  all: 'All 5 Prayers',
};

export const ROUTINE_OPTIONS: {
  id: RoutineType;
  title: string;
  description: string;
}[] = [
  {
    id: 'after_each_prayer',
    title: 'Pair with daily Salah',
    description: 'Pray one corresponding Qaza after each daily prayer.',
  },
  {
    id: 'full_qaza_day',
    title: 'Complete one full Qaza day',
    description: 'Complete one Fajr, Dhuhr, Asr, Maghrib, and Isha as a unit.',
  },
  {
    id: 'one_prayer_at_a_time',
    title: 'Focus on one prayer category',
    description: 'Work through one prayer category at a time before moving on.',
  },
  {
    id: 'custom_daily',
    title: 'Custom daily target',
    description: 'Set a steady daily number of Qaza prayers at your own pace.',
  },
  {
    id: 'custom_weekly',
    title: 'Custom weekly target',
    description: 'Spread your Qaza goal flexibly across each week.',
  },
];

export const MILESTONES = [10, 50, 100, 500, 1000];

export const LIMITS = {
  MAX_DISPLAY_NAME: 100,
  MAX_NOTE_LENGTH: 200,
  MAX_TARGET: 500,
  MAX_BALANCE: 1000000,
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  onboardingCompleted: boolean;
  routine: RoutineType;
  targetType: TargetType;
  targetCount: number;
  focusPrayer: FocusPrayer;
  startSmallMode: boolean;
  autoCarryForward: boolean;
  dailyCheckInEnabled: boolean;
  remindersEnabled: boolean;
  reminderTime: string;
  reminderAfterPrayers: PrayerType[];
  theme: ThemePreference;
  lastBackupAt?: string;
  lastSyncAt?: string;
  syncVersion: number;
}

export interface PrayerBalance {
  userId: string;
  prayerType: PrayerType;
  initialBalance: number;
  pendingBalance: number;
  completedBalance: number;
  inboxPendingCount: number;
  updatedAtIso: string;
}

export interface QazaEntry {
  id: string;
  userId: string;
  prayerType: PrayerType;
  source: QazaEntrySource;
  status: QazaEntryStatus;
  note?: string;
  dateAdded: string;
  completedAt?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  actionType: ActivityActionType;
  prayerType: PrayerType | 'all';
  quantity: number;
  previousPending: number;
  updatedPending: number;
  previousCompleted: number;
  updatedCompleted: number;
  note?: string;
  clientTimestamp: string;
  undoneByLogId?: string;
}

export interface DailyCheckIn {
  userId: string;
  date: string; // YYYY-MM-DD
  fajr: DailyCheckInStatus;
  dhuhr: DailyCheckInStatus;
  asr: DailyCheckInStatus;
  maghrib: DailyCheckInStatus;
  isha: DailyCheckInStatus;
  carriedForwardPrayers: PrayerType[];
}

export interface SyncMetadata {
  userId: string;
  lastBackupAt: string;
  lastSyncAt: string;
  version: number;
}

export interface QazaSnapshot {
  version: number;
  exportedAt: string;
  profile: UserProfile;
  balances: Record<PrayerType, PrayerBalance>;
  qazaEntries: QazaEntry[];
  activityLogs: ActivityLog[];
  dailyCheckIns: Record<string, DailyCheckIn>;
  syncMetadata: SyncMetadata;
}

export interface UndoToastItem {
  id: string;
  logId: string;
  message: string;
  prayerType: PrayerType | 'all';
  quantity: number;
  actionType: ActivityActionType;
  inboxEntryId?: string;
  batchCounts?: Partial<Record<PrayerType, number>>;
  createdAtMs: number;
}
