import {
  PRAYERS,
  type ActivityLog,
  type DailyCheckIn,
  type DeenDayLog,
  type DeenTask,
  type PrayerBalance,
  type PrayerType,
  type QazaEntry,
  type QazaSnapshot,
  type SyncMetadata,
  type UserProfile,
} from '../types/qaza';
import { createStarterDeenTasks } from './deenPresets';

const GUEST_STATE_KEY = 'qazaflow_guest_snapshot_v1';
const USER_CACHE_PREFIX = 'qazaflow_user_cache_v1_';
const PENDING_QUEUE_PREFIX = 'qazaflow_pending_ops_v1_';

export interface PendingSyncOp {
  id: string;
  kind: string;
  timestamp: string;
}

export function createEmptySnapshot(uid = 'guest', email = '', displayName = 'Guest'): QazaSnapshot {
  const now = new Date().toISOString();
  const profile: UserProfile = {
    uid,
    email,
    displayName,
    onboardingCompleted: false,
    routine: 'custom_daily',
    targetType: 'daily',
    targetCount: 2,
    focusPrayer: 'none',
    startSmallMode: true,
    autoCarryForward: true,
    dailyCheckInEnabled: true,
    remindersEnabled: false,
    reminderTime: '20:00',
    reminderAfterPrayers: [],
    theme: 'light',
    lastBackupAt: now,
    lastSyncAt: now,
    syncVersion: 1,
  };

  const balances = {} as Record<PrayerType, PrayerBalance>;
  for (const p of PRAYERS) {
    balances[p.id] = {
      userId: uid,
      prayerType: p.id,
      initialBalance: 0,
      pendingBalance: 0,
      completedBalance: 0,
      inboxPendingCount: 0,
      updatedAtIso: now,
    };
  }

  const syncMetadata: SyncMetadata = {
    userId: uid,
    lastBackupAt: now,
    lastSyncAt: now,
    version: 1,
  };

  return {
    version: 1,
    exportedAt: now,
    profile,
    balances,
    qazaEntries: [],
    activityLogs: [],
    dailyCheckIns: {},
    deenTasks: createStarterDeenTasks(uid),
    deenLogs: {},
    syncMetadata,
  };
}

