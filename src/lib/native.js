// גשר בין אפליקציית הווב לבין אנדרואיד: עדכון הווידג'ט במסך הבית + קישורים עמוקים (balanceapp://sos וכו')
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

const isNative = Capacitor.isNativePlatform();
const WidgetBridge = registerPlugin('WidgetBridge');

// הנתונים שמוצגים בווידג'ט – נשמרים במכשיר כך שהווידג'ט מתעדכן גם כשהאפליקציה סגורה
export async function updateNativeWidget(data) {
  if (!isNative) return;
  try {
    await WidgetBridge.update({ data: JSON.stringify(data) });
  } catch (e) {
    // בגרסת ווב אין ווידג'ט – מתעלמים
  }
}

const VALID_ACTIONS = new Set(['sos', 'water', 'journal', 'calendar', 'morning', 'midday', 'evening', 'widget', 'day']);

export const parseAction = (url = '') => {
  const m = String(url).match(/^balanceapp:\/\/([a-z]+)/i);
  const action = m ? m[1].toLowerCase() : null;
  return VALID_ACTIONS.has(action) ? action : null;
};

// קישורים מהווידג'ט / קיצורי דרך. בווב תומך גם ב- ?action=sos (לקיצורי דרך של PWA)
export function listenForDeepLinks(handler) {
  const webAction = new URLSearchParams(window.location.search).get('action');
  if (webAction && VALID_ACTIONS.has(webAction)) handler(webAction);

  if (!isNative) return () => {};

  const subPromise = CapApp.addListener('appUrlOpen', ({ url }) => {
    const action = parseAction(url);
    if (action) handler(action);
  });
  CapApp.getLaunchUrl()
    .then(res => {
      const action = parseAction(res?.url);
      if (action) handler(action);
    })
    .catch(() => {});

  return () => {
    subPromise.then(s => s.remove()).catch(() => {});
  };
}
