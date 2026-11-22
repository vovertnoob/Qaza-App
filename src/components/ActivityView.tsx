import React, { useMemo, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useQaza } from '../context/QazaContext';
import type { ActivityActionType, PrayerType } from '../types/qaza';

export const ActivityView: React.FC = () => {
  const { snapshot, undoLastAction } = useQaza();
  const { lang, tr, prayerLabel } = useLanguage();
  const [filterAction, setFilterAction] = useState<'all' | ActivityActionType>('all');
  const [filterPrayer, setFilterPrayer] = useState<'all' | PrayerType>('all');
  const [queryText, setQueryText] = useState('');

  const filteredLogs = useMemo(() => {
    return snapshot.activityLogs.filter((log) => {
      if (filterAction !== 'all' && log.actionType !== filterAction) return false;
      if (filterPrayer !== 'all' && log.prayerType !== filterPrayer) return false;
      if (queryText.trim()) {
        const q = queryText.toLowerCase();
        const label = prayerLabel(log.prayerType).toLowerCase();
        const note = (log.note || '').toLowerCase();
        const action = log.actionType.toLowerCase();
        if (!label.includes(q) && !note.includes(q) && !action.includes(q)) return false;
      }
      return true;
    });
  }, [snapshot.activityLogs, filterAction, filterPrayer, queryText, prayerLabel]);

  const formatActionLabel = (action: ActivityActionType): string => {
    switch (action) {
      case 'completed':
        return tr('Prayer Completed', 'नमाज़ पूरी हुई');
      case 'missed_added':
        return tr('Missed Prayer Added', 'छूटी नमाज़ जोड़ी गई');
      case 'balance_adjusted':
        return tr('Balance Adjusted', 'हिसाब बदला गया');
      case 'batch_completed':
        return tr('Batch Completed', 'एक साथ पूरी हुईं');
      case 'inbox_completed':
        return tr('Inbox Completed', 'इनबॉक्स पूरी हुई');
      case 'undone':
        return tr('Action Undone', 'वापस लिया गया');
      case 'restored':
        return tr('Backup Restored', 'बैकअप वापस आया');
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
            <h2 className="text-lg font-semibold">
              {tr('Activity & Audit Trail', 'गतिविधि और पूरा इतिहास')}
            </h2>
            <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
              {tr(
                'Every completion, missed prayer, adjustment, and undo is recorded chronologically.',
                'हर पूरी की गई नमाज़, छूटी नमाज़ और बदलाव यहाँ समय के हिसाब से दर्ज रहता है।'
              )}
            </p>
          </div>
          <span className="text-xs font-mono-num text-[#5C635E] dark:text-[#9AA59E]">
            {filteredLogs.length} {tr(filteredLogs.length === 1 ? 'entry' : 'entries', 'रिकॉर्ड')}
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A]">
            {[
              { id: 'all', label: tr('All', 'सभी') },
              { id: 'completed', label: tr('Completed', 'पूरी') },
              { id: 'batch_completed', label: tr('Batch', 'बैच') },
              { id: 'missed_added', label: tr('Missed', 'छूटी') },
              { id: 'balance_adjusted', label: tr('Adjusted', 'बदलाव') },
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
            aria-label={tr('Filter by prayer', 'नमाज़ से फ़िल्टर करें')}
            value={filterPrayer}
            onChange={(e) => setFilterPrayer(e.target.value as 'all' | PrayerType)}
            className="min-h-[38px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-xs font-medium"
          >
            <option value="all">{tr('All Prayers', 'सभी नमाज़ें')}</option>
            <option value="fajr">{prayerLabel('fajr')}</option>
            <option value="dhuhr">{prayerLabel('dhuhr')}</option>
            <option value="asr">{prayerLabel('asr')}</option>
            <option value="maghrib">{prayerLabel('maghrib')}</option>
            <option value="isha">{prayerLabel('isha')}</option>
          </select>

          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-[#7A827D] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder={tr('Search notes or actions...', 'नोट या काम खोजें...')}
              className="w-full min-h-[38px] pl-8 pr-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-xs focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
            />
          </div>
        </div>

        {/* List */}
        {filteredLogs.length === 0 ? (
          <div className="py-10 text-center bg-[#F8F7F4] dark:bg-[#0E1311] rounded-xl border border-dashed border-[#E5E2DC] dark:border-[#242E2A]">
            <p className="text-sm text-[#5C635E] dark:text-[#9AA59E]">
              {tr('No matching activity logs yet.', 'कोई गतिविधि नहीं मिली।')}
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
                        · {prayerLabel(log.prayerType)} · {tr('Qty', 'संख्या')}{' '}
                        <span className="font-mono-num">{log.quantity}</span>
                      </span>
                      {log.undoneByLogId && (
                        <span className="text-xs text-[#B88E44] dark:text-[#D4AA5E]">
                          · {tr('Undone', 'वापस लिया')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#7A827D] font-mono-num">
                      {dt.toLocaleDateString(lang === 'hi' ? 'hi-IN' : [])}{' '}
                      {dt.toLocaleTimeString(lang === 'hi' ? 'hi-IN' : [], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' · '}
                      {tr('Pending', 'बाक़ी')} {log.previousPending.toLocaleString()} →{' '}
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
                      <span>{tr('Undo', 'वापस लें')}</span>
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
