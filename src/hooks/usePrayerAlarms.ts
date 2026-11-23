import { useCallback, useEffect, useState } from 'react';
import {
  calculatePrayerWindows,
  loadPrayerSettings,
  playPrayerAlarmAudio,
  savePrayerSettings,
  type PrayerTimeSettings,
} from '../lib/prayerTimes';
import { getLocalDateKey } from '../lib/offlineStorage';
import { PRAYER_LABELS_I18N, type AppLanguage } from '../lib/i18n';
import type { PrayerType } from '../types/qaza';

const FIRED_PREFIX = 'qazaflow_alarm_fired_v1_';
const END_WARN_PREFIX = 'qazaflow_endwarn_fired_v1_';

function wasFired(prefix: string, dateKey: string, prayerId: PrayerType): boolean {
  try {
    return localStorage.getItem(`${prefix}${dateKey}_${prayerId}`) === '1';
  } catch {
    return false;
  }
}

function markFired(prefix: string, dateKey: string, prayerId: PrayerType): void {
  try {
    localStorage.setItem(`${prefix}${dateKey}_${prayerId}`, '1');
  } catch {
    // ignore
  }
}

async function showBrowserOrSwNotification(
  title: string,
  body: string,
  tag?: string
): Promise<boolean> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: tag || title,
        });
        return true;
      }
    }
  } catch {
    // fall back to Notification constructor
  }

  try {
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      tag: tag || title,
    });
    return true;
  } catch {
    return false;
  }
}

