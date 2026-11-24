// שכבת התראות אחת לשתי הסביבות:
// • באפליקציית אנדרואיד (Capacitor) – התראות מתוזמנות מראש במכשיר, מגיעות גם כשהאפליקציה סגורה, בלי שרת ובחינם.
// • בדפדפן – התראות רגילות של Web Notifications (רק כשהאפליקציה פתוחה).
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const isNative = Capacitor.isNativePlatform();

export const NOTIF_IDS = {
  URGE_TIMER: 900001,
  URGE_FOLLOWUP: 900002
};
const KEEP_IDS = new Set([NOTIF_IDS.URGE_TIMER, NOTIF_IDS.URGE_FOLLOWUP]);
const INSTANT_MIN = 950000;
const INSTANT_MAX = 999999;
const CHANNEL_ID = 'balance-reminders';
const MAX_SCHEDULED = 400; // לאנדרואיד יש מגבלה של ~500 התראות מתוזמנות לאפליקציה

let instantCounter = INSTANT_MIN;

const localDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const dateAt = (dateStr, hhmm) => {
  if (!dateStr || !hhmm) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  if (![y, m, d, h, mi].every(Number.isFinite)) return null;
  return new Date(y, m - 1, d, h, mi, 0, 0);
};

const toNativeNotification = ({ id, title, body, at, extra }) => ({
  id,
  title,
  body,
  largeBody: body,
  channelId: CHANNEL_ID,
  smallIcon: 'ic_stat_notify',
  schedule: { at, allowWhileIdle: true },
  extra: extra || {}
});

export async function initNativeNotifications(onTap) {
  if (!isNative) return () => {};
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'תזכורות ותמיכה',
      description: 'תזכורות יומיות, ארוחות, אירועים ותמיכה ברגעים קשים',
      importance: 4,
      vibration: true
    });
  } catch (e) {}

  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') await LocalNotifications.requestPermissions();
  } catch (e) {}

  // אנדרואיד 12+: "התראות מדויקות". מבקשים פעם אחת בלבד – בלי זה ההתראות עלולות לאחר בכמה דקות.
  try {
    if (!localStorage.getItem('balance_exact_alarm_asked')) {
      localStorage.setItem('balance_exact_alarm_asked', 'true');
      const s = await LocalNotifications.checkExactNotificationSetting();
      if (s?.exact_alarm && s.exact_alarm !== 'granted') {
        await LocalNotifications.changeExactNotificationSetting();
      }
    }
  } catch (e) {}

  const sub = await LocalNotifications.addListener('localNotificationActionPerformed', (ev) => {
    onTap?.(ev?.notification?.extra || {});
  });
  return () => sub.remove();
}

// התראה מיידית
export async function notify(title, body, tag = 'balance-alert', extra = {}) {
  if (isNative) {
    instantCounter = instantCounter >= INSTANT_MAX ? INSTANT_MIN : instantCounter + 1;
    try {
      await LocalNotifications.schedule({
        notifications: [toNativeNotification({ id: instantCounter, title, body, at: new Date(Date.now() + 1000), extra })]
      });
    } catch (e) {}
    return;
  }

  if (!('Notification' in window)) {
    alert(`${title}\n\n${body}`);
    return;
  }
  let perm = Notification.permission;
  if (perm !== 'granted') perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    alert(`${title}\n\n${body}`);
    return;
  }
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg?.showNotification) {
        await reg.showNotification(title, { body, tag, renotify: true, vibrate: [200, 100, 200], data: extra });
        return;
      }
    }
    new Notification(title, { body, tag });
  } catch (e) {
    alert(`${title}\n\n${body}`);
  }
}

// התראה בודדת לזמן מסוים (טיימר דחף / מעקב אחרי רגע קשה)
export async function scheduleOneShot(id, title, body, atMs, extra = {}) {
  if (!isNative) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
    await LocalNotifications.schedule({
      notifications: [toNativeNotification({ id, title, body, at: new Date(atMs), extra })]
    });
  } catch (e) {}
}

export async function cancelOneShot(id) {
  if (!isNative) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch (e) {}
}

export async function clearNativeSchedule() {
  if (!isNative) return;
  try {
    const { notifications } = await LocalNotifications.getPending();
    if (notifications?.length) {
      await LocalNotifications.cancel({ notifications: notifications.map(n => ({ id: n.id })) });
    }
  } catch (e) {}
}

