import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Minus,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useQaza } from '../context/QazaContext';
import { DEEN_TEMPLATES } from '../lib/deenPresets';
import { UNIT_SUGGESTIONS } from '../lib/i18n';
import { getLocalDateKey } from '../lib/offlineStorage';
import type { DeenCategory, DeenFrequency, DeenTask } from '../types/qaza';

type DeenSubTab = 'daily' | 'weekly' | 'monthly' | 'calendar' | 'customize';

const CATEGORIES: DeenCategory[] = ['tasbeeh', 'quran', 'sunnah', 'dua', 'charity', 'custom'];

function addDays(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d + delta);
  return getLocalDateKey(dt);
}

function startOfWeekMonday(date: Date): Date {
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
}

function getWeekDateKeys(mondayDate: Date): string[] {
  const keys: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const dt = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + i);
    keys.push(getLocalDateKey(dt));
  }
  return keys;
}

export const DeenTrackerView: React.FC = () => {
  const {
    snapshot,
    upsertDeenTask,
    deleteDeenTask,
    logDeenProgress,
    updateDeenDayNote,
  } = useQaza();
  const { lang, tr, deenCategoryLabel, deenTaskTitle, deenUnit } = useLanguage();

  const todayKey = getLocalDateKey();
  const [subTab, setSubTab] = useState<DeenSubTab>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [tasbeehTaskId, setTasbeehTaskId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>(() => snapshot.deenLogs[todayKey]?.note || '');
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  // Weekly & Monthly selectors
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekMonday(new Date()));
  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Customize form state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formTitleHi, setFormTitleHi] = useState('');
  const [formCategory, setFormCategory] = useState<DeenCategory>('tasbeeh');
  const [formTargetText, setFormTargetText] = useState('100');
  const [formUnit, setFormUnit] = useState('times');
  const [formFrequency, setFormFrequency] = useState<DeenFrequency>('daily');
  const [savingTask, setSavingTask] = useState(false);

  const allTasks = useMemo(
    () => [...snapshot.deenTasks].sort((a, b) => a.sortOrder - b.sortOrder),
    [snapshot.deenTasks]
  );
  const activeTasks = useMemo(() => allTasks.filter((t) => t.isActive), [allTasks]);
  const activeDailyTasks = useMemo(
    () => activeTasks.filter((t) => t.frequency === 'daily'),
    [activeTasks]
  );
  const activeWeeklyTasks = useMemo(
    () => activeTasks.filter((t) => t.frequency === 'weekly'),
    [activeTasks]
  );

  const handleSelectDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    setNoteDraft(snapshot.deenLogs[dateKey]?.note || '');
    setNoteSavedFeedback(false);
  };

  // Current week keys relative to selectedDate for weekly task progress display
  const selectedDateWeekKeys = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map((n) => parseInt(n, 10));
    return getWeekDateKeys(startOfWeekMonday(new Date(y, m - 1, d)));
  }, [selectedDate]);

  const getCountForDate = (dateKey: string, taskId: string): number =>
    snapshot.deenLogs[dateKey]?.counts?.[taskId] || 0;

  const getWeekSumForTask = (weekKeys: string[], taskId: string): number =>
    weekKeys.reduce((sum, dk) => sum + getCountForDate(dk, taskId), 0);

  // KPI 1: Today's Daily Tasks Done
  const todayStats = useMemo(() => {
    const total = activeDailyTasks.length;
    if (total === 0) return { done: 0, total: 0, pct: 0 };
    const done = activeDailyTasks.filter(
      (t) => getCountForDate(todayKey, t.id) >= t.targetCount
    ).length;
    return { done, total, pct: Math.round((done / total) * 100) };
  }, [activeDailyTasks, snapshot.deenLogs, todayKey]);

  // KPI 2: Consistency Streak (consecutive days with >= 1 task completed, ending today or yesterday)
  const streakDays = useMemo(() => {
    if (activeTasks.length === 0) return 0;
    const isDayCompleted = (dateKey: string) => {
      const counts = snapshot.deenLogs[dateKey]?.counts;
      if (!counts) return false;
      return activeTasks.some((t) => (counts[t.id] || 0) >= t.targetCount);
    };

    let streak = 0;
    let cursor = isDayCompleted(todayKey) ? todayKey : addDays(todayKey, -1);
    for (let i = 0; i < 365; i += 1) {
      if (isDayCompleted(cursor)) {
        streak += 1;
        cursor = addDays(cursor, -1);
      } else {
        break;
      }
    }
    return streak;
  }, [activeTasks, snapshot.deenLogs, todayKey]);

  // Weekly Analytics
  const weekKeys = useMemo(() => getWeekDateKeys(weekStart), [weekStart]);
  const weeklyAnalytics = useMemo(() => {
    const days = weekKeys.map((dk) => {
      const [y, m, d] = dk.split('-').map((n) => parseInt(n, 10));
      const dt = new Date(y, m - 1, d);
      const dayLabel = dt.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', {
        weekday: 'short',
      });
      const doneDaily = activeDailyTasks.filter(
        (t) => getCountForDate(dk, t.id) >= t.targetCount
      ).length;
      const totalDaily = activeDailyTasks.length;
      const pct = totalDaily > 0 ? Math.round((doneDaily / totalDaily) * 100) : 0;
      const totalReps = activeTasks.reduce((acc, t) => acc + getCountForDate(dk, t.id), 0);
      return { dateKey: dk, dayNum: d, dayLabel, doneDaily, totalDaily, pct, totalReps };
    });

    const possibleDailySlots = activeDailyTasks.length * 7;
    const hitDailySlots = days.reduce((s, d) => s + d.doneDaily, 0);
    const weeklyDone = activeWeeklyTasks.filter(
      (t) => getWeekSumForTask(weekKeys, t.id) >= t.targetCount
    ).length;
    const totalSlots = possibleDailySlots + activeWeeklyTasks.length;
    const totalHit = hitDailySlots + weeklyDone;
    const ratePct = totalSlots > 0 ? Math.round((totalHit / totalSlots) * 100) : 0;
    const totalVolume = days.reduce((s, d) => s + d.totalReps, 0);

    const taskBreakdown = activeTasks.map((t) => {
      const weekSum = getWeekSumForTask(weekKeys, t.id);
      const daysHit = weekKeys.filter((dk) => getCountForDate(dk, t.id) >= t.targetCount).length;
      const pct =
        t.frequency === 'daily'
          ? Math.round((daysHit / 7) * 100)
          : Math.min(100, Math.round((weekSum / t.targetCount) * 100));
      return { task: t, weekSum, daysHit, pct };
    });

    return { days, ratePct, totalVolume, hitDailySlots, possibleDailySlots, taskBreakdown };
  }, [weekKeys, activeDailyTasks, activeWeeklyTasks, activeTasks, snapshot.deenLogs, lang]);

  // Monthly Analytics & Calendar Days
  const monthlyAnalytics = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();

    const monthKeys: string[] = [];
    for (let d = 1; d <= daysInMonth; d += 1) {
      monthKeys.push(
        `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      );
    }

    // For elapsed days if current month
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
    const isFutureMonth =
      year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());
    const elapsedDays = isFutureMonth ? 0 : isCurrentMonth ? now.getDate() : daysInMonth;

    let activeDaysCount = 0;
    let totalDailyHits = 0;

    const calendarCells: {
      day: number | null;
      dateKey: string | null;
      doneDaily: number;
      totalDaily: number;
      pct: number;
      hasAnyLog: boolean;
    }[] = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      calendarCells.push({
        day: null,
        dateKey: null,
        doneDaily: 0,
        totalDaily: 0,
        pct: 0,
        hasAnyLog: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d += 1) {
      const dk = monthKeys[d - 1];
      const doneDaily = activeDailyTasks.filter(
        (t) => getCountForDate(dk, t.id) >= t.targetCount
      ).length;
      const totalDaily = activeDailyTasks.length;
      const hasAnyLog = activeTasks.some((t) => getCountForDate(dk, t.id) > 0);
      const pct = totalDaily > 0 ? Math.round((doneDaily / totalDaily) * 100) : hasAnyLog ? 100 : 0;
      if (doneDaily > 0 || hasAnyLog) activeDaysCount += 1;
      totalDailyHits += doneDaily;

      calendarCells.push({
        day: d,
        dateKey: dk,
        doneDaily,
        totalDaily,
        pct,
        hasAnyLog,
      });
    }

    const denominator = Math.max(1, elapsedDays) * Math.max(1, activeDailyTasks.length);
    const overallPct =
      elapsedDays === 0 || activeDailyTasks.length === 0
        ? 0
        : Math.min(100, Math.round((totalDailyHits / denominator) * 100));

    const taskStats = activeTasks.map((t) => {
      const totalCount = monthKeys.reduce((sum, dk) => sum + getCountForDate(dk, t.id), 0);
      const daysHit = monthKeys.filter((dk) => getCountForDate(dk, t.id) >= t.targetCount).length;
      const pct =
        elapsedDays === 0
          ? 0
          : t.frequency === 'daily'
            ? Math.min(100, Math.round((daysHit / elapsedDays) * 100))
            : Math.min(100, Math.round((totalCount / Math.max(1, t.targetCount * 4)) * 100));
      return { task: t, totalCount, daysHit, pct };
    });

    return {
      monthKeys,
      daysInMonth,
      elapsedDays,
      activeDaysCount,
      overallPct,
      calendarCells,
      taskStats,
    };
  }, [monthCursor, activeDailyTasks, activeTasks, snapshot.deenLogs]);

  const tasbeehTask = useMemo(
    () => allTasks.find((t) => t.id === tasbeehTaskId) || null,
    [allTasks, tasbeehTaskId]
  );

  const handleSaveNote = async () => {
    await updateDeenDayNote(selectedDate, noteDraft);
    setNoteSavedFeedback(true);
    window.setTimeout(() => setNoteSavedFeedback(false), 3000);
  };

  const resetCustomForm = () => {
    setEditingTaskId(null);
    setFormTitle('');
    setFormTitleHi('');
    setFormCategory('tasbeeh');
    setFormTargetText('100');
    setFormUnit('times');
    setFormFrequency('daily');
  };

  const startEditTask = (task: DeenTask) => {
    setEditingTaskId(task.id);
    setFormTitle(task.title);
    setFormTitleHi(task.titleHi || '');
    setFormCategory(task.category);
    setFormTargetText(String(task.targetCount));
    setFormUnit(task.unit);
    setFormFrequency(task.frequency);
    setSubTab('customize');
  };

  const handleSaveCustomTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSavingTask(true);
    try {
      const parsedTarget = Math.max(1, Math.min(10000, parseInt(formTargetText, 10) || 1));
      await upsertDeenTask({
        id: editingTaskId || undefined,
        title: formTitle.trim(),
        titleHi: formTitleHi.trim() || undefined,
        category: formCategory,
        targetCount: parsedTarget,
        unit: formUnit.trim() || 'times',
        frequency: formFrequency,
        isActive: true,
      });
      resetCustomForm();
    } finally {
      setSavingTask(false);
    }
  };

  const handleQuickAddTemplate = async (tplKey: string) => {
    const tpl = DEEN_TEMPLATES.find((t) => t.key === tplKey);
    if (!tpl) return;
    await upsertDeenTask({
      title: tpl.title,
      titleHi: tpl.titleHi,
      category: tpl.category,
      targetCount: tpl.targetCount,
      unit: tpl.unit,
      frequency: tpl.frequency,
      isActive: true,
    });
  };

  const renderTaskRow = (task: DeenTask, dateKey: string) => {
    const dayCount = getCountForDate(dateKey, task.id);
    const weekSum =
      task.frequency === 'weekly' ? getWeekSumForTask(selectedDateWeekKeys, task.id) : dayCount;
    const progressCount = task.frequency === 'weekly' ? weekSum : dayCount;
    const pct = Math.min(100, Math.round((progressCount / task.targetCount) * 100));
    const isCompleted = progressCount >= task.targetCount;
    const quickStep = task.targetCount >= 50 ? 10 : task.targetCount >= 10 ? 5 : 1;

    return (
      <div
        key={task.id}
        className={`p-4 sm:p-5 rounded-xl border transition-colors space-y-3 ${
          isCompleted
            ? 'border-[#1B4D3E]/40 dark:border-[#2A6F5A]/50 bg-[#1B4D3E]/5 dark:bg-[#2A6F5A]/12'
            : 'border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19]'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isCompleted && (
                <CheckCircle2 className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2] shrink-0" />
              )}
              <h3 className="text-sm sm:text-base font-semibold text-[#1A1D1B] dark:text-[#F1F3F2]">
                {deenTaskTitle(task)}
              </h3>
            </div>
            <p className="text-xs text-[#7A827D] mt-0.5">
              {deenCategoryLabel(task.category)} ·{' '}
              {task.frequency === 'daily' ? tr('Daily', 'रोज़ाना') : tr('Weekly', 'हफ़्तावार')}
              {task.frequency === 'weekly' && dayCount > 0
                ? ` · ${tr('Today', 'आज')}: ${dayCount}`
                : ''}
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className="text-sm sm:text-base font-semibold font-mono-num text-[#1A1D1B] dark:text-[#F1F3F2]">
              {progressCount.toLocaleString()} / {task.targetCount.toLocaleString()}{' '}
              <span className="text-xs font-normal text-[#5C635E] dark:text-[#9AA59E]">
                {deenUnit(task.unit)}
              </span>
            </p>
            <p className="text-[11px] font-mono-num text-[#1B4D3E] dark:text-[#7FD1B2]">{pct}%</p>
          </div>
        </div>

        <div className="h-2 w-full rounded-full bg-[#F1EFE9] dark:bg-[#242E2A] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#1B4D3E] dark:bg-[#2E7D5B] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={dayCount <= 0}
              onClick={() => void logDeenProgress(dateKey, task.id, -1, false)}
              aria-label={tr('Decrease by 1', '1 घटाएं')}
              className="min-h-[38px] min-w-[38px] px-2.5 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-xs font-mono-num disabled:opacity-40 inline-flex items-center justify-center"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => void logDeenProgress(dateKey, task.id, 1, false)}
              className="min-h-[38px] px-3 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:border-[#1B4D3E] text-xs font-mono-num font-medium"
            >
              +1
            </button>

            {quickStep > 1 && (
              <button
                type="button"
                onClick={() => void logDeenProgress(dateKey, task.id, quickStep, false)}
                className="min-h-[38px] px-3 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:border-[#1B4D3E] text-xs font-mono-num font-medium"
              >
                +{quickStep}
              </button>
            )}

            {task.targetCount >= 33 && (
              <button
                type="button"
                onClick={() => void logDeenProgress(dateKey, task.id, 33, false)}
                className="min-h-[38px] px-3 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] hover:border-[#1B4D3E] text-xs font-mono-num font-medium"
              >
                +33
              </button>
            )}

            {task.targetCount >= 10 && (
              <button
                type="button"
                onClick={() => setTasbeehTaskId(task.id)}
                className="min-h-[38px] px-3 rounded-lg border border-[#1B4D3E]/30 dark:border-[#2A6F5A]/50 bg-[#1B4D3E]/8 dark:bg-[#2A6F5A]/15 text-[#1B4D3E] dark:text-[#7FD1B2] text-xs font-medium inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{tr('Tap Counter', 'तस्बीह गिनें')}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              void logDeenProgress(
                dateKey,
                task.id,
                isCompleted ? 0 : task.targetCount,
                true
              )
            }
            className={`min-h-[38px] px-3.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              isCompleted
                ? 'border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-[#5C635E] dark:text-[#9AA59E]'
                : 'bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white hover:bg-[#143B2F]'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isCompleted ? tr('Reset Day', 'रीसेट') : tr('Mark Done', 'पूरा करें')}</span>
          </button>
        </div>
      </div>
    );
  };

  const formattedSelectedDate = useMemo(() => {
    if (selectedDate === todayKey) return tr('Today', 'आज');
    const [y, m, d] = selectedDate.split('-').map((n) => parseInt(n, 10));
    return new Date(y, m - 1, d).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, [selectedDate, todayKey, lang, tr]);

  const weekRangeLabel = useMemo(() => {
    const startDt = weekStart;
    const endDt = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + 6
    );
    const fmt = (d: Date) =>
      d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', { month: 'short', day: 'numeric' });
    return `${fmt(startDt)} – ${fmt(endDt)}`;
  }, [weekStart, lang]);

  return (
    <div className="space-y-6 pb-8">
      {/* Top KPI Overview */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
            {tr("Today's Daily Tasks", 'आज के रोज़ाना काम')}
          </p>
          <p className="mt-1.5 text-2xl font-semibold font-mono-num text-[#1B4D3E] dark:text-[#7FD1B2]">
            {todayStats.done}/{todayStats.total}
          </p>
          <p className="text-[11px] text-[#7A827D] font-mono-num mt-0.5">
            {todayStats.pct}% {tr('completed today', 'आज पूरे हुए')}
          </p>
        </div>

        <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
              {tr('Consistency Streak', 'लगातार दिन')}
            </p>
            <Flame className="w-4 h-4 text-[#B88E44]" />
          </div>
          <p className="mt-1.5 text-2xl font-semibold font-mono-num">
            {streakDays} {tr(streakDays === 1 ? 'day' : 'days', 'दिन')}
          </p>
          <p className="text-[11px] text-[#7A827D] mt-0.5">
            {tr('Days with ≥1 habit done', 'कम से कम 1 काम पूरा')}
          </p>
        </div>

        <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
              {tr('Selected Week Rate', 'चुने हुए हफ़्ते का दर')}
            </p>
            <TrendingUp className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2]" />
          </div>
          <p className="mt-1.5 text-2xl font-semibold font-mono-num">{weeklyAnalytics.ratePct}%</p>
          <p className="text-[11px] text-[#7A827D] font-mono-num mt-0.5">
            {weeklyAnalytics.totalVolume.toLocaleString()} {tr('total logs', 'कुल गिनती')}
          </p>
        </div>

        <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
              {tr('Month Active Days', 'महीने में सक्रिय दिन')}
            </p>
            <Award className="w-4 h-4 text-[#B88E44]" />
          </div>
          <p className="mt-1.5 text-2xl font-semibold font-mono-num">
            {monthlyAnalytics.activeDaysCount}/{monthlyAnalytics.elapsedDays || monthlyAnalytics.daysInMonth}
          </p>
          <p className="text-[11px] text-[#7A827D] font-mono-num mt-0.5">
            {monthlyAnalytics.overallPct}% {tr('monthly rate', 'मासिक दर')}
          </p>
        </div>
      </section>

      {/* Sub-view Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A]">
          {(
            [
              { id: 'daily', label: tr('Daily', 'रोज़ाना'), Icon: BookOpen },
              { id: 'weekly', label: tr('Weekly', 'हफ़्तावार'), Icon: TrendingUp },
              { id: 'monthly', label: tr('Monthly', 'महीनावार'), Icon: Award },
              { id: 'calendar', label: tr('Calendar', 'कैलेंडर'), Icon: CalendarIcon },
              { id: 'customize', label: tr('Customize', 'कस्टमाइज़'), Icon: SlidersHorizontal },
            ] as { id: DeenSubTab; label: string; Icon: React.ElementType }[]
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSubTab(id)}
              className={`min-h-[40px] px-3 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                subTab === id
                  ? 'bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white'
                  : 'text-[#5C635E] dark:text-[#9AA59E] hover:text-[#1A1D1B] dark:hover:text-[#F1F3F2]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSubTab('customize')}
          className="text-xs font-medium text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline whitespace-nowrap"
        >
          + {tr('Add custom Deen habit', 'नया दीन काम जोड़ें')}
        </button>
      </div>

      {/* DAILY VIEW */}
      {subTab === 'daily' && (
        <div className="space-y-5">
          {/* Date Bar */}
          <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {tr('Daily Deen & Ibadah Checklist', 'रोज़ाना दीन और इबादत चेकलिस्ट')}
              </h2>
              <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                {tr(
                  'Track Tasbeeh (Pahla Kalma, Astaghfar, Durood), Quran pages, and Sunnah habits.',
                  'तस्बीह (पहला कलमा, अस्तग़फ़ार, दुरूद), क़ुरआन के सफ़हे और सुन्नत आदतें ट्रैक करें।'
                )}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectDate(addDays(selectedDate, -1))}
                aria-label={tr('Previous day', 'पिछला दिन')}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] hover:bg-[#F8F7F4] dark:hover:bg-[#0E1311]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="min-w-[110px] text-center text-xs sm:text-sm font-medium font-mono-num px-2">
                {formattedSelectedDate}
              </span>
              <button
                type="button"
                onClick={() => handleSelectDate(addDays(selectedDate, 1))}
                aria-label={tr('Next day', 'अगला दिन')}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] hover:bg-[#F8F7F4] dark:hover:bg-[#0E1311]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {selectedDate !== todayKey && (
                <button
                  type="button"
                  onClick={() => handleSelectDate(todayKey)}
                  className="min-h-[38px] px-3 rounded-lg bg-[#F8F7F4] dark:bg-[#0E1311] border border-[#E5E2DC] dark:border-[#242E2A] text-xs font-medium"
                >
                  {tr('Today', 'आज')}
                </button>
              )}
            </div>
          </div>

          {activeTasks.length === 0 ? (
            <div className="bg-white dark:bg-[#151C19] border border-dashed border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-8 text-center space-y-3">
              <p className="text-sm font-medium">
                {tr('No active Deen tasks yet.', 'अभी कोई सक्रिय दीन काम नहीं है।')}
              </p>
              <button
                type="button"
                onClick={() => setSubTab('customize')}
                className="min-h-[42px] px-4 rounded-xl bg-[#1B4D3E] text-white text-xs font-medium"
              >
                {tr('Add from Templates or Create Custom', 'टेम्पलेट से जोड़ें या नया बनाएं')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeDailyTasks.length > 0 && (
                <div className="space-y-3">
                  {activeDailyTasks.map((task) => renderTaskRow(task, selectedDate))}
                </div>
              )}

              {activeWeeklyTasks.length > 0 && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#5C635E] dark:text-[#9AA59E] px-1">
                    {tr('Weekly Deen Goals', 'हफ़्तावार दीन लक्ष्य')}
                  </p>
                  {activeWeeklyTasks.map((task) => renderTaskRow(task, selectedDate))}
                </div>
              )}
            </div>
          )}

          {/* Daily Reflection Note */}
          <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="deen-day-note"
                className="text-sm font-semibold text-[#1A1D1B] dark:text-[#F1F3F2]"
              >
                {tr('Daily Reflection / Dua Note', 'आज का नोट / दुआ')} ({formattedSelectedDate})
              </label>
              {noteSavedFeedback && (
                <span className="text-xs text-[#2E7D5B] dark:text-[#7FD1B2] font-medium">
                  {tr('Saved', 'सेव हो गया')}
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                id="deen-day-note"
                type="text"
                maxLength={200}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder={tr(
                  'e.g. Finished Surah Kahf, felt peaceful after Fajr...',
                  'जैसे: फ़ज्र के बाद तस्बीह पूरी की, दिल को सुकून मिला...'
                )}
                className="flex-1 min-h-[42px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
              />
              <button
                type="button"
                onClick={() => void handleSaveNote()}
                className="min-h-[42px] px-4 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-xs font-medium hover:bg-[#143B2F] whitespace-nowrap"
              >
                {tr('Save Note', 'नोट सेव करें')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WEEKLY VIEW */}
      {subTab === 'weekly' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {tr('Weekly Deen Progress', 'हफ़्तावार दीन प्रगति')}
                </h2>
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] font-mono-num">
                  {weekRangeLabel} · {weeklyAnalytics.hitDailySlots}/{weeklyAnalytics.possibleDailySlots}{' '}
                  {tr('daily targets hit', 'रोज़ाना लक्ष्य पूरे')}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setWeekStart(
                      (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7)
                    )
                  }
                  aria-label={tr('Previous week', 'पिछला हफ़्ता')}
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setWeekStart(startOfWeekMonday(new Date()))}
                  className="min-h-[38px] px-3 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] text-xs font-medium"
                >
                  {tr('This Week', 'यह हफ़्ता')}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setWeekStart(
                      (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)
                    )
                  }
                  aria-label={tr('Next week', 'अगला हफ़्ता')}
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 7-Day Bar Chart */}
            <div className="grid grid-cols-7 gap-2 pt-2">
              {weeklyAnalytics.days.map((d) => {
                const isToday = d.dateKey === todayKey;
                return (
                  <button
                    key={d.dateKey}
                    type="button"
                    onClick={() => {
                      handleSelectDate(d.dateKey);
                      setSubTab('daily');
                    }}
                    className={`p-2 rounded-xl border text-center transition-colors ${
                      isToday
                        ? 'border-[#1B4D3E] dark:border-[#7FD1B2] bg-[#1B4D3E]/5 dark:bg-[#2A6F5A]/15'
                        : 'border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311]'
                    }`}
                  >
                    <p className="text-[11px] font-medium text-[#5C635E] dark:text-[#9AA59E]">
                      {d.dayLabel}
                    </p>
                    <div className="my-2 h-20 w-full flex items-end justify-center">
                      <div className="w-5 sm:w-6 h-full rounded-md bg-[#E5E2DC]/70 dark:bg-[#242E2A] overflow-hidden flex items-end">
                        <div
                          className="w-full rounded-md bg-[#1B4D3E] dark:bg-[#2E7D5B] transition-all"
                          style={{ height: `${Math.max(d.pct > 0 ? 10 : 0, d.pct)}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs font-mono-num font-semibold">{d.dayNum}</p>
                    <p className="text-[10px] font-mono-num text-[#7A827D]">
                      {d.doneDaily}/{d.totalDaily}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Per-Task Weekly Breakdown */}
          <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-semibold">
              {tr('Task-by-Task Weekly Consistency', 'हर काम की हफ़्तावार निरंतरता')}
            </h3>
            <div className="space-y-3.5">
              {weeklyAnalytics.taskBreakdown.map(({ task, weekSum, daysHit, pct }) => (
                <div key={task.id} className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-sm">{deenTaskTitle(task)}</span>
                    <span className="font-mono-num text-[#5C635E] dark:text-[#9AA59E]">
                      {task.frequency === 'daily'
                        ? `${daysHit}/7 ${tr('days', 'दिन')} · ${weekSum.toLocaleString()} ${deenUnit(task.unit)}`
                        : `${weekSum.toLocaleString()} / ${task.targetCount.toLocaleString()} ${deenUnit(task.unit)}`}{' '}
                      ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#F1EFE9] dark:bg-[#242E2A] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1B4D3E] dark:bg-[#2E7D5B]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MONTHLY VIEW */}
      {subTab === 'monthly' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {monthCursor.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </h2>
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] font-mono-num">
                  {monthlyAnalytics.activeDaysCount} {tr('active days', 'सक्रिय दिन')} ·{' '}
                  {monthlyAnalytics.overallPct}% {tr('daily habit completion', 'रोज़ाना आदत दर')}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                  }
                  aria-label={tr('Previous month', 'पिछला महीना')}
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                  }
                  aria-label={tr('Next month', 'अगला महीना')}
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A] border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl overflow-hidden">
              {monthlyAnalytics.taskStats.map(({ task, totalCount, daysHit, pct }) => (
                <div key={task.id} className="p-4 space-y-2 bg-white dark:bg-[#151C19]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{deenTaskTitle(task)}</p>
                      <p className="text-xs text-[#7A827D]">
                        {deenCategoryLabel(task.category)} ·{' '}
                        <span className="font-mono-num">
                          {daysHit} {tr('days completed', 'दिन पूरे')} ·{' '}
                          {totalCount.toLocaleString()} {deenUnit(task.unit)}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`text-sm font-mono-num font-semibold ${
                        pct >= 70
                          ? 'text-[#1B4D3E] dark:text-[#7FD1B2]'
                          : pct >= 35
                            ? 'text-[#B88E44]'
                            : 'text-[#7A827D]'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#F1EFE9] dark:bg-[#242E2A] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1B4D3E] dark:bg-[#2E7D5B]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR-WISE VIEW */}
      {subTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-6 bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#1B4D3E] dark:text-[#7FD1B2]" />
                <h2 className="text-lg font-semibold">
                  {monthCursor.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                  }
                  aria-label={tr('Previous month', 'पिछला महीना')}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                  }
                  aria-label={tr('Next month', 'अगला महीना')}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center">
              {(lang === 'hi'
                ? ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि']
                : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
              ).map((day) => (
                <div key={day} className="text-[11px] font-medium text-[#7A827D] py-1">
                  {day}
                </div>
              ))}
              {monthlyAnalytics.calendarCells.map((cell, idx) => {
                if (!cell.day || !cell.dateKey) return <div key={`empty-${idx}`} className="h-11" />;
                const isSelected = cell.dateKey === selectedDate;
                const fullDone = cell.totalDaily > 0 && cell.doneDaily >= cell.totalDaily;
                const partial = cell.doneDaily > 0 || cell.hasAnyLog;
                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => handleSelectDate(cell.dateKey!)}
                    className={`h-11 rounded-lg flex flex-col items-center justify-center text-xs font-mono-num border transition-all ${
                      isSelected ? 'ring-2 ring-[#B88E44]' : ''
                    } ${
                      fullDone
                        ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]'
                        : partial
                          ? 'bg-[#1B4D3E]/15 dark:bg-[#2E7D5B]/30 text-[#1B4D3E] dark:text-[#7FD1B2] border-[#1B4D3E]/25'
                          : 'bg-[#F8F7F4] dark:bg-[#0E1311] text-[#5C635E] dark:text-[#9AA59E] border-transparent'
                    }`}
                  >
                    <span>{cell.day}</span>
                    {cell.totalDaily > 0 && (
                      <span className="text-[9px] leading-none opacity-80">
                        {cell.doneDaily}/{cell.totalDaily}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#7A827D] pt-2 border-t border-[#E5E2DC] dark:border-[#242E2A]">
              <span>● {tr('Dark green = All daily tasks done', 'गहरा हरा = सभी रोज़ाना काम पूरे')}</span>
              <span>● {tr('Light green = Partial', 'हल्का हरा = कुछ पूरे')}</span>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold">
                  {formattedSelectedDate} · {tr('Log & Review', 'रिकॉर्ड देखें व बदलें')}
                </h3>
                <p className="text-xs text-[#5C635E] dark:text-[#9AA59E] font-mono-num">
                  {selectedDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubTab('daily')}
                className="text-xs font-medium text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline"
              >
                {tr('Open Full Day View', 'पूरा दिन खोलें')}
              </button>
            </div>

            <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A] border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl overflow-hidden">
              {activeTasks.map((task) => {
                const cnt = getCountForDate(selectedDate, task.id);
                const done = cnt >= task.targetCount;
                return (
                  <div
                    key={task.id}
                    className="px-3.5 py-3 flex items-center justify-between gap-2 bg-white dark:bg-[#151C19]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{deenTaskTitle(task)}</p>
                      <p className="text-xs font-mono-num text-[#7A827D]">
                        {cnt}/{task.targetCount} {deenUnit(task.unit)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={cnt <= 0}
                        onClick={() => void logDeenProgress(selectedDate, task.id, -1, false)}
                        className="min-h-[34px] min-w-[34px] rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] flex items-center justify-center disabled:opacity-40"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void logDeenProgress(selectedDate, task.id, 1, false)}
                        className="min-h-[34px] px-2.5 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] text-xs font-mono-num"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void logDeenProgress(
                            selectedDate,
                            task.id,
                            done ? 0 : task.targetCount,
                            true
                          )
                        }
                        className={`min-h-[34px] px-2.5 rounded-lg text-xs font-medium ${
                          done
                            ? 'bg-[#1B4D3E] text-white'
                            : 'border border-[#E5E2DC] dark:border-[#242E2A]'
                        }`}
                      >
                        {done ? tr('Done', 'पूरा') : tr('Complete', 'पूरा करें')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMIZE VIEW */}
      {subTab === 'customize' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Create / Edit Task Form */}
          <form
            onSubmit={(e) => void handleSaveCustomTask(e)}
            className="lg:col-span-5 bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {editingTaskId
                  ? tr('Edit Deen Task', 'दीन काम बदलें')
                  : tr('Add Custom Deen Habit', 'अपना कस्टम दीन काम जोड़ें')}
              </h2>
              {editingTaskId && (
                <button
                  type="button"
                  onClick={resetCustomForm}
                  className="text-xs text-[#7A827D] hover:underline"
                >
                  {tr('Cancel edit', 'रद्द करें')}
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1">
                {tr('Task Name', 'काम का नाम')}
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={tr('e.g. 100 Tasbeeh SubhanAllah', 'जैसे: 100 बार सुब्हानल्लाह')}
                className="w-full min-h-[42px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1">
                {tr('Hindi Name (optional)', 'हिंदी नाम (वैकल्पिक)')}
              </label>
              <input
                type="text"
                maxLength={100}
                value={formTitleHi}
                onChange={(e) => setFormTitleHi(e.target.value)}
                placeholder="जैसे: पहला कलमा तस्बीह"
                className="w-full min-h-[42px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1">
                  {tr('Category', 'श्रेणी')}
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as DeenCategory)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-xs"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {deenCategoryLabel(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1">
                  {tr('Frequency', 'अवधि')}
                </label>
                <select
                  value={formFrequency}
                  onChange={(e) => setFormFrequency(e.target.value as DeenFrequency)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-xs"
                >
                  <option value="daily">{tr('Daily', 'रोज़ाना')}</option>
                  <option value="weekly">{tr('Weekly', 'हफ़्तावार')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1">
                  {tr('Target Count', 'लक्ष्य गिनती')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formTargetText}
                  onChange={(e) =>
                    setFormTargetText(e.target.value.replace(/\D/g, '').slice(0, 5))
                  }
                  onBlur={() => {
                    const n = parseInt(formTargetText, 10);
                    setFormTargetText(String(Number.isNaN(n) || n < 1 ? 1 : Math.min(10000, n)));
                  }}
                  className="w-full min-h-[42px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] font-mono-num text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1">
                  {tr('Unit', 'इकाई')}
                </label>
                <input
                  type="text"
                  maxLength={30}
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {UNIT_SUGGESTIONS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setFormUnit(u)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] border ${
                    formUnit.toLowerCase() === u
                      ? 'border-[#1B4D3E] bg-[#1B4D3E]/10 text-[#1B4D3E] dark:text-[#7FD1B2] font-medium'
                      : 'border-[#E5E2DC] dark:border-[#242E2A] text-[#5C635E] dark:text-[#9AA59E]'
                  }`}
                >
                  {deenUnit(u)}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={savingTask || !formTitle.trim()}
              className="w-full min-h-[44px] rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-sm font-medium hover:bg-[#143B2F] disabled:opacity-50"
            >
              {editingTaskId
                ? tr('Save Changes', 'बदलाव सेव करें')
                : tr('Add Deen Habit', 'दीन काम जोड़ें')}
            </button>
          </form>

          {/* Existing Habits + 1-Tap Templates */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-5 sm:p-6 space-y-4">
              <h3 className="text-base font-semibold">
                {tr('Your Current Deen Tasks', 'आपके मौजूदा दीन काम')} ({allTasks.length})
              </h3>
              <div className="divide-y divide-[#E5E2DC] dark:divide-[#242E2A] border border-[#E5E2DC] dark:border-[#242E2A] rounded-xl overflow-hidden">
                {allTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`px-4 py-3 flex items-center justify-between gap-3 ${
                      task.isActive ? 'bg-white dark:bg-[#151C19]' : 'bg-[#F8F7F4]/60 dark:bg-[#0E1311]/50 opacity-65'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{deenTaskTitle(task)}</p>
                      <p className="text-xs text-[#7A827D] font-mono-num">
                        {task.targetCount} {deenUnit(task.unit)} ·{' '}
                        {task.frequency === 'daily'
                          ? tr('Daily', 'रोज़ाना')
                          : tr('Weekly', 'हफ़्तावार')}{' '}
                        · {deenCategoryLabel(task.category)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditTask(task)}
                        aria-label={tr('Edit task', 'बदलें')}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] text-[#5C635E] hover:text-[#1B4D3E]"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void upsertDeenTask({
                            id: task.id,
                            title: task.title,
                            titleHi: task.titleHi,
                            category: task.category,
                            targetCount: task.targetCount,
                            unit: task.unit,
                            frequency: task.frequency,
                            isActive: !task.isActive,
                          })
                        }
                        aria-label={task.isActive ? tr('Pause', 'रोकें') : tr('Resume', 'चालू करें')}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] text-[#5C635E]"
                      >
                        {task.isActive ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-[#1B4D3E]" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteDeenTask(task.id)}
                        aria-label={tr('Delete task', 'हटाएं')}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] text-[#7A827D] hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-5 sm:p-6 space-y-3">
              <h3 className="text-base font-semibold">
                {tr('Quick-Add Suggested Sunnah & Dhikr', 'सुझाए गए दीन काम (1-टैप में जोड़ें)')}
              </h3>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {DEEN_TEMPLATES.map((tpl) => {
                  const alreadyExists = allTasks.some(
                    (t) => t.title.toLowerCase() === tpl.title.toLowerCase()
                  );
                  return (
                    <div
                      key={tpl.key}
                      className="p-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] flex items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {lang === 'hi' ? tpl.titleHi : tpl.title}
                        </p>
                        <p className="text-[11px] text-[#7A827D] truncate">
                          {tpl.targetCount} {deenUnit(tpl.unit)} ·{' '}
                          {tpl.frequency === 'daily'
                            ? tr('Daily', 'रोज़ाना')
                            : tr('Weekly', 'हफ़्तावार')}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={alreadyExists}
                        onClick={() => void handleQuickAddTemplate(tpl.key)}
                        className="min-h-[34px] px-2.5 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A] bg-white dark:bg-[#151C19] text-xs font-medium inline-flex items-center gap-1 disabled:opacity-45 whitespace-nowrap shrink-0"
                      >
                        {alreadyExists ? (
                          <span>{tr('Added', 'जोड़ दिया')}</span>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 text-[#1B4D3E] dark:text-[#7FD1B2]" />
                            <span>{tr('Add', 'जोड़ें')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Tap Tasbeeh Counter Modal */}
      {tasbeehTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          {(() => {
            const count = getCountForDate(selectedDate, tasbeehTask.id);
            const target = tasbeehTask.targetCount;
            const pct = Math.min(100, Math.round((count / target) * 100));
            const radius = 84;
            const circ = 2 * Math.PI * radius;
            const dashOffset = circ - (pct / 100) * circ;

            return (
              <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] p-6 space-y-6 text-center">
                <div className="flex items-start justify-between gap-2 text-left">
                  <div>
                    <h3 className="text-lg font-semibold">{deenTaskTitle(tasbeehTask)}</h3>
                    <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">
                      {formattedSelectedDate} · {tr('Target', 'लक्ष्य')}: {target}{' '}
                      {deenUnit(tasbeehTask.unit)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTasbeehTaskId(null)}
                    aria-label={tr('Close', 'बंद करें')}
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-[#5C635E] hover:bg-[#F8F7F4] dark:hover:bg-[#0E1311]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Tactile Tap Circle */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                        navigator.vibrate(14);
                      }
                      void logDeenProgress(selectedDate, tasbeehTask.id, 1, false);
                    }}
                    className="relative w-52 h-52 rounded-full flex items-center justify-center active:scale-95 transition-transform focus:outline-none focus:ring-4 focus:ring-[#1B4D3E]/30"
                  >
                    <svg className="w-52 h-52 -rotate-90" viewBox="0 0 200 200">
                      <circle
                        cx="100"
                        cy="100"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="10"
                        fill="transparent"
                        className="text-[#F1EFE9] dark:text-[#242E2A]"
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="10"
                        strokeLinecap="round"
                        fill="transparent"
                        strokeDasharray={circ}
                        strokeDashoffset={dashOffset}
                        className="text-[#1B4D3E] dark:text-[#2E7D5B] transition-all duration-200"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-semibold font-mono-num text-[#1A1D1B] dark:text-[#F1F3F2]">
                        {count}
                      </span>
                      <span className="text-xs text-[#5C635E] dark:text-[#9AA59E] font-mono-num mt-1">
                        / {target} ({pct}%)
                      </span>
                      <span className="text-[11px] font-medium text-[#1B4D3E] dark:text-[#7FD1B2] mt-2">
                        {tr('Tap +1', 'टैप करें +1')}
                      </span>
                    </div>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={count <= 0}
                    onClick={() => void logDeenProgress(selectedDate, tasbeehTask.id, -1, false)}
                    className="min-h-[42px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] text-xs font-mono-num disabled:opacity-40"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => void logDeenProgress(selectedDate, tasbeehTask.id, 10, false)}
                    className="min-h-[42px] px-4 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-xs font-mono-num font-medium"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    disabled={count === 0}
                    onClick={() => void logDeenProgress(selectedDate, tasbeehTask.id, 0, true)}
                    className="min-h-[42px] px-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] text-xs font-medium inline-flex items-center gap-1 disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{tr('Reset', 'रीसेट')}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setTasbeehTaskId(null)}
                  className="w-full min-h-[44px] rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-sm font-medium"
                >
                  {tr('Done', 'हो गया')}
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
