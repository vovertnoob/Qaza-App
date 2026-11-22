import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  onSnapshotsInSync,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  limit,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  clearGuestSnapshot,
  createEmptySnapshot,
  generateId,
  getLocalDateKey,
  loadGuestSnapshot,
  loadUserCache,
  normalizeSnapshot,
  saveGuestSnapshot,
  saveUserCache,
} from '../lib/offlineStorage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  LIMITS,
  PRAYERS,
  PRAYER_LABELS,
  type ActivityLog,
  type DailyCheckIn,
  type DailyCheckInStatus,
  type PrayerBalance,
  type PrayerType,
  type QazaEntry,
  type QazaEntrySource,
  type QazaSnapshot,
  type UndoToastItem,
  type UserProfile,
} from '../types/qaza';

export type SyncState = 'local' | 'synced' | 'syncing' | 'offline';

interface QazaContextValue {
  user: User | null;
  authLoading: boolean;
  dataLoading: boolean;
  isOnline: boolean;
  syncState: SyncState;
  hasPendingWrites: boolean;
  snapshot: QazaSnapshot;
  undoToast: UndoToastItem | null;
  dismissUndoToast: () => void;
  inAppReminder: string | null;
  dismissInAppReminder: () => void;
  hasGuestImportAvailable: boolean;
  importGuestToCloud: () => Promise<void>;
  dismissGuestImport: () => void;

  // Auth methods
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  signOutUser: () => Promise<void>;

  // Core tracking mutations
  completeOnboarding: (params: {
    initialBalances: Record<PrayerType, number>;
    routine: UserProfile['routine'];
    targetType: UserProfile['targetType'];
    targetCount: number;
    focusPrayer: UserProfile['focusPrayer'];
    startSmallMode: boolean;
  }) => Promise<void>;
  markOneCompleted: (prayer: PrayerType) => Promise<void>;
  batchComplete: (counts: Record<PrayerType, number>, isFullDay?: boolean) => Promise<void>;
  addMissedToInbox: (prayer: PrayerType, source?: QazaEntrySource, note?: string) => Promise<void>;
  completeInboxEntry: (entryId: string) => Promise<void>;
  removeInboxEntry: (entryId: string) => Promise<void>;
  undoLastAction: (toastOrLogId: UndoToastItem | string) => Promise<void>;
  adjustBalances: (
    next: Record<PrayerType, { initialBalance: number; pendingBalance: number; completedBalance: number }>
  ) => Promise<void>;
  updatePreferences: (patch: Partial<UserProfile>) => Promise<void>;
  updateDailyCheckIn: (
    prayer: PrayerType,
    status: DailyCheckInStatus,
    carryForward?: boolean
  ) => Promise<void>;
  restoreFromBackup: (incoming: QazaSnapshot) => Promise<void>;
  resetAllData: () => Promise<void>;
  markManualBackup: () => Promise<void>;
}

const QazaContext = createContext<QazaContextValue | null>(null);

export const useQaza = () => {
  const ctx = useContext(QazaContext);
  if (!ctx) throw new Error('useQaza must be used within QazaProvider');
  return ctx;
};

function sanitizeNote(note?: string): string | undefined {
  if (!note) return undefined;
  const trimmed = note.trim().slice(0, LIMITS.MAX_NOTE_LENGTH);
  return trimmed.length > 0 ? trimmed : undefined;
}

function clampBalance(n: number): number {
  if (!Number.isFinite(n) || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(LIMITS.MAX_BALANCE, Math.floor(n)));
}