// בניית כל התזכורות הקבועות ל-7 הימים הקרובים + אירועי יומן ל-60 יום
export function buildSchedulePlan({ globalData, daysHistory, mantras, displayName, urgeTimerMinutes }) {
  const now = new Date();
  const plan = [];
  const support = globalData.eatingSupport || {};

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    const dateStr = localDateStr(d);
    const dayData = daysHistory[dateStr] || {};
    const idBase = 100000 + dayOffset * 100;
    const mantra = mantras[(d.getDate() + d.getMonth() * 31) % mantras.length];

    const add = (slot, hhmm, title, body, extra) => {
      const at = dateAt(dateStr, hhmm);
      if (at && at.getTime() > now.getTime() + 5000) plan.push({ id: idBase + slot, title, body, at, extra });
    };

    if (!dayData.morningIntention) {
      add(1, globalData.morningReminderTime || '08:00', `בוקר טוב${displayName ? `, ${displayName}` : ''}! ☀️`, `${mantra} — היכנסי לכתוב כוונה יומית.`, { open: 'morning' });
    }
    if (!dayData.middayCheckin) {
      add(2, globalData.middayReminderTime || '13:30', 'עצירת אמצע היום 🌤️', 'איך את מרגישה עכשיו? נשימה עמוקה, כוס מים וצ׳ק-אין קצר.', { open: 'midday' });
    }
    if (dayData.dailyScore === null || dayData.dailyScore === undefined) {
      add(3, globalData.eveningReminderTime || '21:00', 'סוף יום מתקרב 🌙', 'זמן לסכם את היום ולתת ציון יומי.', { open: 'evening' });
    }
    if (support.riskReminderTime) {
      add(4, support.riskReminderTime, 'השעה המאתגרת מתקרבת 🌙', 'מה התוכנית שלך? אם יגיע דחף – לחצי כאן ל-SOS. את לא לבד.', { open: 'sos' });
    }
    (support.mealReminders || []).slice(0, 20).forEach((r, i) => {
      add(10 + i, r.time, `זמן ל${r.label} 🍽️`, 'אכילה סדירה לאורך היום עוזרת לגוף להרגיש בטוח ומפחיתה דחפים בהמשך. שבי, תאכלי לאט ותיהני 💛', { open: 'journal' });
    });
  }

  const horizon = now.getTime() + 60 * 86400000;
  (globalData.events || []).forEach(ev => {
    if (ev.notified || ev.reminderMode === '-1' || ev.reminderMinutes === -1) return;
    const base = dateAt(ev.date, ev.isAllDay ? '08:30' : (ev.time || '12:00'));
    if (!base) return;
    let at = new Date(base.getTime() - Number(ev.reminderMinutes || 0) * 60000);
    if (ev.reminderMode === 'custom_datetime') {
      at = dateAt(ev.customReminderDate, ev.customReminderTime) || at;
    }
    if (at.getTime() <= now.getTime() + 5000 || at.getTime() > horizon) return;
    const id = 1000000000 + (Math.abs(Math.floor(Number(ev.id) || 0)) % 1000000000);
    plan.push({
      id,
      title: `${ev.typeIcon || '📅'} ${ev.typeLabel || 'אירוע'}: ${ev.title}`,
      body: `${ev.isAllDay ? 'אירוע כל היום' : `בשעה ${ev.time}`}${ev.notes ? ` • ${ev.notes}` : ''}`,
      at,
      extra: { open: 'calendar' }
    });
  });

  plan.sort((a, b) => a.at - b.at);
  return plan.slice(0, MAX_SCHEDULED);
}

// מסנכרן את התזכורות המתוזמנות במכשיר עם הנתונים העדכניים
export async function syncNativeSchedule(plan) {
  if (!isNative) return;
  try {
    const { notifications: pending } = await LocalNotifications.getPending();
    const toCancel = (pending || [])
      .filter(n => !KEEP_IDS.has(n.id) && !(n.id >= INSTANT_MIN && n.id <= INSTANT_MAX))
      .map(n => ({ id: n.id }));
    if (toCancel.length) await LocalNotifications.cancel({ notifications: toCancel });
    if (plan.length) {
      await LocalNotifications.schedule({ notifications: plan.map(toNativeNotification) });
    }
  } catch (e) {
    console.warn('[notifications] sync failed', e);
  }
}
