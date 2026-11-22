import React, { useMemo, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { useQaza } from '../context/QazaContext';
import { PRAYER_LABELS, type ActivityActionType, type PrayerType } from '../types/qaza';

export const ActivityView: React.FC = () => {
  const { snapshot, undoLastAction } = useQaza();
  const [filterAction, setFilterAction] = useState<'all' | ActivityActionType>('all');
  const [filterPrayer, setFilterPrayer] = useState<'all' | PrayerType>('all');
  const [queryText, setQueryText] = useState('');

  const filteredLogs = useMemo(() => {
    return snapshot.activityLogs.filter((log) => {
      if (filterAction !== 'all' && log.actionType !== filterAction) return false;
      if (filterPrayer !== 'all' && log.prayerType !== filterPrayer) return false;
      if (queryText.trim()) {
        const q = queryText.toLowerCase();
        const label = PRAYER_LABELS[log.prayerType].toLowerCase();
        const note = (log.note || '').toLowerCase();
        const action = log.actionType.toLowerCase();
        if (!label.includes(q) && !note.includes(q) && !action.includes(q)) return false;
      }
      return true;
    });
  }, [snapshot.activityLogs, filterAction, filterPrayer, queryText]);

  const formatActionLabel = (action: ActivityActionType): string => {
    switch (action) {
      case 'completed':
        return 'Prayer Completed';
      case 'missed_added':
        return 'Missed Prayer Added';
      case 'balance_adjusted':
        return 'Balance Adjusted';
      case 'batch_completed':
        return 'Batch Completed';
      case 'inbox_completed':
        return 'Inbox Completed';
      case 'undone':
        return 'Action Undone';
      case 'restored':
        return 'Backup Restored';
    }
  };

  const canUndoLog = (action: ActivityActionType, undoneByLogId?: string) => {
    if (undoneByLogId) return false;
    return (
      action === 'completed' ||
      action === 'missed_added' ||
      action === 'batch_completed' ||
      action === 'inbox_completed'
    );
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Activity & Audit Trail</h2>
            <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
              Every completion, missed prayer, adjustment, and undo is recorded chronologically.
            </p>
          </div>
          <span className="text-xs font-mono-num text-[#5C635E] dark:text-[#9AA59E]">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A]">
            {[
              { id: 'all', label: 'All' },
              { id: 'completed', label: 'Completed' },
              { id: 'batch_completed', label: 'Batch' },
              { id: 'missed_added', label: 'Missed' },
              { id: 'balance_adjusted', label: 'Adjusted' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterAction(tab.id as typeof filterAction)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  filterAction === tab.id
                    ? 'bg-white dark:bg-[#151C19] text-[#1A1D1B] dark:text-[#F1F3F2] shadow-sm'
                    : 'text-[#5C635E] dark:text-[#9AA59E]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by prayer"
            value={filterPrayer}
            onChange={(e) => setFilterPrayer(e.target.value as 'all' | PrayerType)}
            className="min-h-[38px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-xs font-medium"
          >
            <option value="all">All Prayers</option>
            <option value="fajr">Fajr</option>
            <option value="dhuhr">Dhuhr</option>
            <option value="asr">Asr</option>
            <option value="maghrib">Maghrib</option>
            <option value="isha">Isha</option>
          </select>

          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-[#7A827D] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search notes or actions..."
              className="w-full min-h-[38px] pl-8 pr-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-xs focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
            />
          </div>
        </div>

        {/* Chronological Table / List */}
        {filteredLogs.length === 0 ? (
          <div className="py-10 text-center bg-[#F8F7F4] dark:bg-[#0E1311] rounded-xl border border-dashed border-[#E5E2DC] dark:border-[#242E2A]">
            <p className="text-sm text-[#5C635E] dark:text-[#9AA59E]">
              No matching activity logs yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A] border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl overflow-hidden">
            {filteredLogs.map((log) => {
              const reversible = canUndoLog(log.actionType, log.undoneByLogId);
              const dt = new Date(log.clientTimestamp);
              return (
                <div
                  key={log.id}
                  className={`px-4 py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 ${
                    log.undoneByLogId
                      ? 'bg-[#F8F7F4]/40 dark:bg-[#0E1311]/40 opacity-65'
                      : 'bg-white dark:bg-[#151C19]'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-medium">
                        {formatActionLabel(log.actionType)}
                      </span>
                      <span className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                        · {PRAYER_LABELS[log.prayerType]} · Qty{' '}
                        <span className="font-mono-num">{log.quantity}</span>
                      </span>
                      {log.undoneByLogId && (
                        <span className="text-xs text-[#B88E44] dark:text-[#D4AA5E]">
                          · Undone
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#7A827D] font-mono-num">
                      {dt.toLocaleDateString()} {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' · '}Pending {log.previousPending.toLocaleString()} →{' '}
                      {log.updatedPending.toLocaleString()}
                    </p>
                    {log.note && (
                      <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">{log.note}</p>
                    )}
                  </div>

                  {reversible && (
                    <button
                      type="button"
                      onClick={() => void undoLastAction(log.id)}
                      className="min-h-[38px] px-3 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] text-xs font-medium text-[#1A1D1B] dark:text-[#F1F3F2] hover:bg-[#F8F7F4] dark:hover:bg-[#0E1311] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Undo</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
