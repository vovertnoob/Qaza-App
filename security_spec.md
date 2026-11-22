# Security Specification — QazaFlow Firestore Rules

## 1. Data Invariants
1. Every document under `/users/{userId}` and its subcollections (`balances`, `qazaEntries`, `activityLogs`, `dailyCheckIns`, `syncMetadata`) belongs strictly to `userId == request.auth.uid`. No user may read, list, create, update, or delete another user's records.
2. Balances (`initialBalance`, `pendingBalance`, `completedBalance`, `inboxPendingCount`) must never be negative integers (`>= 0`).
3. Prayer category IDs for `/balances/{prayerType}` are strictly restricted to `fajr | dhuhr | asr | maghrib | isha`.
4. Qaza Inbox entries (`qazaEntries`) enforce terminal state locking once `status` transitions to `completed` or `removed` (except when explicitly reversed via an undo flow or validated state transition — actually terminal locking prevents silent overwrites; undo marks `undoneByLogId` on `activityLogs` or restores via a new entry/reversal). Wait: if a user marks an inbox entry `completed` and hits Undo within 8 seconds, we either allow `completed -> pending` ONLY when `completedAt` is cleared, OR keep `completed` terminal and create a new pending entry on undo. Keeping `completed`/`removed` terminal is cleaner and guarantees Pillar 6 (Terminal State Locking) while Undo can restore the balance and add a reversal log + re-open or create a new pending entry! Let's check: actually if we allow `pending -> completed` and `pending -> removed` as terminal, then Undo from Inbox completion creates a fresh `pending` QazaEntry (or we don't mutate terminal docs) and logs an `undone` ActivityLog! That enforces strict Terminal State Locking!
5. Activity logs (`activityLogs`) are append-only on create, immutable on core fields (`id`, `userId`, `actionType`, `prayerType`, `quantity`, `previousPending`, `updatedPending`, `previousCompleted`, `updatedCompleted`, `clientTimestamp`, `createdAt`), and only allow updating `undoneByLogId` once (when `existing().get('undoneByLogId', null) == null` -> actually avoid `.get()`, require `undoneByLogId` as `""` initially and only allow `"" -> non-empty`).
6. All `createdAt` / `updatedAt` timestamps must equal `request.time`.
7. All document IDs (`userId`, `entryId`, `logId`, `dateKey`) must match strict regex and length limits (`<= 128`).

## 2. Adversarial "Dirty Dozen" Payloads
1. Cross-tenant profile read: User B attempts `get(/users/userA)`. Expected: `PERMISSION_DENIED`.
2. Cross-tenant balance write: User B attempts `set(/users/userA/balances/fajr, ...)`. Expected: `PERMISSION_DENIED`.
3. Shadow field injection on profile create: User A sends `{ uid: userA, ..., isAdmin: true }`. Expected: `PERMISSION_DENIED`.
4. Negative balance injection: User A attempts `update(/users/userA/balances/fajr, { pendingBalance: -5 })`. Expected: `PERMISSION_DENIED`.
5. Invalid prayer key path: User A attempts `set(/users/userA/balances/witr, ...)`. Expected: `PERMISSION_DENIED`.
6. Owner UID spoofing in subcollection: User A writes `/users/userA/qazaEntries/e1` with `userId: "userB"`. Expected: `PERMISSION_DENIED`.
7. Oversized ID / Denial-of-Wallet string poisoning: User A attempts write to `/users/userA/qazaEntries/<2000-char-id>`. Expected: `PERMISSION_DENIED`.
8. Client-forged `createdAt` timestamp: User A creates `activityLogs/l1` with `createdAt: Timestamp.fromDate(2020-01-01)`. Expected: `PERMISSION_DENIED`.
9. Immutable field tampering on `activityLogs`: User A attempts to change `quantity` or `actionType` on existing log. Expected: `PERMISSION_DENIED`.
10. Terminal state bypass on `qazaEntries`: User A attempts to modify a `completed` inbox entry back to `pending` or alter `prayerType`. Expected: `PERMISSION_DENIED`.
11. Unbounded array injection: User A sets `reminderAfterPrayers` to 100 strings. Expected: `PERMISSION_DENIED`.
12. Unauthenticated list/read: Anonymous unauthenticated request lists `/users/userA/activityLogs`. Expected: `PERMISSION_DENIED`.
