// כלי ממשק קטנים: הודעות צפות (טוסטים), רטט עדין, ומצב בהיר/כהה
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();

// --- רטט (Haptics) ---
export function haptic(kind = 'light') {
  try {
    if (isNative) {
      if (kind === 'success') Haptics.notification({ type: NotificationType.Success });
      else if (kind === 'warning') Haptics.notification({ type: NotificationType.Warning });
      else Haptics.impact({ style: kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light });
      return;
    }
    if (navigator.vibrate) navigator.vibrate(kind === 'success' ? [10, 40, 10] : 8);
  } catch (e) {}
}

// --- טוסטים ---
const listeners = new Set();

export function showToast(message, { kind = 'info', duration = 2600 } = {}) {
  const toast = { id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, message, kind, duration };
  listeners.forEach(fn => fn(toast));
}

export function subscribeToasts(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// --- ערכת נושא ---
export const THEME_KEY = 'balance_theme';

export function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'auto';
  } catch (e) {
    return 'auto';
  }
}

export function applyTheme(pref) {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const isDark = pref === 'dark' || (pref === 'auto' && prefersDark);
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = isDark ? '#171412' : '#faf7f2';
  return isDark;
}