export function usePrayerAlarms(
  onInAppAlert?: (message: string) => void,
  lang: AppLanguage = 'en'
) {
  const [settings, setSettings] = useState<PrayerTimeSettings>(() => loadPrayerSettings());
  const [now, setNow] = useState<Date>(() => new Date());

  const updateSettings = useCallback(
    (updater: Partial<PrayerTimeSettings> | ((prev: PrayerTimeSettings) => PrayerTimeSettings)) => {
      setSettings((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
        savePrayerSettings(next);
        return next;
      });
    },
    []
  );

  useEffect(() => {
    const checkAlarms = async () => {
      const currentNow = new Date();
      setNow(currentNow);

      if (!settings.locationConfigured) return;
      const anyStartAlarmOn = Object.values(settings.alarms).some(Boolean);
      if (!anyStartAlarmOn && !settings.beforeEndReminderEnabled) return;

      const { windows } = calculatePrayerWindows(settings, currentNow);
      const dateKey = getLocalDateKey(currentNow);
      const nowMs = currentNow.getTime();

      for (const w of windows) {
        const prayerEn = PRAYER_LABELS_I18N.en[w.id];
        const prayerHi = PRAYER_LABELS_I18N.hi[w.id];

        // 1. Start-of-prayer alarm
        if (settings.alarms[w.id]) {
          const startDiffMs = nowMs - w.start.getTime();
          if (startDiffMs >= 0 && startDiffMs <= 120_000 && !wasFired(FIRED_PREFIX, dateKey, w.id)) {
            markFired(FIRED_PREFIX, dateKey, w.id);

            const title =
              lang === 'hi' ? `${prayerHi} की नमाज़ का वक़्त` : `${prayerEn} Prayer Time`;
            const body =
              lang === 'hi'
                ? `${settings.locationLabel} में ${prayerHi} का समय शुरू हो गया (${w.startFormatted} – ${w.endFormatted})।`
                : `${prayerEn} time has started (${w.startFormatted} – ${w.endFormatted}) in ${settings.locationLabel}.`;

            if (settings.soundEnabled) {
              playPrayerAlarmAudio(settings.alarmVoice, {
                prayerLabel: prayerEn,
                prayerLabelHi: prayerHi,
                locationLabel: settings.locationLabel,
                lang,
              });
            }
            const pushed = await showBrowserOrSwNotification(title, body, `start-${w.id}-${dateKey}`);
            if (!pushed || onInAppAlert) {
              onInAppAlert?.(
                `${title}: ${w.startFormatted} – ${w.endFormatted} (${settings.locationLabel})`
              );
            }
          }
        }

        // 2. 30-minute before-end warning (Isha fixed at 9:30 PM = 30 min before 10:00 PM)
        if (settings.beforeEndReminderEnabled) {
          const warnDateKey = getLocalDateKey(w.closingAlertAt);
          const warnDiffMs = nowMs - w.closingAlertAt.getTime();
          if (
            warnDiffMs >= 0 &&
            warnDiffMs <= 120_000 &&
            !wasFired(END_WARN_PREFIX, warnDateKey, w.id)
          ) {
            markFired(END_WARN_PREFIX, warnDateKey, w.id);

            const title =
              w.id === 'isha'
                ? lang === 'hi'
                  ? `इशा का वक़्त (9:30 PM रिमाइंडर)`
                  : `Isha Reminder (9:30 PM)`
                : lang === 'hi'
                  ? `${prayerHi} ख़त्म होने में 30 मिनट बाक़ी`
                  : `30 Min Left for ${prayerEn}`;

            const body =
              w.id === 'isha'
                ? lang === 'hi'
                  ? `रात 10:00 बजे से 30 मिनट पहले: कृपया इशा की नमाज़ अदा कर लें (${settings.locationLabel})।`
                  : `30 minutes before 10:00 PM: Please offer your Isha prayer (${settings.locationLabel}).`
                : lang === 'hi'
                  ? `${settings.locationLabel} में ${prayerHi} का वक़्त ${w.endFormatted} पर ख़त्म होगा।`
                  : `${prayerEn} prayer window ends in 30 minutes at ${w.endFormatted} (${settings.locationLabel}).`;

            if (settings.soundEnabled) {
              playPrayerAlarmAudio(settings.alarmVoice, {
                prayerLabel: prayerEn,
                prayerLabelHi: prayerHi,
                locationLabel: settings.locationLabel,
                lang,
              });
            }
            const pushed = await showBrowserOrSwNotification(
              title,
              body,
              `endwarn-${w.id}-${warnDateKey}`
            );
            if (!pushed || onInAppAlert) {
              onInAppAlert?.(`${title} — ${body}`);
            }
          }
        }
      }
    };

    void checkAlarms();
    const intervalId = window.setInterval(() => {
      void checkAlarms();
    }, 15_000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkAlarms();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [settings, onInAppAlert, lang]);

  const sendTestAlarm = useCallback(async () => {
    const { activeWindow, nextWindow } = calculatePrayerWindows(settings, new Date());
    const target = activeWindow || nextWindow;
    const prayerId: PrayerType = target?.id || 'fajr';
    const prayerEn = PRAYER_LABELS_I18N.en[prayerId];
    const prayerHi = PRAYER_LABELS_I18N.hi[prayerId];

    if (settings.soundEnabled) {
      playPrayerAlarmAudio(settings.alarmVoice, {
        prayerLabel: prayerEn,
        prayerLabelHi: prayerHi,
        locationLabel: settings.locationLabel,
        lang,
      });
    }

    const title =
      lang === 'hi'
        ? `${prayerHi} अलार्म टेस्ट`
        : target
          ? `${prayerEn} Alarm Test`
          : 'QazaFlow Prayer Alarm Test';
    const body =
      lang === 'hi'
        ? `${settings.locationLabel} में ${prayerHi} का वक़्त: ${target?.startFormatted || ''} – ${target?.endFormatted || ''} (समाप्ति अलर्ट: ${target?.closingAlertFormatted || ''})`
        : target
          ? `${prayerEn} window (${settings.locationLabel}): ${target.startFormatted} – ${target.endFormatted}. 30m alert at ${target.closingAlertFormatted}.`
          : `Prayer alarms are active for ${settings.locationLabel}.`;

    const sentSystem = await showBrowserOrSwNotification(title, body, 'qazaflow-alarm-test');
    onInAppAlert?.(
      sentSystem
        ? lang === 'hi'
          ? `${settings.locationLabel} के लिए अलार्म और नोटिफिकेशन टेस्ट भेजा गया।`
          : `Test alarm & notification sent for ${settings.locationLabel}.`
        : lang === 'hi'
          ? `${body} (बैकग्राउंड अलर्ट के लिए नोटिफिकेशन अनुमति दें।)`
          : `${body} (Allow browser notifications for background alerts.)`
    );
    return sentSystem;
  }, [settings, onInAppAlert, lang]);

  return {
    settings,
    updateSettings,
    now,
    sendTestAlarm,
  };
}
