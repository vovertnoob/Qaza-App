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

function wasAlarmFired(dateKey: string, prayerId: PrayerType): boolean {
  try {
    return localStorage.getItem(`${FIRED_PREFIX}${dateKey}_${prayerId}`) === '1';
  } catch {
    return false;
  }
}

function markAlarmFired(dateKey: string, prayerId: PrayerType): void {
  try {
    localStorage.setItem(`${FIRED_PREFIX}${dateKey}_${prayerId}`, '1');
  } catch {
    // ignore
  }
}

async function showBrowserOrSwNotification(title: string, body: string): Promise<boolean> {
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
          tag: title,
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
      const anyAlarmOn = Object.values(settings.alarms).some(Boolean);
      if (!anyAlarmOn) return;

      const { windows } = calculatePrayerWindows(settings, currentNow);
      const dateKey = getLocalDateKey(currentNow);
      const nowMs = currentNow.getTime();

      for (const w of windows) {
        if (!settings.alarms[w.id]) continue;
        const diffMs = nowMs - w.start.getTime();
        if (diffMs >= 0 && diffMs <= 120_000 && !wasAlarmFired(dateKey, w.id)) {
          markAlarmFired(dateKey, w.id);
          const prayerEn = PRAYER_LABELS_I18N.en[w.id];
          const prayerHi = PRAYER_LABELS_I18N.hi[w.id];

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
          const pushed = await showBrowserOrSwNotification(title, body);
          if (!pushed || onInAppAlert) {
            onInAppAlert?.(`${title}: ${w.startFormatted} – ${w.endFormatted} (${settings.locationLabel})`);
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
        ? `${settings.locationLabel} में ${prayerHi} का वक़्त: ${target?.startFormatted || ''} – ${target?.endFormatted || ''}`
        : target
          ? `${prayerEn} window for ${settings.locationLabel}: ${target.startFormatted} – ${target.endFormatted}.`
          : `Prayer alarms are active for ${settings.locationLabel}.`;

    const sentSystem = await showBrowserOrSwNotification(title, body);
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