export function loadGuestSnapshot(): QazaSnapshot | null {
  try {
    const raw = localStorage.getItem(GUEST_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QazaSnapshot;
    if (!parsed?.profile || !parsed?.balances) return null;
    return normalizeSnapshot(parsed, 'guest');
  } catch {
    return null;
  }
}

export function saveGuestSnapshot(snapshot: QazaSnapshot): void {
  try {
    localStorage.setItem(GUEST_STATE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('Unable to write guest snapshot to localStorage:', err);
  }
}

export function clearGuestSnapshot(): void {
  try {
    localStorage.removeItem(GUEST_STATE_KEY);
  } catch {
    // ignore
  }
}

export function loadUserCache(uid: string): QazaSnapshot | null {
  try {
    const raw = localStorage.getItem(`${USER_CACHE_PREFIX}${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QazaSnapshot;
    if (!parsed?.profile || !parsed?.balances) return null;
    return normalizeSnapshot(parsed, uid);
  } catch {
    return null;
  }
}

export function saveUserCache(uid: string, snapshot: QazaSnapshot): void {
  try {
    localStorage.setItem(`${USER_CACHE_PREFIX}${uid}`, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('Unable to cache user snapshot locally:', err);
  }
}

export function loadPendingOps(uid: string): PendingSyncOp[] {
  try {
    const raw = localStorage.getItem(`${PENDING_QUEUE_PREFIX}${uid}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePendingOps(uid: string, ops: PendingSyncOp[]): void {
  try {
    localStorage.setItem(`${PENDING_QUEUE_PREFIX}${uid}`, JSON.stringify(ops));
  } catch {
    // ignore
  }
}

export function normalizeSnapshot(raw: Partial<QazaSnapshot>, targetUid: string): QazaSnapshot {
  const base = createEmptySnapshot(
    targetUid,
    raw.profile?.email || '',
    raw.profile?.displayName || 'User'
  );

  const profile: UserProfile = {
    ...base.profile,
    ...(raw.profile || {}),
    uid: targetUid,
    reminderAfterPrayers: Array.isArray(raw.profile?.reminderAfterPrayers)
      ? raw.profile.reminderAfterPrayers.slice(0, 5)
      : [],
  };

  const balances = { ...base.balances };
  for (const p of PRAYERS) {
    const src = raw.balances?.[p.id];
    if (src) {
      balances[p.id] = {
        userId: targetUid,
        prayerType: p.id,
        initialBalance: Math.max(0, Math.floor(Number(src.initialBalance) || 0)),
        pendingBalance: Math.max(0, Math.floor(Number(src.pendingBalance) || 0)),
        completedBalance: Math.max(0, Math.floor(Number(src.completedBalance) || 0)),
        inboxPendingCount: Math.max(0, Math.floor(Number(src.inboxPendingCount) || 0)),
        updatedAtIso: src.updatedAtIso || new Date().toISOString(),
      };
    }
  }

  const qazaEntries: QazaEntry[] = Array.isArray(raw.qazaEntries)
    ? raw.qazaEntries.map((entry) => ({
        ...entry,
        userId: targetUid,
      }))
    : [];

  const activityLogs: ActivityLog[] = Array.isArray(raw.activityLogs)
    ? raw.activityLogs.map((log) => ({
        ...log,
        userId: targetUid,
      }))
    : [];

  const dailyCheckIns: Record<string, DailyCheckIn> = {};
  if (raw.dailyCheckIns && typeof raw.dailyCheckIns === 'object') {
    for (const [dateKey, ci] of Object.entries(raw.dailyCheckIns)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey) && ci) {
        dailyCheckIns[dateKey] = {
          ...ci,
          userId: targetUid,
          date: dateKey,
        };
      }
    }
  }

  const deenTasks: DeenTask[] = Array.isArray(raw.deenTasks)
    ? raw.deenTasks.map((t, idx) => ({
        ...t,
        userId: targetUid,
        targetCount: Math.max(1, Math.min(10000, Math.floor(Number(t.targetCount) || 1))),
        sortOrder: typeof t.sortOrder === 'number' ? t.sortOrder : idx,
        isActive: typeof t.isActive === 'boolean' ? t.isActive : true,
      }))
    : createStarterDeenTasks(targetUid);

  const deenLogs: Record<string, DeenDayLog> = {};
  if (raw.deenLogs && typeof raw.deenLogs === 'object') {
    for (const [dateKey, dl] of Object.entries(raw.deenLogs)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey) && dl && typeof dl.counts === 'object') {
        const cleanCounts: Record<string, number> = {};
        for (const [tid, cnt] of Object.entries(dl.counts || {})) {
          cleanCounts[tid] = Math.max(0, Math.min(100000, Math.floor(Number(cnt) || 0)));
        }
        deenLogs[dateKey] = {
          userId: targetUid,
          date: dateKey,
          counts: cleanCounts,
          note: dl.note,
          updatedAtIso: dl.updatedAtIso,
        };
      }
    }
  }

  return {
    version: 1,
    exportedAt: raw.exportedAt || new Date().toISOString(),
    profile,
    balances,
    qazaEntries,
    activityLogs,
    dailyCheckIns,
    deenTasks,
    deenLogs,
    syncMetadata: {
      userId: targetUid,
      lastBackupAt: raw.syncMetadata?.lastBackupAt || base.syncMetadata.lastBackupAt,
      lastSyncAt: raw.syncMetadata?.lastSyncAt || base.syncMetadata.lastSyncAt,
      version: Number(raw.syncMetadata?.version) || 1,
    },
  };
}

export function generateId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now()}_${rand}`;
}

export function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