export const QazaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isOnline = useOnlineStatus();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [undoToast, setUndoToast] = useState<UndoToastItem | null>(null);
  const [inAppReminder, setInAppReminder] = useState<string | null>(null);
  const [hasGuestImportAvailable, setHasGuestImportAvailable] = useState(false);

  const [snapshot, setSnapshot] = useState<QazaSnapshot>(() => {
    return loadGuestSnapshot() || createEmptySnapshot('guest');
  });

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const undoTimerRef = useRef<number | null>(null);
  const lastReminderDateRef = useRef<string | null>(null);

  const persistLocal = useCallback(
    (next: QazaSnapshot, activeUser: User | null) => {
      if (activeUser) {
        saveUserCache(activeUser.uid, next);
      } else {
        saveGuestSnapshot(next);
      }
    },
    []
  );

  // Theme application on <html>
  useEffect(() => {
    const root = document.documentElement;
    const pref = snapshot.profile.theme;
    const apply = (dark: boolean) => {
      if (dark) root.classList.add('dark');
      else root.classList.remove('dark');
    };
    if (pref === 'dark') {
      apply(true);
    } else if (pref === 'light') {
      apply(false);
    } else {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mql.matches);
      const listener = (e: MediaQueryListEvent) => apply(e.matches);
      mql.addEventListener('change', listener);
      return () => mql.removeEventListener('change', listener);
    }
  }, [snapshot.profile.theme]);

  // Gentle Reminders Checker (browser notification + in-app fallback)
  useEffect(() => {
    if (!snapshot.profile.remindersEnabled || !snapshot.profile.onboardingCompleted) return;
    const checkReminder = () => {
      const now = new Date();
      const todayKey = getLocalDateKey(now);
      if (lastReminderDateRef.current === todayKey) return;

      const [targetH, targetM] = (snapshot.profile.reminderTime || '20:00')
        .split(':')
        .map((n) => parseInt(n, 10));
      if (Number.isNaN(targetH) || Number.isNaN(targetM)) return;

      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const targetMinutes = targetH * 60 + targetM;

      if (nowMinutes >= targetMinutes && nowMinutes <= targetMinutes + 5) {
        lastReminderDateRef.current = todayKey;
        const msg =
          snapshot.profile.targetType !== 'none' && snapshot.profile.targetCount > 0
            ? `Gentle reminder: A quiet moment for your ${snapshot.profile.targetCount} Qaza target today.`
            : 'Gentle reminder: Take a calm moment to log or offer a Qaza prayer when ready.';

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification('QazaFlow Reminder', { body: msg, icon: '/pwa-192x192.png' });
          } catch {
            setInAppReminder(msg);
          }
        } else {
          setInAppReminder(msg);
        }
      }
    };

    checkReminder();
    const id = window.setInterval(checkReminder, 30000);
    return () => window.clearInterval(id);
  }, [
    snapshot.profile.remindersEnabled,
    snapshot.profile.reminderTime,
    snapshot.profile.onboardingCompleted,
    snapshot.profile.targetType,
    snapshot.profile.targetCount,
  ]);

  // Push full snapshot to Firestore (used for initial onboarding / guest migration / backup restore)
  const writeFullSnapshotToFirestore = useCallback(async (uid: string, data: QazaSnapshot) => {
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', uid);
    const nowIso = new Date().toISOString();

    batch.set(userRef, {
      uid,
      email: data.profile.email || '',
      displayName: (data.profile.displayName || 'User').slice(0, LIMITS.MAX_DISPLAY_NAME),
      onboardingCompleted: Boolean(data.profile.onboardingCompleted),
      routine: data.profile.routine,
      targetType: data.profile.targetType,
      targetCount: Math.max(0, Math.min(LIMITS.MAX_TARGET, data.profile.targetCount)),
      focusPrayer: data.profile.focusPrayer,
      startSmallMode: Boolean(data.profile.startSmallMode),
      autoCarryForward: Boolean(data.profile.autoCarryForward),
      dailyCheckInEnabled: Boolean(data.profile.dailyCheckInEnabled),
      remindersEnabled: Boolean(data.profile.remindersEnabled),
      reminderTime: (data.profile.reminderTime || '20:00').slice(0, 10),
      reminderAfterPrayers: (data.profile.reminderAfterPrayers || []).slice(0, 5),
      theme: data.profile.theme || 'light',
      lastBackupAt: data.syncMetadata.lastBackupAt || nowIso,
      lastSyncAt: nowIso,
      syncVersion: Math.max(1, data.profile.syncVersion || 1),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    for (const p of PRAYERS) {
      const b = data.balances[p.id];
      batch.set(doc(db, 'users', uid, 'balances', p.id), {
        userId: uid,
        prayerType: p.id,
        initialBalance: clampBalance(b.initialBalance),
        pendingBalance: clampBalance(b.pendingBalance),
        completedBalance: clampBalance(b.completedBalance),
        inboxPendingCount: clampBalance(b.inboxPendingCount),
        updatedAt: serverTimestamp(),
      });
    }

    batch.set(doc(db, 'users', uid, 'syncMetadata', 'state'), {
      userId: uid,
      lastBackupAt: data.syncMetadata.lastBackupAt || nowIso,
      lastSyncAt: nowIso,
      version: Math.max(1, data.syncMetadata.version || 1),
      updatedAt: serverTimestamp(),
    });

    // Write up to 150 recent entries/logs in initial batch (chunked if larger)
    const entries = data.qazaEntries.slice(0, 100);
    for (const entry of entries) {
      const entryDoc: Record<string, unknown> = {
        id: entry.id,
        userId: uid,
        prayerType: entry.prayerType,
        source: entry.source,
        status: entry.status,
        dateAdded: entry.dateAdded,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (entry.note) entryDoc.note = sanitizeNote(entry.note);
      if (entry.completedAt) entryDoc.completedAt = entry.completedAt;
      batch.set(doc(db, 'users', uid, 'qazaEntries', entry.id), entryDoc);
    }

    const logs = data.activityLogs.slice(0, 150);
    for (const log of logs) {
      const logDoc: Record<string, unknown> = {
        id: log.id,
        userId: uid,
        actionType: log.actionType,
        prayerType: log.prayerType,
        quantity: clampBalance(log.quantity),
        previousPending: clampBalance(log.previousPending),
        updatedPending: clampBalance(log.updatedPending),
        previousCompleted: clampBalance(log.previousCompleted),
        updatedCompleted: clampBalance(log.updatedCompleted),
        clientTimestamp: log.clientTimestamp,
        createdAt: serverTimestamp(),
      };
      if (log.note) logDoc.note = sanitizeNote(log.note);
      batch.set(doc(db, 'users', uid, 'activityLogs', log.id), logDoc);
    }

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  }, []);

  // Auth listener & Firestore real-time subscriptions
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubBalances: (() => void) | null = null;
    let unsubEntries: (() => void) | null = null;
    let unsubLogs: (() => void) | null = null;
    let unsubCheckIns: (() => void) | null = null;
    let unsubSync: (() => void) | null = null;
    let unsubInSync: (() => void) | null = null;

    const cleanupListeners = () => {
      unsubProfile?.();
      unsubBalances?.();
      unsubEntries?.();
      unsubLogs?.();
      unsubCheckIns?.();
      unsubSync?.();
      unsubInSync?.();
      unsubProfile = null;
      unsubBalances = null;
      unsubEntries = null;
      unsubLogs = null;
      unsubCheckIns = null;
      unsubSync = null;
      unsubInSync = null;
    };

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      cleanupListeners();
      setUser(firebaseUser);

      if (!firebaseUser) {
        const guest = loadGuestSnapshot() || createEmptySnapshot('guest');
        setSnapshot(guest);
        setHasPendingWrites(false);
        setHasGuestImportAvailable(false);
        setAuthLoading(false);
        setDataLoading(false);
        return;
      }

      const uid = firebaseUser.uid;
      setDataLoading(true);

      // Load local cache immediately for instant offline-first render
      const cached = loadUserCache(uid);
      if (cached) {
        setSnapshot(cached);
      }

      // Check if user doc exists in Firestore (or cache), or migrate guest data
      const userDocRef = doc(db, 'users', uid);
      try {
        const existingUserSnap = await getDoc(userDocRef);
        const guestSnap = loadGuestSnapshot();
        const guestHasData =
          guestSnap &&
          (guestSnap.profile.onboardingCompleted ||
            guestSnap.activityLogs.length > 0 ||
            guestSnap.qazaEntries.length > 0 ||
            PRAYERS.some((p) => guestSnap.balances[p.id].pendingBalance > 0 || guestSnap.balances[p.id].completedBalance > 0));

        if (!existingUserSnap.exists()) {
          const seed = guestHasData && guestSnap
            ? normalizeSnapshot(
                {
                  ...guestSnap,
                  profile: {
                    ...guestSnap.profile,
                    uid,
                    email: firebaseUser.email || '',
                    displayName: firebaseUser.displayName || guestSnap.profile.displayName || 'User',
                  },
                },
                uid
              )
            : createEmptySnapshot(
                uid,
                firebaseUser.email || '',
                firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'
              );

          setSnapshot(seed);
          saveUserCache(uid, seed);
          await writeFullSnapshotToFirestore(uid, seed);
          if (guestHasData) clearGuestSnapshot();
        } else if (guestHasData) {
          setHasGuestImportAvailable(true);
        }
      } catch (err) {
        console.warn('Initial user profile check offline/deferred:', err);
      }

      // Subscribe to real-time collections
      unsubProfile = onSnapshot(
        userDocRef,
        (docSnap) => {
          if (!docSnap.exists()) return;
          const d = docSnap.data();
          setSnapshot((prev) => {
            const next: QazaSnapshot = {
              ...prev,
              profile: {
                ...prev.profile,
                uid,
                email: d.email ?? firebaseUser.email ?? '',
                displayName: d.displayName ?? prev.profile.displayName,
                onboardingCompleted: Boolean(d.onboardingCompleted),
                routine: d.routine ?? prev.profile.routine,
                targetType: d.targetType ?? prev.profile.targetType,
                targetCount: Number(d.targetCount ?? prev.profile.targetCount),
                focusPrayer: d.focusPrayer ?? prev.profile.focusPrayer,
                startSmallMode: Boolean(d.startSmallMode),
                autoCarryForward: Boolean(d.autoCarryForward),
                dailyCheckInEnabled: Boolean(d.dailyCheckInEnabled),
                remindersEnabled: Boolean(d.remindersEnabled),
                reminderTime: d.reminderTime ?? '20:00',
                reminderAfterPrayers: Array.isArray(d.reminderAfterPrayers)
                  ? d.reminderAfterPrayers
                  : [],
                theme: d.theme ?? prev.profile.theme,
                lastBackupAt: d.lastBackupAt ?? prev.profile.lastBackupAt,
                lastSyncAt: d.lastSyncAt ?? prev.profile.lastSyncAt,
                syncVersion: Number(d.syncVersion ?? 1),
              },
            };
            saveUserCache(uid, next);
            return next;
          });
          setHasPendingWrites(docSnap.metadata.hasPendingWrites);
          setDataLoading(false);
        },
        (error) => handleFirestoreError(error, OperationType.GET, `users/${uid}`)
      );

      unsubBalances = onSnapshot(
        collection(db, 'users', uid, 'balances'),
        (querySnap) => {
          setSnapshot((prev) => {
            const nextBalances = { ...prev.balances };
            querySnap.forEach((d) => {
              const data = d.data();
              const pt = data.prayerType as PrayerType;
              if (pt && nextBalances[pt]) {
                nextBalances[pt] = {
                  userId: uid,
                  prayerType: pt,
                  initialBalance: clampBalance(data.initialBalance),
                  pendingBalance: clampBalance(data.pendingBalance),
                  completedBalance: clampBalance(data.completedBalance),
                  inboxPendingCount: clampBalance(data.inboxPendingCount),
                  updatedAtIso:
                    data.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
                };
              }
            });
            const next = { ...prev, balances: nextBalances };
            saveUserCache(uid, next);
            return next;
          });
          setDataLoading(false);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, `users/${uid}/balances`)
      );

      unsubEntries = onSnapshot(
        query(
          collection(db, 'users', uid, 'qazaEntries'),
          orderBy('dateAdded', 'desc'),
          limit(250)
        ),
        (querySnap) => {
          const entries: QazaEntry[] = [];
          querySnap.forEach((d) => {
            const data = d.data();
            entries.push({
              id: data.id || d.id,
              userId: uid,
              prayerType: data.prayerType,
              source: data.source,
              status: data.status,
              note: data.note,
              dateAdded: data.dateAdded,
              completedAt: data.completedAt,
            });
          });
          setSnapshot((prev) => {
            const next = { ...prev, qazaEntries: entries };
            saveUserCache(uid, next);
            return next;
          });
        },
        (error) => handleFirestoreError(error, OperationType.LIST, `users/${uid}/qazaEntries`)
      );

      unsubLogs = onSnapshot(
        query(
          collection(db, 'users', uid, 'activityLogs'),
          orderBy('clientTimestamp', 'desc'),
          limit(300)
        ),
        (querySnap) => {
          const logs: ActivityLog[] = [];
          querySnap.forEach((d) => {
            const data = d.data();
            logs.push({
              id: data.id || d.id,
              userId: uid,
              actionType: data.actionType,
              prayerType: data.prayerType,
              quantity: Number(data.quantity || 0),
              previousPending: Number(data.previousPending || 0),
              updatedPending: Number(data.updatedPending || 0),
              previousCompleted: Number(data.previousCompleted || 0),
              updatedCompleted: Number(data.updatedCompleted || 0),
              note: data.note,
              clientTimestamp: data.clientTimestamp,
              undoneByLogId: data.undoneByLogId,
            });
          });
          setSnapshot((prev) => {
            const next = { ...prev, activityLogs: logs };
            saveUserCache(uid, next);
            return next;
          });
        },
        (error) => handleFirestoreError(error, OperationType.LIST, `users/${uid}/activityLogs`)
      );

      unsubCheckIns = onSnapshot(
        query(collection(db, 'users', uid, 'dailyCheckIns'), limit(30)),
        (querySnap) => {
          const checkIns: Record<string, DailyCheckIn> = {};
          querySnap.forEach((d) => {
            const data = d.data();
            checkIns[d.id] = {
              userId: uid,
              date: data.date || d.id,
              fajr: data.fajr || 'unmarked',
              dhuhr: data.dhuhr || 'unmarked',
              asr: data.asr || 'unmarked',
              maghrib: data.maghrib || 'unmarked',
              isha: data.isha || 'unmarked',
              carriedForwardPrayers: Array.isArray(data.carriedForwardPrayers)
                ? data.carriedForwardPrayers
                : [],
            };
          });
          setSnapshot((prev) => {
            const next = { ...prev, dailyCheckIns: checkIns };
            saveUserCache(uid, next);
            return next;
          });
        },
        (error) => handleFirestoreError(error, OperationType.LIST, `users/${uid}/dailyCheckIns`)
      );

      unsubSync = onSnapshot(
        doc(db, 'users', uid, 'syncMetadata', 'state'),
        (docSnap) => {
          if (!docSnap.exists()) return;
          const d = docSnap.data();
          setSnapshot((prev) => {
            const next = {
              ...prev,
              syncMetadata: {
                userId: uid,
                lastBackupAt: d.lastBackupAt || prev.syncMetadata.lastBackupAt,
                lastSyncAt: d.lastSyncAt || prev.syncMetadata.lastSyncAt,
                version: Number(d.version || 1),
              },
            };
            saveUserCache(uid, next);
            return next;
          });
        },
        (error) => handleFirestoreError(error, OperationType.GET, `users/${uid}/syncMetadata/state`)
      );

      unsubInSync = onSnapshotsInSync(db, () => {
        setHasPendingWrites(false);
        const nowIso = new Date().toISOString();
        setSnapshot((prev) => {
          const next = {
            ...prev,
            syncMetadata: {
              ...prev.syncMetadata,
              lastSyncAt: nowIso,
            },
          };
          saveUserCache(uid, next);
          return next;
        });
      });

      setAuthLoading(false);
    });

    return () => {
      cleanupListeners();
      unsubAuth();
    };
  }, [writeFullSnapshotToFirestore]);

  const showUndoToast = useCallback((item: Omit<UndoToastItem, 'id' | 'createdAtMs'>) => {
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
    }
    const toast: UndoToastItem = {
      ...item,
      id: generateId('toast'),
      createdAtMs: Date.now(),
    };
    setUndoToast(toast);
    undoTimerRef.current = window.setTimeout(() => {
      setUndoToast(null);
    }, 8000);
  }, []);

  const dismissUndoToast = useCallback(() => {
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    setUndoToast(null);
  }, []);

  const dismissInAppReminder = useCallback(() => setInAppReminder(null), []);

  // Auth Actions
  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleAuthProvider);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName.trim()) {
        await updateProfile(cred.user, {
          displayName: displayName.trim().slice(0, LIMITS.MAX_DISPLAY_NAME),
        });
      }
      try {
        await sendEmailVerification(cred.user);
      } catch (e) {
        console.warn('Email verification send skipped:', e);
      }
    },
    []
  );

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  const importGuestToCloud = useCallback(async () => {
    if (!user) return;
    const guest = loadGuestSnapshot();
    if (!guest) {
      setHasGuestImportAvailable(false);
      return;
    }
    const current = snapshotRef.current;
    const mergedBalances = { ...current.balances };
    for (const p of PRAYERS) {
      mergedBalances[p.id] = {
        ...current.balances[p.id],
        initialBalance: current.balances[p.id].initialBalance + guest.balances[p.id].initialBalance,
        pendingBalance: current.balances[p.id].pendingBalance + guest.balances[p.id].pendingBalance,
        completedBalance:
          current.balances[p.id].completedBalance + guest.balances[p.id].completedBalance,
        inboxPendingCount:
          current.balances[p.id].inboxPendingCount + guest.balances[p.id].inboxPendingCount,
      };
    }
    const merged: QazaSnapshot = {
      ...current,
      balances: mergedBalances,
      qazaEntries: [...guest.qazaEntries, ...current.qazaEntries].slice(0, 250),
      activityLogs: [...guest.activityLogs, ...current.activityLogs].slice(0, 300),
    };
    setSnapshot(merged);
    saveUserCache(user.uid, merged);
    await writeFullSnapshotToFirestore(user.uid, merged);
    clearGuestSnapshot();
    setHasGuestImportAvailable(false);
  }, [user, writeFullSnapshotToFirestore]);

  const dismissGuestImport = useCallback(() => {
    clearGuestSnapshot();
    setHasGuestImportAvailable(false);
  }, []);

  // Helper to commit changes optimistically + to Firestore
  const commitMutation = useCallback(
    async (
      nextSnapshot: QazaSnapshot,
      firestoreWork: (uid: string) => Promise<void>,
      pathDesc: string
    ) => {
      setSnapshot(nextSnapshot);
      persistLocal(nextSnapshot, user);

      if (user) {
        if (!isOnline) setHasPendingWrites(true);
        try {
          await firestoreWork(user.uid);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, pathDesc);
        }
      }
    },
    [user, isOnline, persistLocal]
  );

  const completeOnboarding: QazaContextValue['completeOnboarding'] = useCallback(
    async ({ initialBalances, routine, targetType, targetCount, focusPrayer, startSmallMode }) => {
      const prev = snapshotRef.current;
      const uid = user?.uid || 'guest';
      const nowIso = new Date().toISOString();

      const nextBalances = { ...prev.balances };
      let totalInitial = 0;
      for (const p of PRAYERS) {
        const val = clampBalance(initialBalances[p.id] || 0);
        totalInitial += val;
        nextBalances[p.id] = {
          userId: uid,
          prayerType: p.id,
          initialBalance: val,
          pendingBalance: val,
          completedBalance: 0,
          inboxPendingCount: 0,
          updatedAtIso: nowIso,
        };
      }

      const initLogId = generateId('log');
      const initLog: ActivityLog = {
        id: initLogId,
        userId: uid,
        actionType: 'balance_adjusted',
        prayerType: 'all',
        quantity: totalInitial,
        previousPending: 0,
        updatedPending: totalInitial,
        previousCompleted: 0,
        updatedCompleted: 0,
        note: 'Initial Qaza estimate set during onboarding',
        clientTimestamp: nowIso,
      };

      const next: QazaSnapshot = {
        ...prev,
        profile: {
          ...prev.profile,
          uid,
          onboardingCompleted: true,
          routine,
          targetType,
          targetCount: Math.max(0, Math.min(LIMITS.MAX_TARGET, targetCount)),
          focusPrayer,
          startSmallMode,
          lastSyncAt: nowIso,
          syncVersion: prev.profile.syncVersion + 1,
        },
        balances: nextBalances,
        activityLogs: totalInitial > 0 ? [initLog, ...prev.activityLogs] : prev.activityLogs,
        syncMetadata: {
          ...prev.syncMetadata,
          userId: uid,
          lastSyncAt: nowIso,
          version: prev.syncMetadata.version + 1,
        },
      };

      await commitMutation(
        next,
        async (activeUid) => {
          const batch = writeBatch(db);
          batch.update(doc(db, 'users', activeUid), {
            onboardingCompleted: true,
            routine,
            targetType,
            targetCount: Math.max(0, Math.min(LIMITS.MAX_TARGET, targetCount)),
            focusPrayer,
            startSmallMode,
            lastSyncAt: nowIso,
            syncVersion: next.profile.syncVersion,
            updatedAt: serverTimestamp(),
          });
          for (const p of PRAYERS) {
            const b = nextBalances[p.id];
            batch.set(doc(db, 'users', activeUid, 'balances', p.id), {
              userId: activeUid,
              prayerType: p.id,
              initialBalance: b.initialBalance,
              pendingBalance: b.pendingBalance,
              completedBalance: b.completedBalance,
              inboxPendingCount: b.inboxPendingCount,
              updatedAt: serverTimestamp(),
            });
          }
          if (totalInitial > 0) {
            batch.set(doc(db, 'users', activeUid, 'activityLogs', initLogId), {
              id: initLogId,
              userId: activeUid,
              actionType: initLog.actionType,
              prayerType: initLog.prayerType,
              quantity: initLog.quantity,
              previousPending: initLog.previousPending,
              updatedPending: initLog.updatedPending,
              previousCompleted: initLog.previousCompleted,
              updatedCompleted: initLog.updatedCompleted,
              note: initLog.note,
              clientTimestamp: nowIso,
              createdAt: serverTimestamp(),
            });
          }
          batch.set(doc(db, 'users', activeUid, 'syncMetadata', 'state'), {
            userId: activeUid,
            lastBackupAt: next.syncMetadata.lastBackupAt,
            lastSyncAt: nowIso,
            version: next.syncMetadata.version,
            updatedAt: serverTimestamp(),
          });
          await batch.commit();
        },
        `users/${uid}/onboarding`
      );
    },
    [user, commitMutation]
  );

  const markOneCompleted = useCallback(
    async (prayer: PrayerType) => {
      const prev = snapshotRef.current;
      const uid = user?.uid || 'guest';
      const bal = prev.balances[prayer];
      if (bal.pendingBalance <= 0) return;

      const nowIso = new Date().toISOString();
      const prevPending = bal.pendingBalance;
      const nextPending = Math.max(0, prevPending - 1);
      const prevCompleted = bal.completedBalance;
      const nextCompleted = prevCompleted + 1;

      const logId = generateId('log');
      const newLog: ActivityLog = {
        id: logId,
        userId: uid,
        actionType: 'completed',
        prayerType: prayer,
        quantity: 1,
        previousPending: prevPending,
        updatedPending: nextPending,
        previousCompleted: prevCompleted,
        updatedCompleted: nextCompleted,
        clientTimestamp: nowIso,
      };

      const next: QazaSnapshot = {
        ...prev,
        balances: {
          ...prev.balances,
          [prayer]: {
            ...bal,
            pendingBalance: nextPending,
            completedBalance: nextCompleted,
            updatedAtIso: nowIso,
          },
        },
        activityLogs: [newLog, ...prev.activityLogs],
        syncMetadata: {
          ...prev.syncMetadata,
          lastSyncAt: nowIso,
          version: prev.syncMetadata.version + 1,
        },
      };

      await commitMutation(
        next,
        async (activeUid) => {
          const batch = writeBatch(db);
          batch.set(doc(db, 'users', activeUid, 'balances', prayer), {
            userId: activeUid,
            prayerType: prayer,
            initialBalance: bal.initialBalance,
            pendingBalance: nextPending,
            completedBalance: nextCompleted,
            inboxPendingCount: bal.inboxPendingCount,
            updatedAt: serverTimestamp(),
          });
          batch.set(doc(db, 'users', activeUid, 'activityLogs', logId), {
            id: logId,
            userId: activeUid,
            actionType: 'completed',
            prayerType: prayer,
            quantity: 1,
            previousPending: prevPending,
            updatedPending: nextPending,
            previousCompleted: prevCompleted,
            updatedCompleted: nextCompleted,
            clientTimestamp: nowIso,
            createdAt: serverTimestamp(),
          });
          batch.set(doc(db, 'users', activeUid, 'syncMetadata', 'state'), {
            userId: activeUid,
            lastBackupAt: next.syncMetadata.lastBackupAt,
            lastSyncAt: nowIso,
            version: next.syncMetadata.version,
            updatedAt: serverTimestamp(),
          });
          await batch.commit();
        },
        `users/${uid}/balances/${prayer}`
      );

      showUndoToast({
        logId,
        message: `${PRAYER_LABELS[prayer]} Qaza marked completed`,
        prayerType: prayer,
        quantity: 1,
        actionType: 'completed',
      });
    },
    [user, commitMutation, showUndoToast]
  );

  const batchComplete = useCallback(
    async (counts: Record<PrayerType, number>, isFullDay = false) => {
      const prev = snapshotRef.current;
      const uid = user?.uid || 'guest';
      const nowIso = new Date().toISOString();

      const appliedCounts: Partial<Record<PrayerType, number>> = {};
      let totalApplied = 0;
      let totalPrevPending = 0;
      let totalNextPending = 0;
      let totalPrevCompleted = 0;
      let totalNextCompleted = 0;

      const nextBalances = { ...prev.balances };
      for (const p of PRAYERS) {
        const b = prev.balances[p.id];
        totalPrevPending += b.pendingBalance;
        totalPrevCompleted += b.completedBalance;
        const req = clampBalance(counts[p.id] || 0);
        const usable = Math.min(req, b.pendingBalance);
        if (usable > 0) {
          appliedCounts[p.id] = usable;
          totalApplied += usable;
          nextBalances[p.id] = {
            ...b,
            pendingBalance: b.pendingBalance - usable,
            completedBalance: b.completedBalance + usable,
            updatedAtIso: nowIso,
          };
        }
        totalNextPending += nextBalances[p.id].pendingBalance;
        totalNextCompleted += nextBalances[p.id].completedBalance;
      }

      if (totalApplied === 0) return;

      const breakdown = PRAYERS.filter((p) => (appliedCounts[p.id] || 0) > 0)
        .map((p) => `${appliedCounts[p.id]} ${p.label}`)
        .join(', ');

      const logId = generateId('log');
      const newLog: ActivityLog = {
        id: logId,
        userId: uid,
        actionType: 'batch_completed',
        prayerType: 'all',
        quantity: totalApplied,
        previousPending: totalPrevPending,
        updatedPending: totalNextPending,
        previousCompleted: totalPrevCompleted,
        updatedCompleted: totalNextCompleted,
        note: isFullDay ? `Full Qaza Day (${breakdown})` : `Batch: ${breakdown}`,
        clientTimestamp: nowIso,
      };

      const next: QazaSnapshot = {
        ...prev,
        balances: nextBalances,
        activityLogs: [newLog, ...prev.activityLogs],
        syncMetadata: {
          ...prev.syncMetadata,
          lastSyncAt: nowIso,
          version: prev.syncMetadata.version + 1,
        },
      };

      await commitMutation(
        next,
        async (activeUid) => {
          const batch = writeBatch(db);
          for (const p of PRAYERS) {
            if ((appliedCounts[p.id] || 0) > 0) {
              const b = nextBalances[p.id];
              batch.set(doc(db, 'users', activeUid, 'balances', p.id), {
                userId: activeUid,
                prayerType: p.id,
                initialBalance: b.initialBalance,
                pendingBalance: b.pendingBalance,
                completedBalance: b.completedBalance,
                inboxPendingCount: b.inboxPendingCount,
                updatedAt: serverTimestamp(),
              });
            }
          }
          batch.set(doc(db, 'users', activeUid, 'activityLogs', logId), {
            id: logId,
            userId: activeUid,
            actionType: 'batch_completed',
            prayerType: 'all',
            quantity: totalApplied,
            previousPending: totalPrevPending,
            updatedPending: totalNextPending,
            previousCompleted: totalPrevCompleted,
            updatedCompleted: totalNextCompleted,
            note: newLog.note,
            clientTimestamp: nowIso,
            createdAt: serverTimestamp(),
          });
          batch.set(doc(db, 'users', activeUid, 'syncMetadata', 'state'), {
            userId: activeUid,
            lastBackupAt: next.syncMetadata.lastBackupAt,
            lastSyncAt: nowIso,
            version: next.syncMetadata.version,
            updatedAt: serverTimestamp(),
          });
          await batch.commit();
        },
        `users/${uid}/batch`
      );

      showUndoToast({
        logId,
        message: isFullDay
          ? 'Full Qaza Day logged (5 prayers)'
          : `Logged ${totalApplied} Qaza prayers`,
        prayerType: 'all',
        quantity: totalApplied,
        actionType: 'batch_completed',
        batchCounts: appliedCounts,
      });
    },
    [user, commitMutation, showUndoToast]
  );

  const addMissedToInbox = useCallback(
    async (prayer: PrayerType, source: QazaEntrySource = 'manual_inbox', note?: string) => {
      const prev = snapshotRef.current;
      const uid = user?.uid || 'guest';
      const nowIso = new Date().toISOString();
      const bal = prev.balances[prayer];
      const cleanNote = sanitizeNote(note);

      const entryId = generateId('entry');
      const entry: QazaEntry = {
        id: entryId,
        userId: uid,
        prayerType: prayer,
        source,
        status: 'pending',
        note: cleanNote,
        dateAdded: nowIso,
      };

      const nextPending = bal.pendingBalance + 1;
      const nextInboxCount = bal.inboxPendingCount + 1;

      const logId = generateId('log');
      const log: ActivityLog = {
        id: logId,
        userId: uid,
        actionType: 'missed_added',
        prayerType: prayer,
        quantity: 1,
        previousPending: bal.pendingBalance,
        updatedPending: nextPending,
        previousCompleted: bal.completedBalance,
        updatedCompleted: bal.completedBalance,
        note: cleanNote || (source === 'daily_checkin' ? 'Carried forward from daily check-in' : 'Added to Qaza Inbox'),
        clientTimestamp: nowIso,
      };

      const next: QazaSnapshot = {
        ...prev,
        balances: {
          ...prev.balances,
          [prayer]: {
            ...bal,
            pendingBalance: nextPending,
            inboxPendingCount: nextInboxCount,
            updatedAtIso: nowIso,
          },
        },
        qazaEntries: [entry, ...prev.qazaEntries],
        activityLogs: [log, ...prev.activityLogs],
        syncMetadata: {
          ...prev.syncMetadata,
          lastSyncAt: nowIso,
          version: prev.syncMetadata.version + 1,
        },
      };

      await commitMutation(
        next,
        async (activeUid) => {
          const batch = writeBatch(db);
          batch.set(doc(db, 'users', activeUid, 'balances', prayer), {
            userId: activeUid,
            prayerType: prayer,
            initialBalance: bal.initialBalance,
            pendingBalance: nextPending,
            completedBalance: bal.completedBalance,
            inboxPendingCount: nextInboxCount,
            updatedAt: serverTimestamp(),
          });
          const entryDoc: Record<string, unknown> = {
            id: entryId,
            userId: activeUid,
            prayerType: prayer,
            source,
            status: 'pending',
            dateAdded: nowIso,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (cleanNote) entryDoc.note = cleanNote;
          batch.set(doc(db, 'users', activeUid, 'qazaEntries', entryId), entryDoc);

          batch.set(doc(db, 'users', activeUid, 'activityLogs', logId), {
            id: logId,
            userId: activeUid,
            actionType: 'missed_added',
            prayerType: prayer,
            quantity: 1,
            previousPending: bal.pendingBalance,
            updatedPending: nextPending,
            previousCompleted: bal.completedBalance,
            updatedCompleted: bal.completedBalance,
            note: log.note,
            clientTimestamp: nowIso,
            createdAt: serverTimestamp(),
          });
          batch.set(doc(db, 'users', activeUid, 'syncMetadata', 'state'), {
            userId: activeUid,
            lastBackupAt: next.syncMetadata.lastBackupAt,
            lastSyncAt: nowIso,
            version: next.syncMetadata.version,
            updatedAt: serverTimestamp(),
          });
          await batch.commit();
        },
        `users/${uid}/qazaEntries/${entryId}`
      );

      showUndoToast({
        logId,
        message: `Added missed ${PRAYER_LABELS[prayer]} to Qaza Inbox`,
        prayerType: prayer,
        quantity: 1,
        actionType: 'missed_added',
        inboxEntryId: entryId,
      });
    },
    [user, commitMutation, showUndoToast]
  );

  const completeInboxEntry = useCallback(
    async (entryId: string) => {
      const prev = snapshotRef.current;
      const uid = user?.uid || 'guest';
      const entry = prev.qazaEntries.find((e) => e.id === entryId);
      if (!entry || entry.status !== 'pending') return;

      const prayer = entry.prayerType;
      const bal = prev.balances[prayer];
      const nowIso = new Date().toISOString();

      const nextPending = Math.max(0, bal.pendingBalance - 1);
      const nextCompleted = bal.completedBalance + 1;
      const nextInboxCount = Math.max(0, bal.inboxPendingCount - 1);

      const logId = generateId('log');
      const log: ActivityLog = {
        id: logId,
        userId: uid,
        actionType: 'inbox_completed',
        prayerType: prayer,
        quantity: 1,
        previousPending: bal.pendingBalance,
        updatedPending: nextPending,
        previousCompleted: bal.completedBalance,
        updatedCompleted: nextCompleted,
        note: 'Completed from Qaza Inbox',
        clientTimestamp: nowIso,
      };

      const next: QazaSnapshot = {
        ...prev,
        balances: {
          ...prev.balances,
          [prayer]: {
            ...bal,
            pendingBalance: nextPending,
            completedBalance: nextCompleted,
            inboxPendingCount: nextInboxCount,
            updatedAtIso: nowIso,
          },
        },
        qazaEntries: prev.qazaEntries.map((e) =>
          e.id === entryId ? { ...e, status: 'completed', completedAt: nowIso } : e
        ),
        activityLogs: [log, ...prev.activityLogs],
        syncMetadata: {
          ...prev.syncMetadata,
          lastSyncAt: nowIso,
          version: prev.syncMetadata.version + 1,
        },
      };

      await commitMutation(
        next,
        async (activeUid) => {
          const batch = writeBatch(db);
          batch.update(doc(db, 'users', activeUid, 'qazaEntries', entryId), {
            status: 'completed',
            completedAt: nowIso,
            updatedAt: serverTimestamp(),
          });
          batch.set(doc(db, 'users', activeUid, 'balances', prayer), {
            userId: activeUid,
            prayerType: prayer,
            initialBalance: bal.initialBalance,
            pendingBalance: nextPending,
            completedBalance: nextCompleted,
            inboxPendingCount: nextInboxCount,
            updatedAt: serverTimestamp(),
          });
          batch.set(doc(db, 'users', activeUid, 'activityLogs', logId), {
            id: logId,
            userId: activeUid,
            actionType: 'inbox_completed',
            prayerType: prayer,
            quantity: 1,
            previousPending: bal.pendingBalance,
            updatedPending: nextPending,
            previousCompleted: bal.completedBalance,
            updatedCompleted: nextCompleted,
            note: log.note,
            clientTimestamp: nowIso,
            createdAt: serverTimestamp(),
          });
          await batch.commit();
        },
        `users/${uid}/qazaEntries/${entryId}`
      );

      showUndoToast({
        logId,
        message: `Inbox ${PRAYER_LABELS[prayer]} marked completed`,
        prayerType: prayer,
        quantity: 1,
        actionType: 'inbox_completed',
        inboxEntryId: entryId,
      });
    },
    [user, commitMutation, showUndoToast]
  );

  const removeInboxEntry = useCallback(
    async (entryId: string) => {
      const prev = snapshotRef.current;
      const uid = user?.uid || 'guest';
      const entry = prev.qazaEntries.find((e) => e.id === entryId);
      if (!entry || entry.status !== 'pending') return;

      const prayer = entry.prayerType;
      const bal = prev.balances[prayer];
      const nowIso = new Date().toISOString();

      const nextPending = Math.max(0, bal.pendingBalance - 1);
      const nextInboxCount = Math.max(0, bal.inboxPendingCount - 1);

      const logId = generateId('log');
      const log: ActivityLog = {
        id: logId,
        userId: uid,
        actionType: 'balance_adjusted',
        prayerType: prayer,
        quantity: 1,
        previousPending: bal.pendingBalance,
        updatedPending: nextPending,
        previousCompleted: bal.completedBalance,
        updatedCompleted: bal.completedBalance,
        note: 'Removed incorrect entry from Qaza Inbox',
        clientTimestamp: nowIso,
      };

      const next: QazaSnapshot = {
        ...prev,
        balances: {
          ...prev.balances,
          [prayer]: {
            ...bal,
            pendingBalance: nextPending,
            inboxPendingCount: nextInboxCount,
            updatedAtIso: nowIso,
          },
        },
        qazaEntries: prev.qazaEntries.map((e) =>
          e.id === entryId ? { ...e, status: 'removed', completedAt: nowIso } : e
        ),
        activityLogs: [log, ...prev.activityLogs],
      };

      await commitMutation(
        next,
        async (activeUid) => {
          const batch = writeBatch(db);
          batch.update(doc(db, 'users', activeUid, 'qazaEntries', entryId), {
            status: 'removed',
            completedAt: nowIso,
            updatedAt: serverTimestamp(),
          });
          batch.set(doc(db, 'users', activeUid, 'balances', prayer), {
            userId: activeUid,
            prayerType: prayer,
            initialBalance: bal.initialBalance,
            pendingBalance: nextPending,
            completedBalance: bal.completedBalance,
            inboxPendingCount: nextInboxCount,
            updatedAt: serverTimestamp(),
          });
          batch.set(doc(db, 'users', activeUid, 'activityLogs', logId), {
            id: logId,
            userId: activeUid,
            actionType: 'balance_adjusted',
            prayerType: prayer,
            quantity: 1,
            previousPending: bal.pendingBalance,
            updatedPending: nextPending,
            previousCompleted: bal.completedBalance,
            updatedCompleted: bal.completedBalance,
            note: log.note,
            clientTimestamp: nowIso,
            createdAt: serverTimestamp(),
          });
          await batch.commit();
        },
        `users/${uid}/qazaEntries/${entryId}`
      );
    },
    [user, commitMutation]
  );

  const undoLastAction = useCallback(
    async (toastOrLogId: UndoToastItem | string) => {
      const prev = snapshotRef.current;
      const uid = user?.uid || 'guest';
      const logId = typeof toastOrLogId === 'string' ? toastOrLogId : toastOrLogId.logId;
      const targetLog = prev.activityLogs.find((l) => l.id === logId);
      if (!targetLog || targetLog.undoneByLogId) {
        dismissUndoToast();
        return;
      }

      const nowIso = new Date().toISOString();
      const undoLogId = generateId('log');
      const nextBalances = { ...prev.balances };
      let nextEntries = [...prev.qazaEntries];
      let newPendingEntry: QazaEntry | null = null;
      let removedEntryId: string | null = null;

      if (targetLog.actionType === 'completed' && targetLog.prayerType !== 'all') {
        const p = targetLog.prayerType;
        const b = nextBalances[p];
        const qty = targetLog.quantity;
        nextBalances[p] = {
          ...b,
          pendingBalance: b.pendingBalance + qty,
          completedBalance: Math.max(0, b.completedBalance - qty),
          updatedAtIso: nowIso,
        };
      } else if (targetLog.actionType === 'inbox_completed' && targetLog.prayerType !== 'all') {
        const p = targetLog.prayerType;
        const b = nextBalances[p];
        nextBalances[p] = {
          ...b,
          pendingBalance: b.pendingBalance + 1,
          completedBalance: Math.max(0, b.completedBalance - 1),
          inboxPendingCount: b.inboxPendingCount + 1,
          updatedAtIso: nowIso,
        };
        const reopenId = generateId('entry');
        newPendingEntry = {
          id: reopenId,
          userId: uid,
          prayerType: p,
          source: 'manual_inbox',
          status: 'pending',
          note: 'Restored by undo',
          dateAdded: nowIso,
        };
        nextEntries = [newPendingEntry, ...nextEntries];
      } else if (targetLog.actionType === 'missed_added' && targetLog.prayerType !== 'all') {
        const p = targetLog.prayerType;
        const b = nextBalances[p];
        nextBalances[p] = {
          ...b,
          pendingBalance: Math.max(0, b.pendingBalance - 1),
          inboxPendingCount: Math.max(0, b.inboxPendingCount - 1),
          updatedAtIso: nowIso,
        };
        const toastObj = typeof toastOrLogId === 'string' ? null : toastOrLogId;
        const matchEntry = toastObj?.inboxEntryId
          ? nextEntries.find((e) => e.id === toastObj.inboxEntryId && e.status === 'pending')
          : nextEntries.find((e) => e.prayerType === p && e.status === 'pending');
        if (matchEntry) {
          removedEntryId = matchEntry.id;
          nextEntries = nextEntries.map((e) =>
            e.id === matchEntry.id ? { ...e, status: 'removed', completedAt: nowIso } : e
          );
        }
      } else if (targetLog.actionType === 'batch_completed') {
        const toastObj = typeof toastOrLogId === 'string' ? null : toastOrLogId;
        const batchCounts = toastObj?.batchCounts;
        if (batchCounts) {
          for (const p of PRAYERS) {
            const qty = batchCounts[p.id] || 0;
            if (qty > 0) {
              const b = nextBalances[p.id];
              nextBalances[p.id] = {
                ...b,
                pendingBalance: b.pendingBalance + qty,
                completedBalance: Math.max(0, b.completedBalance - qty),
                updatedAtIso: nowIso,
              };
            }
          }
        } else {
          // Parse breakdown from note e.g. "Batch: 2 Fajr, 1 Dhuhr"
          const note = targetLog.note || '';
          let matchedAny = false;
          for (const p of PRAYERS) {
            const m = note.match(new RegExp(`(\\d+)\\s+${p.label}`, 'i'));
            if (m) {
              matchedAny = true;
              const qty = parseInt(m[1], 10);
              const b = nextBalances[p.id];
              nextBalances[p.id] = {
                ...b,
                pendingBalance: b.pendingBalance + qty,
                completedBalance: Math.max(0, b.completedBalance - qty),
                updatedAtIso: nowIso,
              };
            }
          }
          if (!matchedAny && targetLog.quantity === 5) {
            for (const p of PRAYERS) {
              const b = nextBalances[p.id];
              nextBalances[p.id] = {
                ...b,
                pendingBalance: b.pendingBalance + 1,
                completedBalance: Math.max(0, b.completedBalance - 1),
                updatedAtIso: nowIso,
              };
            }
          }
        }
      } else {
        dismissUndoToast();
        return;
      }

      const undoLog: ActivityLog = {
        id: undoLogId,
        userId: uid,
        actionType: 'undone',
        prayerType: targetLog.prayerType,
        quantity: targetLog.quantity,
        previousPending: targetLog.updatedPending,
        updatedPending: targetLog.previousPending,
        previousCompleted: targetLog.updatedCompleted,
        updatedCompleted: targetLog.previousCompleted,
        note: `Undid: ${targetLog.actionType.replace(/_/g, ' ')}`,
        clientTimestamp: nowIso,
      };

      const next: QazaSnapshot = {
        ...prev,
        balances: nextBalances,
        qazaEntries: nextEntries,
        activityLogs: [
          undoLog,
          ...prev.activityLogs.map((l) => (l.id === logId ? { ...l, undoneByLogId: undoLogId } : l)),
        ],
      };

      await commitMutation(
        next,
        async (activeUid) => {
          const batch = writeBatch(db);
          for (const p of PRAYERS) {
            const b = nextBalances[p.id];
            if (
              b.pendingBalance !== prev.balances[p.id].pendingBalance ||
              b.completedBalance !== prev.balances[p.id].completedBalance ||
              b.inboxPendingCount !== prev.balances[p.id].inboxPendingCount
            ) {
              batch.set(doc(db, 'users', activeUid, 'balances', p.id), {
                userId: activeUid,
                prayerType: p.id,
                initialBalance: b.initialBalance,
                pendingBalance: b.pendingBalance,
                completedBalance: b.completedBalance,
                inboxPendingCount: b.inboxPendingCount,
                updatedAt: serverTimestamp(),
              });
            }
          }
          if (newPendingEntry) {
            batch.set(doc(db, 'users', activeUid, 'qazaEntries', newPendingEntry.id), {
              id: newPendingEntry.id,
              userId: activeUid,
              prayerType: newPendingEntry.prayerType,
              source: newPendingEntry.source,
              status: 'pending',
              note: newPendingEntry.note,
              dateAdded: newPendingEntry.dateAdded,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          if (removedEntryId) {
            batch.update(doc(db, 'users', activeUid, 'qazaEntries', removedEntryId), {
              status: 'removed',
              completedAt: nowIso,
              updatedAt: serverTimestamp(),
            });
          }
          batch.update(doc(db, 'users', activeUid, 'activityLogs', logId), {
            undoneByLogId: undoLogId,
          });
          batch.set(doc(db, 'users', activeUid, 'activityLogs', undoLogId), {
            id: undoLogId,
            userId: activeUid,
            actionType: 'undone',
            prayerType: undoLog.prayerType,
            quantity: undoLog.quantity,
            previousPending: undoLog.previousPending,
            updatedPending: undoLog.updatedPending,
            previousCompleted: undoLog.previousCompleted,
            updatedCompleted: undoLog.updatedCompleted,
            note: undoLog.note,
            clientTimestamp: nowIso,
            createdAt: serverTimestamp(),
          });
          await batch.commit();
        },
        `users/${uid}/undo/${logId}`
      );

      dismissUndoToast();
    },
    [user, commitMutation, dismissUndoToast]
  );

  const adjustBalances: QazaContextValue['adjustBalances'] = useCallback(
    async (nextMap) => {
      const prev = snapshotRef.current;
      const uid = user?.uid || 'guest';
      const nowIso = new Date().toISOString();

      let prevTotalPending = 0;
      let nextTotalPending = 0;
      let prevTotalCompleted = 0;
      let nextTotalCompleted = 0;

      const nextBalances = { ...prev.balances };
      for (const p of PRAYERS) {
        const oldB = prev.balances[p.id];
        prevTotalPending += oldB.pendingBalance;
        prevTotalCompleted += oldB.completedBalance;

        const incoming = nextMap[p.id];
        const updated: PrayerBalance = {
          ...oldB,
          initialBalance: clampBalance(incoming.initialBalance),
          pendingBalance: clampBalance(incoming.pendingBalance),
          completedBalance: clampBalance(incoming.completedBalance),
          updatedAtIso: nowIso,
        };
        nextBalances[p.id] = updated;
        nextTotalPending += updated.pendingBalance;
        nextTotalCompleted += updated.completedBalance;
      }

      const logId = generateId('log');
      const log: ActivityLog = {
        id: logId,
        userId: uid,
        actionType: 'balance_adjusted',
        prayerType: 'all',
        quantity: Math.abs(nextTotalPending - prevTotalPending),
        previousPending: prevTotalPending,
        updatedPending: nextTotalPending,
        previousCompleted: prevTotalCompleted,
        updatedCompleted: nextTotalCompleted,
        note: 'Balances manually updated in Settings',
        clientTimestamp: nowIso,
      };

      const next: QazaSnapshot = {
        ...prev,
        balances: nextBalances,
        activityLogs: [log, ...prev.activityLogs],
      };

      await commitMutation(
        next,
        async (activeUid) => {
          const batch = writeBatch(db);
          for (const p of PRAYERS) {
            const b = nextBalances[p.id];
            batch.set(doc(db, 'users', activeUid, 'balances', p.id), {
              userId: activeUid,
              prayerType: p.id,
              initialBalance: b.initialBalance,
              pendingBalance: b.pendingBalance,
              completedBalance: b.completedBalance,
              inboxPendingCount: b.inboxPendingCount,
              updatedAt: serverTimestamp(),
            });
          }
          batch.set(doc(db, 'users', activeUid, 'activityLogs', logId), {
            id: logId,
            userId: activeUid,
            actionType: 'balance_adjusted',
            prayerType: 'all',
            quantity: log.quantity,
            previousPending: prevTotalPending,
            updatedPending: nextTotalPending,
            previousCompleted: prevTotalCompleted,
            updatedCompleted: nextTotalCompleted,
            note: log.note,
            clientTimestamp: nowIso,
            createdAt: serverTimestamp(),
          });
          await batch.commit();
        },
        `users/${uid}/balances`
      );
    },
    [user, commitMutation]
  );

  const updatePreferences = useCallback(
    async (patch: Partial<UserProfile>) => {
      const prev = snapshotRef.current;
      const uid = user?.uid || 'guest';
      const nowIso = new Date().toISOString();

      const updatedProfile: UserProfile = {
        ...prev.profile,
        ...patch,
        uid,
        targetCount:
          patch.targetCount !== undefined
            ? Math.max(0, Math.min(LIMITS.MAX_TARGET, Math.floor(patch.targetCount)))
            : prev.profile.targetCount,
        reminderAfterPrayers: (patch.reminderAfterPrayers ?? prev.profile.reminderAfterPrayers).slice(
          0,
          5
        ),
        lastSyncAt: nowIso,
        syncVersion: prev.profile.syncVersion + 1,
      };

      const next: QazaSnapshot = {
        ...prev,
        profile: updatedProfile,
      };

      await commitMutation(
        next,
        async (activeUid) => {
          const updatePayload: Record<string, unknown> = {
            updatedAt: serverTimestamp(),
            lastSyncAt: nowIso,
            syncVersion: updatedProfile.syncVersion,
          };
          const allowedKeys: (keyof UserProfile)[] = [
            'displayName',
            'onboardingCompleted',
            'routine',
            'targetType',
            'targetCount',
            'focusPrayer',
            'startSmallMode',
            'autoCarryForward',
            'dailyCheckInEnabled',
            'remindersEnabled',
            'reminderTime',
            'reminderAfterPrayers',
            'theme',
            'lastBackupAt',
          ];
          for (const k of allowedKeys) {
            if (k in patch) {
              updatePayload[k] = updatedProfile[k];
            }
          }
          await updateDoc(doc(db, 'users', activeUid), updatePayload);
        },
        `users/${uid}`
      );
    },
    [user, commitMutation]
  );

  const updateDailyCheckIn = useCallback(
    async (prayer: PrayerType, status: DailyCheckInStatus, carryForward = false) => {
      const prev = snapshotRef.current;
      const uid = user?.uid || 'guest';
      const dateKey = getLocalDateKey();
      const current: DailyCheckIn = prev.dailyCheckIns[dateKey] || {
        userId: uid,
        date: dateKey,
        fajr: 'unmarked',
        dhuhr: 'unmarked',
        asr: 'unmarked',
        maghrib: 'unmarked',
        isha: 'unmarked',
        carriedForwardPrayers: [],
      };

      const alreadyCarried = current.carriedForwardPrayers.includes(prayer);
      const shouldCarry = status === 'missed' && carryForward && !alreadyCarried;

      const updatedCheckIn: DailyCheckIn = {
        ...current,
        [prayer]: status,
        carriedForwardPrayers: shouldCarry
          ? [...current.carriedForwardPrayers, prayer]
          : current.carriedForwardPrayers,
      };

      const next: QazaSnapshot = {
        ...prev,
        dailyCheckIns: {
          ...prev.dailyCheckIns,
          [dateKey]: updatedCheckIn,
        },
      };

      await commitMutation(
        next,
        async (activeUid) => {
          await setDoc(doc(db, 'users', activeUid, 'dailyCheckIns', dateKey), {
            userId: activeUid,
            date: dateKey,
            fajr: updatedCheckIn.fajr,
            dhuhr: updatedCheckIn.dhuhr,
            asr: updatedCheckIn.asr,
            maghrib: updatedCheckIn.maghrib,
            isha: updatedCheckIn.isha,
            carriedForwardPrayers: updatedCheckIn.carriedForwardPrayers,
            updatedAt: serverTimestamp(),
          });
        },
        `users/${uid}/dailyCheckIns/${dateKey}`
      );

      if (shouldCarry) {
        await addMissedToInbox(prayer, 'daily_checkin', `Carried forward from ${dateKey} check-in`);
      }
    },
    [user, commitMutation, addMissedToInbox]
  );

  const restoreFromBackup = useCallback(
    async (incoming: QazaSnapshot) => {
      const uid = user?.uid || 'guest';
      const nowIso = new Date().toISOString();
      const normalized = normalizeSnapshot(incoming, uid);
      normalized.profile = {
        ...normalized.profile,
        uid,
        email: user?.email || normalized.profile.email,
        onboardingCompleted: true,
        lastBackupAt: nowIso,
        lastSyncAt: nowIso,
        syncVersion: (snapshotRef.current.profile.syncVersion || 1) + 1,
      };
      normalized.syncMetadata = {
        userId: uid,
        lastBackupAt: nowIso,
        lastSyncAt: nowIso,
        version: (snapshotRef.current.syncMetadata.version || 1) + 1,
      };

      const restoreLog: ActivityLog = {
        id: generateId('log'),
        userId: uid,
        actionType: 'restored',
        prayerType: 'all',
        quantity: PRAYERS.reduce((sum, p) => sum + normalized.balances[p.id].pendingBalance, 0),
        previousPending: PRAYERS.reduce(
          (sum, p) => sum + snapshotRef.current.balances[p.id].pendingBalance,
          0
        ),
        updatedPending: PRAYERS.reduce(
          (sum, p) => sum + normalized.balances[p.id].pendingBalance,
          0
        ),
        previousCompleted: PRAYERS.reduce(
          (sum, p) => sum + snapshotRef.current.balances[p.id].completedBalance,
          0
        ),
        updatedCompleted: PRAYERS.reduce(
          (sum, p) => sum + normalized.balances[p.id].completedBalance,
          0
        ),
        note: 'Restored tracking state from JSON backup',
        clientTimestamp: nowIso,
      };
      normalized.activityLogs = [restoreLog, ...normalized.activityLogs];

      setSnapshot(normalized);
      persistLocal(normalized, user);
      if (user) {
        await writeFullSnapshotToFirestore(user.uid, normalized);
      }
    },
    [user, persistLocal, writeFullSnapshotToFirestore]
  );

  const resetAllData = useCallback(async () => {
    const uid = user?.uid || 'guest';
    const prev = snapshotRef.current;
    const fresh = createEmptySnapshot(uid, prev.profile.email, prev.profile.displayName);
    fresh.profile.theme = prev.profile.theme;
    fresh.profile.onboardingCompleted = false;

    setSnapshot(fresh);
    persistLocal(fresh, user);

    if (user) {
      try {
        const batch = writeBatch(db);
        const [entriesSnap, logsSnap, checkInsSnap] = await Promise.all([
          getDocs(collection(db, 'users', user.uid, 'qazaEntries')),
          getDocs(collection(db, 'users', user.uid, 'activityLogs')),
          getDocs(collection(db, 'users', user.uid, 'dailyCheckIns')),
        ]);
        entriesSnap.forEach((d) => batch.delete(d.ref));
        logsSnap.forEach((d) => batch.delete(d.ref));
        checkInsSnap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        await writeFullSnapshotToFirestore(user.uid, fresh);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
      }
    }
  }, [user, persistLocal, writeFullSnapshotToFirestore]);

  const markManualBackup = useCallback(async () => {
    const nowIso = new Date().toISOString();
    const prev = snapshotRef.current;
    const uid = user?.uid || 'guest';
    const next: QazaSnapshot = {
      ...prev,
      profile: {
        ...prev.profile,
        lastBackupAt: nowIso,
      },
      syncMetadata: {
        ...prev.syncMetadata,
        lastBackupAt: nowIso,
      },
    };
    await commitMutation(
      next,
      async (activeUid) => {
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', activeUid), {
          lastBackupAt: nowIso,
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'users', activeUid, 'syncMetadata', 'state'), {
          userId: activeUid,
          lastBackupAt: nowIso,
          lastSyncAt: next.syncMetadata.lastSyncAt,
          version: next.syncMetadata.version,
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
      },
      `users/${uid}/syncMetadata/state`
    );
  }, [user, commitMutation]);

  const syncState: SyncState = useMemo(() => {
    if (!user) return 'local';
    if (!isOnline) return 'offline';
    if (hasPendingWrites) return 'syncing';
    return 'synced';
  }, [user, isOnline, hasPendingWrites]);

  const value: QazaContextValue = {
    user,
    authLoading,
    dataLoading,
    isOnline,
    syncState,
    hasPendingWrites,
    snapshot,
    undoToast,
    dismissUndoToast,
    inAppReminder,
    dismissInAppReminder,
    hasGuestImportAvailable,
    importGuestToCloud,
    dismissGuestImport,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    resendVerificationEmail,
    signOutUser,
    completeOnboarding,
    markOneCompleted,
    batchComplete,
    addMissedToInbox,
    completeInboxEntry,
    removeInboxEntry,
    undoLastAction,
    adjustBalances,
    updatePreferences,
    updateDailyCheckIn,
    restoreFromBackup,
    resetAllData,
    markManualBackup,
  };

  return <QazaContext.Provider value={value}>{children}</QazaContext.Provider>;
};
