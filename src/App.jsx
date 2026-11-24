import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile,
  setPersistence, browserLocalPersistence, browserSessionPersistence, indexedDBLocalPersistence
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { db, auth } from './firebase';
import { notify, isNative, buildSchedulePlan, syncNativeSchedule, clearNativeSchedule, scheduleOneShot, cancelOneShot, NOTIF_IDS, initNativeNotifications } from './lib/notifications';
import { updateNativeWidget, listenForDeepLinks } from './lib/native';
import { haptic, showToast, subscribeToasts, getStoredTheme, applyTheme, THEME_KEY } from './lib/ui';
import { exportBackup, readBackupFile } from './lib/backup';
import { 
  Sun, Moon, CheckSquare, Flame, Wallet, Utensils, 
  Bell, Plus, BookOpen, Footprints, Droplets, Calendar as CalendarIcon, 
  Minus, Gift, Briefcase, Clock, Trash2, PieChart, ShieldAlert, Sparkles,
  Edit2, Check, X, Smartphone, HeartHandshake, BatteryCharging, 
  Download, ArrowLeft, User, LogOut, Info, TrendingUp
} from 'lucide-react';

// מאגר מנטרות 365 בהשראת YogaRenew
const MANTRAS = [
  "אני שואפת שלווה ונושפת החוצה כל דאגה.",
  "היום אני בוחרת בנוכחות, נשימה ואיזון.",
  "אני משחררת את מה שאינו משרת אותי עוד.",
  "אני בדיוק במקום שבו אני צריכה להיות כרגע.",
  "הגוף שלי הוא הבית שלי – אני מתייחסת אליו בחמלה ובהקשבה.",
  "אני בוחרת בשקט פנימי גם כשהעולם סביבי רועש.",
  "כל נשימה עמוקה מחזירה אותי אל המרכז שלי.",
  "אני מחליפה שיפוטיות בסקרנות ובחמלה עצמית.",
  "התקדמות קטנה ועקבית עדיפה על שלמות.",
  "אני פתוחה לקבל את הטוב שהיום הזה מביא איתו.",
  "המחשבות שלי הן רק עננים חולפים – אני השמיים הבהירים.",
  "אני בוחרת להגיב מתוך מודעות ולא מתוך אוטומט.",
  "אני מעריכה את הכוח והחוסן שבי.",
  "הכרת תודה הופכת את מה שיש לי למספיק בהחלט.",
  "אני מרשה לעצמי לנוח בלי להרגיש אשמה.",
  "אני בוחרת להזין את הגוף והנפש שלי בדברים שעושים לי טוב.",
  "גם צעד איטי הוא עדיין צעד קדימה.",
  "אני משחררת את הצורך לשלוט בכל דבר ובוטחת בדרך שלי.",
  "האנרגיה שלי יקרה – אני משקיעה אותה במה שחשוב באמת.",
  "אני סולחת לעצמי על אתמול ומתחילה דף נקי היום.",
  "שלווה מתחילה ברגע שבו אני בוחרת לקחת נשימה עמוקה.",
  "אני חזקה יותר מכל הרגל ישן שאני בוחרת לשחרר.",
  "הלב שלי פתוח, הכתפיים שלי רפויות, והנשימה שלי שקטה.",
  "אני יוצרת לעצמי גבולות בריאים מתוך אהבה עצמית.",
  "כל בוקר הוא הזדמנות חדשה לבחור בעצמי מחדש.",
  "אני קשובה לאיתותים של הגוף שלי ומכבדת את הקצב שלו.",
  "אני בוחרת לראות את היופי בפרטים הקטנים של היום.",
  "אני ראויה לזמן, לשקט ולמרחב של צמיחה.",
  "אני מביאה אור, סבלנות ורוגע לכל מפגש שלי היום.",
  "הכוח לשנות את היום שלי נמצא בבחירה הקרובה שאעשה."
];

const ENCOURAGING_QUOTES = [
  "מעידה אחת לא מוחקת את כל הדרך שעשית. מודעות עצמית היא כבר חצי מהפתרון – ממשיכים הלאה בחמלה ❤️",
  "זה אנושי לגמרי. שינוי אמיתי לא נמדד באפס טעויות, אלא במהירות שבה אנחנו חוזרות למסלול שלנו 🌱",
  "בלי אשמה ובלי הלקאה עצמית. קחי נשימה עמוקה, שתי כוס מים – הרגע הבא הוא דף חלק לחלוטין ✨",
  "העובדה שסימנת את זה כאן מראה על אומץ וכנות עם עצמך. זו בדיוק הדרך שבה בונים שליטה אמיתית 💪",
  "הרגלים ישנים לוקחים זמן לשחרר. חבקי את עצמך, בדקי מה היה הטריגר ביומן הרגשות, והמשיכי הלאה בראש מורם 🌸"
];

// טבלת הניקוד החדשה (קשה ומאתגרת יותר להשגת פרסים!)
const POINTS = {
  TASK: 2,              // משימה רגילה בסדר היום
  WORKOUT: 10,          // אימון גופני (הניקוד הגבוה ביותר!)
  WORKOUT_METRIC: 3,    // מילוי מדד אחרי אימון
  HABIT: 5,             // הרגל יומי קבוע
  STEPS: 6,             // עמידה ביעד 10,000 צעדים
  WATER: 5,             // עמידה ביעד שתיית מים
  WORK_TASK: 6,         // משימת עבודה עם דדליין
  MEAL: 1,              // תיעוד ארוחה
  JOURNAL: 3,           // כתיבה לעומק ביומן רגשות
  MORNING: 2,           // כתיבת כוונת בוקר
  MIDDAY: 3,            // צ'ק-אין אמצע היום
  EVENING: 5,           // ציון וסיכום סוף יום
  EVENT: 2,             // הוספת אירוע ליומן
  INCOME: 3,            // תיעוד הכנסה
  SKIP_IMPULSE: 8,      // ויתור על קניית דחף
  URGE_CHECKIN: 5       // עצירה ותיעוד רגע קשה עם אוכל – הניקוד זהה לכל תוצאה (על המודעות, לא על "הצלחה")
};

// --- תמיכה ברגעים קשים עם אוכל (אכילה רגשית / בולמוס) ---
const HALT_OPTIONS = [
  { id: 'hungry', label: 'רעבה', icon: '🍽️', tip: 'אם את רעבה – זה סימן מהגוף, לא חולשה. הכיני ארוחה או נשנוש מסודר, שבי ליד שולחן ואכלי לאט, בלי מסך.' },
  { id: 'stressed', label: 'לחוצה / כועסת', icon: '😤', tip: 'שלוש נשימות איטיות (שאיפה ב-4, נשיפה ב-6), כוס מים, ולכתוב שתי שורות על מה שמציק לך עכשיו.' },
  { id: 'lonely', label: 'בודדה / משועממת', icon: '🫥', tip: 'שלחי הודעה למישהי קרובה, צאי להליכה קצרה, או שימי שיר שאת אוהבת וזוזי איתו.' },
  { id: 'tired', label: 'עייפה', icon: '😴', tip: 'אולי הגוף מבקש מנוחה ולא אוכל. שכבי כמה דקות, מקלחת חמה, או ללכת לישון קצת מוקדם יותר.' },
  { id: 'sad', label: 'עצובה / מוצפת', icon: '🌧️', tip: 'מותר להרגיש. שימי יד על הלב, תני לרגש שם, וכתבי לעצמך משפט חומל כמו שהיית כותבת לחברה.' },
  { id: 'other', label: 'משהו אחר', icon: '✨', tip: 'עצרי ושאלי: מה אני באמת צריכה עכשיו? לפעמים רק שאלת השאלה מחלישה את הדחף.' }
];

const URGE_OUTCOMES = {
  passed: { label: 'הדחף נחלש ועבר 🌊', short: 'הדחף עבר', color: '#a3be8c' },
  meal: { label: 'אכלתי ארוחה / נשנוש מסודר 🍽️', short: 'אכלתי מסודר', color: '#bfd7f6' },
  binge: { label: 'אכלתי יותר ממה שרציתי 💛', short: 'אכילה מעבר', color: '#f8cce0' },
  logged: { label: 'רק רציתי לתעד 📝', short: 'תיעוד', color: '#eae4f9' }
};

const URGE_TIMER_MINUTES = 10;

const URGE_SURF_PROMPTS = [
  'דחף הוא כמו גל: הוא עולה, מגיע לשיא – ויורד. את לא צריכה לעשות כלום, רק לשים לב.',
  'איפה את מרגישה את הדחף בגוף? בבטן, בגרון, בידיים? פשוט תני לו להיות שם.',
  'שאיפה איטית דרך האף... נשיפה ארוכה דרך הפה. עוד פעם.',
  'הדחף לא מגדיר אותך. את זו שמתבוננת בו.',
  'אם בסוף תבחרי לאכול – זה בסדר. המטרה היא לבחור, לא להיות מושלמת.',
  'שימי לב: האם הדחף באותה עוצמה כמו לפני דקה? הוא משתנה כל הזמן.'
];

const URGE_OUTCOME_MESSAGES = {
  passed: 'רכבת על הגל עד הסוף 🌊 זו מיומנות שמתחזקת בכל פעם שאת מתרגלת אותה. גאה בך.',
  meal: 'הקשבת לגוף ונתת לו מה שהוא צריך – זה בדיוק טיפול עצמי 🍽️ אכילה סדירה היא חלק מהפתרון, לא הבעיה.',
  binge: 'זה לא כישלון ולא מוחק שום דבר 💛 בלי לפצות ובלי לדלג על הארוחה הבאה – פשוט לחזור לשגרה הרגילה בזמן הרגיל. העובדה שעצרת ותיעדת היא אומץ אמיתי.',
  logged: 'תיעוד הוא מודעות, ומודעות היא הצעד הראשון 📝 תודה שאת שמה לב לעצמך.'
};

const MOODS = ['🤩', '🙂', '😐', '😤', '😴'];
const HEBREW_DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

const DEFAULT_SCHEDULE_CATEGORIES = [
  { id: 'general', label: 'כללי / סידור', icon: '📌', behavior: 'regular' },
  { id: 'workout', label: `אימון (+${POINTS.WORKOUT} נק׳)`, icon: '💪', behavior: 'workout' },
  { id: 'meal', label: 'ארוחה / נשנוש', icon: '🍽️', behavior: 'meal' },
  { id: 'friends', label: 'פגישה עם חברים', icon: '🥂', behavior: 'regular' },
  { id: 'work', label: 'עבודה / לימודים', icon: '💼', behavior: 'regular' },
  { id: 'selfcare', label: 'זמן אישי / רוגע', icon: '🧘‍♀️', behavior: 'regular' }
];

const WORKOUT_SUBTYPES = [
  'אימון כוח ומשקולות 🏋️‍♀️',
  'ריצה / אירובי 🏃‍♀️',
  'יוגה / פילאטיס 🧘‍♀️',
  'שחייה 🏊‍♀️',
  'הליכה מהירה 👟',
  'אימון ביתי / מתיחות 🤸‍♀️',
  'אחר (הקלדה ידנית)'
];

const POST_WORKOUT_FEELINGS = [
  '🤩 מלאת אנרגיה וסיפוק',
  '💪 חזקה וממוקדת',
  '🙂 הרגשה טובה ורגועה',
  '😮‍💨 מותשת אך גאה בעצמי',
  '🥵 היה מאתגר במיוחד'
];

const DEFAULT_REWARDS = [
  { id: 1, title: 'שייק פירות / אייס קפה מרענן 🥤', cost: 80 },
  { id: 2, title: 'קפה ומאפה מפנק בחוץ ☕', cost: 100 },
  { id: 3, title: 'פרק בסדרה / סרט באמצע השבוע בלי רגשות אשם 🍿', cost: 150 },
  { id: 4, title: 'שנ״צ מפנק או יקיצה טבעית בלי שעון מעורר 😴', cost: 180 },
  { id: 5, title: 'שעה של שקט מוחלט / ספר באמצע היום 📖', cost: 200 },
  { id: 6, title: 'קינוח מושחת או גלידה איכותית 🍨', cost: 250 },
  { id: 7, title: 'קניית מוצר טיפוח / איפור / אקססורי ✨', cost: 300 },
  { id: 8, title: 'משלוח אוכל מפנק בערב בלי לבשל 🍣', cost: 350 },
  { id: 9, title: 'ערב יציאה / קולנוע / בילוי עם חברים 🥂', cost: 450 },
  { id: 10, title: 'ספר חדש או מנוי דיגיטלי שרצית 📚', cost: 500 },
  { id: 11, title: 'פינוק אישי / בגד או נעליים חדשות 🛍️', cost: 600 },
  { id: 12, title: 'עיסוי מקצועי / בוקר ספא מרגיע 🧖‍♀️', cost: 800 },
  { id: 13, title: 'יום חופש יזום לעצמי (Mental Health Day) 🌴', cost: 1000 },
  { id: 14, title: 'סופ״ש מפנק / חופשה קצרה ✈️', cost: 1500 }
];

const DEFAULT_EVENT_TYPES = [
  { id: 'meeting', label: 'פגישה', icon: '🤝', color: '#f4b342' },
  { id: 'birthday', label: 'יום הולדת', icon: '🎂', color: '#f8cce0' },
  { id: 'workout', label: 'אימון / בריאות', icon: '💪', color: '#a3be8c' },
  { id: 'personal', label: 'אישי / משפחה', icon: '💜', color: '#eae4f9' },
  { id: 'errand', label: 'סידורים / תור', icon: '📌', color: '#bfd7f6' },
  { id: 'fun', label: 'בילוי / חופשה', icon: '🎉', color: '#fcd34d' }
];

const REMINDER_OPTIONS = [
  { value: '0', label: 'בזמן האירוע 🔔' },
  { value: '15', label: '15 דקות לפני ⏰' },
  { value: '60', label: 'שעה לפני ⏳' },
  { value: '1440', label: 'יום לפני 📅' },
  { value: 'custom_minutes', label: 'דקות מותאמות אישית לפני האירוע ⏱️' },
  { value: 'custom_datetime', label: 'תאריך ושעה מדויקים להתראה 🎯' },
  { value: '-1', label: 'ללא התראה 🔕' }
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'exp_1', name: 'סופר ומזון', color: '#a3be8c', icon: '🛒' },
  { id: 'exp_2', name: 'אוכל בחוץ וקפה', color: '#f4b342', icon: '🍔' },
  { id: 'exp_3', name: 'קניות ושופינג', color: '#f8cce0', icon: '🛍️' },
  { id: 'exp_4', name: 'פנאי ובילויים', color: '#eae4f9', icon: '🎬' },
  { id: 'exp_5', name: 'חשבונות וקבועות', color: '#bfd7f6', icon: '🏠' }
];

const DEFAULT_INCOME_CATEGORIES = [
  { id: 'inc_1', name: 'משכורת', color: '#10b981', icon: '💼' },
  { id: 'inc_2', name: 'פרילנס / עסק', color: '#3b82f6', icon: '💻' },
  { id: 'inc_3', name: 'החזרים / מענק', color: '#8b5cf6', icon: '🏦' },
  { id: 'inc_4', name: 'מתנה / תמיכה', color: '#f59e0b', icon: '🎁' }
];

const EXPENSE_TYPES = {
  need: { label: 'צורך הכרחי ✅', className: 'type-need', color: '#10b981' },
  want: { label: 'רצון / פינוק ✨', className: 'type-want', color: '#4f46e5' },
  impulse: { label: 'דחף רגשי ⚡', className: 'type-impulse', color: '#e11d48' }
};

const getNowHHMM = () => new Date().toTimeString().slice(0, 5);

// תאריך מקומי (ולא UTC) – אחרת בין חצות ל-02:00/03:00 בישראל האפליקציה חושבת שזה עדיין אתמול
const getLocalDateStr = (d = new Date()) => {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const hhmmToMinutes = (hhmm = '') => {
  const [h, m] = hhmm.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

const getDayPartLabel = (hhmm = '') => {
  const mins = hhmmToMinutes(hhmm);
  if (mins === null) return 'לא ידוע';
  if (mins >= 300 && mins < 720) return 'בוקר ☀️';
  if (mins >= 720 && mins < 1020) return 'צהריים 🌤️';
  if (mins >= 1020 && mins < 1320) return 'ערב 🌇';
  return 'לילה 🌙';
};

const DEFAULT_EATING_SUPPORT = {
  mealReminders: [],        // [{ id, time, label }] – זמנים שהמשתמשת בוחרת בעצמה
  riskReminderTime: '',     // תזכורת לפני שעה מאתגרת
  followUpAfterHardMoment: true
};

const isWorkoutHabitTitle = (title = '') => {
  return /אימון|כושר|ריצה|יוגה|פילאטיס|שחייה|הליכה|ספורט|חיטוב/.test(title);
};

// הפקת רשימת כל התאריכים הרצופים בין תאריך התחלה לתאריך סיום
const getDatesBetween = (startStr, endStr) => {
  if (!startStr || !endStr) return [startStr || endStr];
  const s = startStr <= endStr ? startStr : endStr;
  const e = startStr <= endStr ? endStr : startStr;
  const dates = [];
  const [sy, sm, sd] = s.split('-').map(Number);
  const [ey, em, ed] = e.split('-').map(Number);
  let curr = new Date(sy, sm - 1, sd);
  const last = new Date(ey, em - 1, ed);

  while (curr <= last && dates.length < 90) {
    const yy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const dd = String(curr.getDate()).padStart(2, '0');
    dates.push(`${yy}-${mm}-${dd}`);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

const hashPassword = (password) => {
  let hash = 5381;
  const salted = `balance_salt_2026_${password}`;
  for (let i = 0; i < salted.length; i++) {
    hash = ((hash << 5) + hash) + salted.charCodeAt(i);
    hash = hash & hash;
  }
  return `h_${Math.abs(hash).toString(16)}`;
};

// Firebase Auth דורש אימייל – ממירים שם משתמש (גם בעברית) לכתובת פנימית קבועה
const usernameToEmail = (username) => {
  const hex = Array.from(new TextEncoder().encode(username)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `u_${hex}@balance-app.local`;
};
// Firebase דורש לפחות 6 תווים – כך גם חשבונות ישנים עם סיסמה קצרה ממשיכים לעבוד
const toAuthPassword = (password) => (password.length >= 6 ? password : `${password}::balance`);

const addIntervalToDate = (dateStr, stepIndex, freq) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (freq === 'monthly') dt.setMonth(dt.getMonth() + stepIndex);
  else if (freq === 'weekly') dt.setDate(dt.getDate() + stepIndex * 7);
  else if (freq === 'daily') dt.setDate(dt.getDate() + stepIndex);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const createEmptyDay = () => ({
  tasks: [],
  stepsGoalMet: false,
  waterCount: 0,
  waterGoalRewarded: false,
  meals: [],
  journals: [],
  dailyScore: null,
  dailySummary: '',
  morningIntention: '',
  middayCheckin: null,
  sleepHours: 7,
  urges: []
});

const getDefaultGlobalData = (realTodayStr) => ({
  points: 0,
  lifetimePoints: 0,
  stepsTarget: 10000,
  waterTarget: 10,
  monthlyBudget: 4000,
  weeklyLimit: 1000,
  savedFromImpulse: 0,
  morningReminderTime: '08:00',
  middayReminderTime: '13:30',
  eveningReminderTime: '21:00',
  scheduleCategories: DEFAULT_SCHEDULE_CATEGORIES,
  habits: [
    { id: 1, title: 'אימון בוקר', subtitle: `20 דקות תנועה והזרמת אנרגיה (+${POINTS.WORKOUT} נק׳)`, time: '07:30', streak: 0, completedDates: [] },
    { id: 2, title: 'מדיטציה ונשימות', subtitle: '10 דקות של שקט לפני תחילת היום', time: '', streak: 0, completedDates: [] }
  ],
  badHabits: [
    { id: 1, title: 'גלילה מוגזמת במסכים בלילה', penalty: 8, slipDates: [], createdAt: realTodayStr }
  ],
  eatingSupport: DEFAULT_EATING_SUPPORT,
  eventTypes: DEFAULT_EVENT_TYPES,
  events: [
    {
      id: 501,
      title: 'זמן איכות ותכנון שבועי',
      typeId: 'personal',
      typeLabel: 'אישי / משפחה',
      typeIcon: '💜',
      date: realTodayStr,
      time: '18:00',
      isAllDay: false,
      notes: 'מעבר על מטרות השבוע ביומן',
      reminderMode: '15',
      reminderMinutes: 15,
      customReminderDate: realTodayStr,
      customReminderTime: '17:45',
      color: '#eae4f9',
      notified: false
    }
  ],
  workTasks: [
    { id: 101, title: 'להגיש מצגת פרויקט', dueDate: realTodayStr, done: false }
  ],
  expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
  incomeCategories: DEFAULT_INCOME_CATEGORIES,
  expenses: [],
  incomes: [],
  wishlist: [],
  rewards: DEFAULT_REWARDS,
  redeemedHistory: []
});

const mergeRewardsList = (existingRewards) => {
  if (!existingRewards || !Array.isArray(existingRewards) || existingRewards.length === 0) {
    return DEFAULT_REWARDS;
  }
  const merged = [...existingRewards];
  DEFAULT_REWARDS.forEach(defReward => {
    const alreadyExists = merged.some(r => r.title === defReward.title);
    if (!alreadyExists) {
      merged.push({ ...defReward, id: Date.now() + Math.floor(Math.random() * 10000) + defReward.id });
    }
  });
  return merged.sort((a, b) => a.cost - b.cost);
};

const ensureGlobalDataFields = (parsed, realTodayStr) => {
  const defaults = getDefaultGlobalData(realTodayStr);
  return {
    ...defaults,
    ...parsed,
    weeklyLimit: parsed.weeklyLimit ?? (parsed.dailyLimit ? parsed.dailyLimit * 7 : 1000),
    scheduleCategories: parsed.scheduleCategories?.length ? parsed.scheduleCategories : DEFAULT_SCHEDULE_CATEGORIES,
    events: parsed.events || defaults.events,
    eventTypes: parsed.eventTypes?.length ? parsed.eventTypes : DEFAULT_EVENT_TYPES,
    expenseCategories: parsed.expenseCategories?.length ? parsed.expenseCategories : DEFAULT_EXPENSE_CATEGORIES,
    incomeCategories: parsed.incomeCategories?.length ? parsed.incomeCategories : DEFAULT_INCOME_CATEGORIES,
    incomes: parsed.incomes || [],
    expenses: parsed.expenses || [],
    eatingSupport: { ...DEFAULT_EATING_SUPPORT, ...(parsed.eatingSupport || {}) },
    rewards: mergeRewardsList(parsed.rewards)
  };
};

const loadUserGlobalData = (usernameKey, realTodayStr) => {
  const userKey = `balance_user_${usernameKey}_global`;
  const savedUser = localStorage.getItem(userKey);
  if (savedUser) {
    try {
      return ensureGlobalDataFields(JSON.parse(savedUser), realTodayStr);
    } catch (e) {}
  }
  if (!localStorage.getItem('balance_legacy_migrated')) {
    const legacyKeys = ['balance_perm_global', 'balance_global_v5', 'balance_global_v4'];
    for (const k of legacyKeys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            return ensureGlobalDataFields(parsed, realTodayStr);
          }
        } catch (e) {}
      }
    }
  }
  return getDefaultGlobalData(realTodayStr);
};

const loadUserDaysHistory = (usernameKey) => {
  const userKey = `balance_user_${usernameKey}_days`;
  const savedUser = localStorage.getItem(userKey);
  if (savedUser) {
    try {
      return JSON.parse(savedUser);
    } catch (e) {}
  }
  if (!localStorage.getItem('balance_legacy_migrated')) {
    const legacyKeys = ['balance_perm_days', 'balance_days_v5', 'balance_days_v4'];
    for (const k of legacyKeys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && Object.keys(parsed).length > 0) return parsed;
        } catch (e) {}
      }
    }
  }
  return {};
};

function ToastHost({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.kind}`}>{t.message}</div>
      ))}
    </div>
  );
}

export default function App() {
  const realTodayStr = getLocalDateStr();
  const [selectedDate, setSelectedDate] = useState(realTodayStr);
  const selectedMonth = selectedDate.slice(0, 7);

  // --- מצב בחירת רצף ימים בלוח השנה ---
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState(realTodayStr);
  const [rangeEnd, setRangeEnd] = useState(realTodayStr);

  // משתמש מחובר ושמירת כניסה אוטומטית
  const [currentUser, setCurrentUser] = useState(() => {
    const savedSession = localStorage.getItem('balance_active_session') || sessionStorage.getItem('balance_active_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        // סשן מהגרסה הישנה (בלי uid) – צריך להתחבר פעם אחת מחדש כדי לעבור למערכת המאובטחת
        if (parsed?.uid) return parsed;
      } catch (e) {}
    }
    return null;
  });

  // שדות מסך התחברות / הרשמה
  const [authMode, setAuthMode] = useState('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  const isUrlWidget = new URLSearchParams(window.location.search).get('widget') === 'true';
  const [widgetMode, setWidgetMode] = useState(isUrlWidget);
  const [showWidgetGuide, setShowWidgetGuide] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [showScoreInfoModal, setShowScoreInfoModal] = useState(false);

  const [activeTab, setActiveTab] = useState('day');
  const [mantraIdx, setMantraIdx] = useState(() => {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    return dayOfYear % MANTRAS.length;
  });
  const [syncStatus, setSyncStatus] = useState('מסנכרן...');
  const [cloudReady, setCloudReady] = useState(false);

  const [globalData, setGlobalData] = useState(() => 
    currentUser ? loadUserGlobalData(currentUser.username, realTodayStr) : getDefaultGlobalData(realTodayStr)
  );
  const [daysHistory, setDaysHistory] = useState(() => 
    currentUser ? loadUserDaysHistory(currentUser.username) : {}
  );

  const currentDay = daysHistory[selectedDate] || createEmptyDay();
  const scheduleCategoriesList = globalData.scheduleCategories || DEFAULT_SCHEDULE_CATEGORIES;
  const eventTypesList = globalData.eventTypes || DEFAULT_EVENT_TYPES;
  const expenseCategoriesList = globalData.expenseCategories || DEFAULT_EXPENSE_CATEGORIES;
  const incomeCategoriesList = globalData.incomeCategories || DEFAULT_INCOME_CATEGORIES;

  // --- ניהול עריכה והוספה של קטגוריות בסדר היום ---
  const [showScheduleCatManager, setShowScheduleCatManager] = useState(false);
  const [schedCatLabelInput, setSchedCatLabelInput] = useState('');
  const [schedCatIconInput, setSchedCatIconInput] = useState('✨');
  const [schedCatBehaviorInput, setSchedCatBehaviorInput] = useState('regular');
  const [editingSchedCatId, setEditingSchedCatId] = useState(null);

  // --- שדות טפסים - אירועים ביומן (כולל תאריך סיום לרצף ימים!) ---
  const [eventTitle, setEventTitle] = useState('');
  const [eventTypeId, setEventTypeId] = useState('meeting');
  const [eventDate, setEventDate] = useState(realTodayStr);
  const [eventEndDate, setEventEndDate] = useState(realTodayStr);
  const [eventTime, setEventTime] = useState('17:00');
  const [eventIsAllDay, setEventIsAllDay] = useState(false);
  const [eventNotes, setEventNotes] = useState('');
  const [eventReminderMode, setEventReminderMode] = useState('15');
  const [customMinutesBefore, setCustomMinutesBefore] = useState(30);
  const [customReminderDate, setCustomReminderDate] = useState(realTodayStr);
  const [customReminderTime, setCustomReminderTime] = useState('09:00');
  const [editingEventId, setEditingEventId] = useState(null);

  const [showEventTypesManager, setShowEventTypesManager] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [newTypeIcon, setNewTypeIcon] = useState('🌟');
  const [newTypeColor, setNewTypeColor] = useState('#f4b342');
  const [editingTypeId, setEditingTypeId] = useState(null);

  useEffect(() => {
    if (!editingEventId) {
      if (isRangeMode && rangeStart && rangeEnd) {
        const s = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
        const e = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
        setEventDate(s);
        setEventEndDate(e);
        setCustomReminderDate(s);
      } else {
        setEventDate(selectedDate);
        setEventEndDate(selectedDate);
        setCustomReminderDate(selectedDate);
      }
    }
  }, [selectedDate, isRangeMode, rangeStart, rangeEnd, editingEventId]);

  // --- שדות טפסים - סדר יום ---
  const [newTaskCategory, setNewTaskCategory] = useState('general');
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskSubtitle, setNewTaskSubtitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [workoutSubtype, setWorkoutSubtype] = useState(WORKOUT_SUBTYPES[0]);
  const [customWorkoutSubtype, setCustomWorkoutSubtype] = useState('');
  const [workoutPostMetric, setWorkoutPostMetric] = useState('');
  const [workoutIntensity, setWorkoutIntensity] = useState(4);

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [editingTaskSubtitle, setEditingTaskSubtitle] = useState('');
  const [editingTaskTime, setEditingTaskTime] = useState('');

  const [workoutMetricModalTask, setWorkoutMetricModalTask] = useState(null);
  const [modalWorkoutFeeling, setModalWorkoutFeeling] = useState(POST_WORKOUT_FEELINGS[0]);
  const [modalWorkoutIntensity, setModalWorkoutIntensity] = useState(4);
  const [modalWorkoutNotes, setModalWorkoutNotes] = useState('');

  // --- שדות טפסים - הרגלים קבועים ---
  const [newHabit, setNewHabit] = useState('');
  const [newHabitSubtitle, setNewHabitSubtitle] = useState('');
  const [newHabitTime, setNewHabitTime] = useState('');
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editingHabitTitle, setEditingHabitTitle] = useState('');
  const [editingHabitSubtitle, setEditingHabitSubtitle] = useState('');
  const [editingHabitTime, setEditingHabitTime] = useState('');

  // הרגלים להפחתה
  const [newBadHabitTitle, setNewBadHabitTitle] = useState('');
  const [newBadHabitPenalty, setNewBadHabitPenalty] = useState(8);
  const [encouragementBanner, setEncouragementBanner] = useState(null);

  // משימות עבודה וכללי
  const [workTitle, setWorkTitle] = useState('');
  const [workDeadline, setWorkDeadline] = useState('');

  // --- שדות טפסים - תקציב ---
  const [budgetEntryMode, setBudgetEntryMode] = useState('expense');
  const [expTitle, setExpTitle] = useState('');
  const [expCost, setExpCost] = useState('');
  const [expCategory, setExpCategory] = useState('סופר ומזון');
  const [customOtherExpCatName, setCustomOtherExpCatName] = useState('');
  const [customOtherExpCatIcon, setCustomOtherExpCatIcon] = useState('✨');
  const [customOtherExpCatColor, setCustomOtherExpCatColor] = useState('#a78bfa');
  const [expType, setExpType] = useState('need');

  const [incTitle, setIncTitle] = useState('');
  const [incAmount, setIncAmount] = useState('');
  const [incCategory, setIncCategory] = useState('משכורת');
  const [customIncCategoryName, setCustomIncCategoryName] = useState('');
  const [incIsRecurring, setIncIsRecurring] = useState(false);
  const [incRepeatCount, setIncRepeatCount] = useState(3);
  const [incRepeatFreq, setIncRepeatFreq] = useState('monthly');

  const [showBudgetSettings, setShowBudgetSettings] = useState(false);
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [editingExpCatId, setEditingExpCatId] = useState(null);
  const [editExpCatName, setEditExpCatName] = useState('');
  const [editExpCatIcon, setEditExpCatIcon] = useState('📦');
  const [editExpCatColor, setEditExpCatColor] = useState('#a3be8c');

  const [wishTitle, setWishTitle] = useState('');
  const [wishCost, setWishCost] = useState('');

  // אוכל וארוחות
  const [mealText, setMealText] = useState('');
  const [mealType, setMealType] = useState('בוקר');
  const [mealTime, setMealTime] = useState(getNowHHMM);
  const [editingMealId, setEditingMealId] = useState(null);
  const [editingMealType, setEditingMealType] = useState('בוקר');
  const [editingMealText, setEditingMealText] = useState('');
  const [editingMealTime, setEditingMealTime] = useState('');

  // פרסים
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardCost, setNewRewardCost] = useState('');

  // מודאלים
  const [reflectionModal, setReflectionModal] = useState(null);
  const [selectedMood, setSelectedMood] = useState('🙂');
  const [deepThought, setDeepThought] = useState('');
  const [showMorningModal, setShowMorningModal] = useState(false);
  const [morningInput, setMorningInput] = useState('');
  const [showMiddayModal, setShowMiddayModal] = useState(false);
  const [middayMood, setMiddayMood] = useState('🙂');
  const [middayNote, setMiddayNote] = useState('');
  const [showEveningModal, setShowEveningModal] = useState(false);
  const [tempScore, setTempScore] = useState(8);
  const [tempSummary, setTempSummary] = useState('');

  // --- ערכת נושא (בהיר / כהה / אוטומטי) והודעות צפות ---
  const [themePref, setThemePref] = useState(getStoredTheme);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    applyTheme(themePref);
    try { localStorage.setItem(THEME_KEY, themePref); } catch (e) {}
    if (themePref !== 'auto' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('auto');
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [themePref]);

  useEffect(() => subscribeToasts(toast => {
    setToasts(prev => [...prev.filter(t => t.kind !== toast.kind || toast.kind !== 'points'), toast].slice(-3));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), toast.duration);
  }), []);

  // --- רגע קשה עם אוכל (SOS) ---
  const [showUrgeModal, setShowUrgeModal] = useState(false);
  const [urgeStep, setUrgeStep] = useState('halt'); // halt | timer | outcome | done
  const [urgeHalt, setUrgeHalt] = useState([]);
  const [urgeIntensity, setUrgeIntensity] = useState(3);
  const [urgeNote, setUrgeNote] = useState('');
  const [urgeUsedTimer, setUrgeUsedTimer] = useState(false);
  const [urgeTimerEnd, setUrgeTimerEnd] = useState(null);
  const [urgeTick, setUrgeTick] = useState(Date.now());
  const [urgeDoneOutcome, setUrgeDoneOutcome] = useState(null);
  const [newMealReminderTime, setNewMealReminderTime] = useState('');
  const [newMealReminderLabel, setNewMealReminderLabel] = useState('ארוחה');

  const getLevelInfo = (xp = 0) => {
    if (xp >= 1000) return { title: '👑 מאסטרית של איזון', level: 4 };
    if (xp >= 400) return { title: '🌸 פורחת ומאוזנת', level: 3 };
    if (xp >= 120) return { title: '🌿 מתמידה יומית', level: 2 };
    return { title: '🌱 ניצן של איזון', level: 1 };
  };
  const levelInfo = getLevelInfo(globalData.lifetimePoints || globalData.points);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const activateWidgetModeWithUrl = () => {
    try {
      window.history.replaceState({}, '', '/?widget=true');
    } catch (e) {}
    setShowWidgetGuide(false);
    setWidgetMode(true);
  };

  const exitWidgetModeWithUrl = () => {
    try {
      window.history.replaceState({}, '', '/');
    } catch (e) {}
    setWidgetMode(false);
  };

  // --- לחיצה על יום בלוח השנה (תומך ביום בודד או בבחירת רצף ימים!) ---
  const handleCalendarDayClick = (dateStr) => {
    setSelectedDate(dateStr);
    if (!isRangeMode) {
      setRangeStart(dateStr);
      setRangeEnd(dateStr);
      return;
    }
    // אם כבר יש טווח שלם או שאין התחלה -> נתחיל טווח חדש מהיום שנלחץ
    if (!rangeStart || (rangeStart && rangeEnd && rangeStart !== rangeEnd)) {
      setRangeStart(dateStr);
      setRangeEnd(dateStr);
    } else {
      // לחיצה שנייה סוגרת את הרצף בין שני התאריכים
      if (dateStr < rangeStart) {
        setRangeEnd(rangeStart);
        setRangeStart(dateStr);
      } else {
        setRangeEnd(dateStr);
      }
    }
  };

  const selectedDateRangeArray = isRangeMode ? getDatesBetween(rangeStart, rangeEnd) : [selectedDate];

  // --- התחברות והרשמה מאובטחת (Firebase Auth) ---
  const finishLogin = (sessionObj, cloudGlobal, cloudDays, statusText) => {
    localStorage.setItem(`balance_user_${sessionObj.username}_global`, JSON.stringify(cloudGlobal));
    localStorage.setItem(`balance_user_${sessionObj.username}_days`, JSON.stringify(cloudDays));
    localStorage.setItem('balance_active_session', JSON.stringify(sessionObj));
    localStorage.setItem('balance_legacy_migrated', 'true');
    localStorage.removeItem('balance_local_accounts'); // ניקוי גיבובי סיסמאות ישנים מהמכשיר
    setGlobalData(cloudGlobal);
    setDaysHistory(cloudDays);
    setCurrentUser(sessionObj);
    setCloudReady(true);
    setSyncStatus(statusText);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    const cleanUsername = authUsername.trim().toLowerCase();
    const rawPassword = authPassword.trim();
    if (!cleanUsername || !rawPassword) {
      setAuthError('נא להזין שם משתמש וסיסמה.');
      return;
    }
    if (authMode === 'register' && rawPassword.length < 6) {
      setAuthError('הסיסמה חייבת להכיל לפחות 6 תווים.');
      return;
    }

    setAuthLoading(true);
    try {
      await setPersistence(auth, rememberMe
        ? (Capacitor.isNativePlatform() ? indexedDBLocalPersistence : browserLocalPersistence)
        : browserSessionPersistence
      ).catch(() => {});

      const email = usernameToEmail(cleanUsername);
      const authPass = toAuthPassword(rawPassword);

      if (authMode === 'register') {
        const legacySnap = await getDoc(doc(db, 'users', cleanUsername)).catch(() => null);
        if (legacySnap && legacySnap.exists() && legacySnap.data().passwordHash) {
          setAuthError('שם המשתמש הזה כבר קיים. עברי ל"התחברות קיימת" – החשבון יועבר אוטומטית למערכת המאובטחת.');
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, authPass);
        const displayName = authDisplayName.trim() || authUsername.trim();
        await updateProfile(cred.user, { displayName }).catch(() => {});
        const initialGlobal = loadUserGlobalData(cleanUsername, realTodayStr);
        const initialDays = loadUserDaysHistory(cleanUsername);
        await setDoc(doc(db, 'accounts', cred.user.uid), {
          username: cleanUsername,
          displayName,
          globalData: initialGlobal,
          daysHistory: initialDays,
          updatedAt: new Date().toISOString()
        });
        finishLogin({ uid: cred.user.uid, username: cleanUsername, displayName }, initialGlobal, initialDays, 'מסונכרן לענן ☁️');
        return;
      }

      // התחברות
      try {
        const cred = await signInWithEmailAndPassword(auth, email, authPass);
        const snap = await getDoc(doc(db, 'accounts', cred.user.uid));
        const data = snap.exists() ? snap.data() : {};
        const displayName = data.displayName || cred.user.displayName || cleanUsername;
        finishLogin(
          { uid: cred.user.uid, username: cleanUsername, displayName },
          ensureGlobalDataFields(data.globalData || loadUserGlobalData(cleanUsername, realTodayStr), realTodayStr),
          data.daysHistory || loadUserDaysHistory(cleanUsername),
          'מסונכרן לענן ☁️'
        );
        return;
      } catch (signInErr) {
        if (signInErr?.code === 'auth/network-request-failed') throw signInErr;
        // אולי זה חשבון מהגרסה הקודמת – ננסה להעביר אותו
      }

      const legacyRef = doc(db, 'users', cleanUsername);
      const legacySnap = await getDoc(legacyRef);
      if (!legacySnap.exists() || legacySnap.data().passwordHash !== hashPassword(rawPassword)) {
        setAuthError('שם משתמש או סיסמה שגויים.');
        return;
      }
      const legacy = legacySnap.data();
      const cred = await createUserWithEmailAndPassword(auth, email, authPass);
      const displayName = legacy.displayName || cleanUsername;
      await updateProfile(cred.user, { displayName }).catch(() => {});
      const migratedGlobal = ensureGlobalDataFields(legacy.globalData || {}, realTodayStr);
      const migratedDays = legacy.daysHistory || {};
      await setDoc(doc(db, 'accounts', cred.user.uid), {
        username: cleanUsername,
        displayName,
        globalData: migratedGlobal,
        daysHistory: migratedDays,
        migratedFromLegacy: true,
        updatedAt: new Date().toISOString()
      });
      await deleteDoc(legacyRef).catch(() => {}); // מחיקת העותק הישן והחשוף
      finishLogin({ uid: cred.user.uid, username: cleanUsername, displayName }, migratedGlobal, migratedDays, 'החשבון אובטח והועבר ☁️🔒');
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') setAuthError('שם המשתמש תפוס, או שהסיסמה שגויה.');
      else if (code === 'auth/network-request-failed' || code === 'unavailable') setAuthError('אין חיבור לאינטרנט. בכניסה ראשונה במכשיר צריך חיבור – אחר כך האפליקציה עובדת גם בלי.');
      else if (code === 'auth/too-many-requests') setAuthError('יותר מדי ניסיונות. נסי שוב בעוד כמה דקות.');
      else if (code === 'auth/weak-password') setAuthError('הסיסמה חלשה מדי – לפחות 6 תווים.');
      else setAuthError('משהו השתבש בהתחברות. נסי שוב.');
    } finally {
      setAuthLoading(false);
    }
  };

  const [backupBusy, setBackupBusy] = useState(false);

  const handleExportBackup = async () => {
    setBackupBusy(true);
    try {
      const name = await exportBackup({ username: currentUser?.username, globalData, daysHistory });
      showToast(`הגיבוי נשמר: ${name} 💾`, { kind: 'success' });
    } catch (e) {
      if (!String(e?.message || '').toLowerCase().includes('cancel')) {
        showToast('לא הצלחתי ליצור גיבוי. נסי שוב.', { kind: 'warning' });
      }
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = await readBackupFile(file);
      const when = data.exportedAt ? new Date(data.exportedAt).toLocaleDateString('he-IL') : 'לא ידוע';
      if (!window.confirm(`לשחזר את הגיבוי מתאריך ${when}?\nהנתונים הנוכחיים יוחלפו בנתוני הגיבוי.`)) return;
      // גיבוי בטיחות אוטומטי של המצב הנוכחי במכשיר לפני ההחלפה
      try {
        localStorage.setItem(`balance_user_${currentUser.username}_pre_restore`, JSON.stringify({ globalData, daysHistory, at: new Date().toISOString() }));
      } catch (err) {}
      setGlobalData(ensureGlobalDataFields(data.globalData, realTodayStr));
      setDaysHistory(data.daysHistory || {});
      showToast('הגיבוי שוחזר בהצלחה ✓', { kind: 'success' });
      haptic('success');
    } catch (err) {
      showToast(err.message || 'השחזור נכשל', { kind: 'warning', duration: 3500 });
    }
  };

  const handleLogout = async () => {
    await signOut(auth).catch(() => {});
    localStorage.removeItem('balance_active_session');
    sessionStorage.removeItem('balance_active_session');
    if (Capacitor.isNativePlatform()) clearNativeSchedule();
    setCurrentUser(null);
    setCloudReady(false);
    setShowUserModal(false);
    setAuthPassword('');
  };

  // מעקב אחרי מצב ההתחברות האמיתי מול Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        setCurrentUser(prev => {
          if (prev) {
            localStorage.removeItem('balance_active_session');
            sessionStorage.removeItem('balance_active_session');
          }
          return null;
        });
        setCloudReady(false);
      }
    });
    return unsub;
  }, []);

  // סנכרון מהענן בפתיחה
  useEffect(() => {
    if (!currentUser?.uid) return;
    let isMounted = true;

    async function syncUserFromCloud() {
      try {
        const snap = await getDoc(doc(db, 'accounts', currentUser.uid));
        if (snap.exists() && isMounted) {
          const data = snap.data();
          if (data.globalData) {
            setGlobalData(prev => ensureGlobalDataFields({ ...prev, ...data.globalData }, realTodayStr));
          }
          if (data.daysHistory && Object.keys(data.daysHistory).length > 0) {
            setDaysHistory(prev => ({ ...prev, ...data.daysHistory }));
          }
          setSyncStatus('מסונכרן לענן ☁️');
        }
      } catch (err) {
        if (isMounted) setSyncStatus('שמור במכשיר 📱');
      } finally {
        if (isMounted) setCloudReady(true);
      }
    }

    syncUserFromCloud();
    return () => { isMounted = false; };
  }, [currentUser?.uid, realTodayStr]);

  // שמירה: מיידית למכשיר, ולענן אחרי השהייה קצרה (במקום על כל הקשה במקלדת)
  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(`balance_user_${currentUser.username}_global`, JSON.stringify(globalData));
    localStorage.setItem(`balance_user_${currentUser.username}_days`, JSON.stringify(daysHistory));

    if (!cloudReady || !currentUser.uid) return;
    setSyncStatus('שומר... ⏳');
    const t = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'accounts', currentUser.uid), {
          username: currentUser.username,
          displayName: currentUser.displayName,
          globalData,
          daysHistory,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setSyncStatus('מסונכרן לענן ☁️');
      } catch (err) {
        setSyncStatus('שמור במכשיר 📱');
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [globalData, daysHistory, currentUser, cloudReady]);

  const sendAndroidNotification = (title, body, tag = 'balance-alert', extra = {}) => notify(title, body, tag, extra);

  // --- ניהול עריכה והוספה של קטגוריות בסדר היום ---
  const saveScheduleCategory = () => {
    if (!schedCatLabelInput.trim()) return;
    if (editingSchedCatId) {
      setGlobalData(prev => ({
        ...prev,
        scheduleCategories: (prev.scheduleCategories || DEFAULT_SCHEDULE_CATEGORIES).map(c =>
          c.id === editingSchedCatId
            ? { ...c, label: schedCatLabelInput.trim(), icon: schedCatIconInput || '📌', behavior: schedCatBehaviorInput }
            : c
        )
      }));
      setEditingSchedCatId(null);
    } else {
      const newCat = {
        id: `sched_cat_${Date.now()}`,
        label: schedCatLabelInput.trim(),
        icon: schedCatIconInput || '✨',
        behavior: schedCatBehaviorInput
      };
      setGlobalData(prev => ({
        ...prev,
        scheduleCategories: [...(prev.scheduleCategories || DEFAULT_SCHEDULE_CATEGORIES), newCat]
      }));
      setNewTaskCategory(newCat.id);
    }
    setSchedCatLabelInput('');
    setSchedCatIconInput('✨');
    setSchedCatBehaviorInput('regular');
  };

  const startEditScheduleCategory = (cat) => {
    setEditingSchedCatId(cat.id);
    setSchedCatLabelInput(cat.label);
    setSchedCatIconInput(cat.icon);
    setSchedCatBehaviorInput(cat.behavior || 'regular');
  };

  const deleteScheduleCategory = (id) => {
    if (scheduleCategoriesList.length <= 1) return;
    setGlobalData(prev => ({
      ...prev,
      scheduleCategories: (prev.scheduleCategories || DEFAULT_SCHEDULE_CATEGORIES).filter(c => c.id !== id)
    }));
  };

  // --- ניהול סוגי אירועים ביומן ---
  const saveEventType = () => {
    if (!newTypeLabel.trim()) return;
    if (editingTypeId) {
      setGlobalData(prev => ({
        ...prev,
        eventTypes: (prev.eventTypes || DEFAULT_EVENT_TYPES).map(t =>
          t.id === editingTypeId ? { ...t, label: newTypeLabel.trim(), icon: newTypeIcon || '📅', color: newTypeColor } : t
        )
      }));
      setEditingTypeId(null);
    } else {
      const newType = {
        id: `type_${Date.now()}`,
        label: newTypeLabel.trim(),
        icon: newTypeIcon || '📅',
        color: newTypeColor
      };
      setGlobalData(prev => ({
        ...prev,
        eventTypes: [...(prev.eventTypes || DEFAULT_EVENT_TYPES), newType]
      }));
      setEventTypeId(newType.id);
    }
    setNewTypeLabel('');
    setNewTypeIcon('🌟');
  };

  const startEditEventType = (t) => {
    setEditingTypeId(t.id);
    setNewTypeLabel(t.label);
    setNewTypeIcon(t.icon);
    setNewTypeColor(t.color);
  };

  const deleteEventType = (id) => {
    const currentList = globalData.eventTypes || DEFAULT_EVENT_TYPES;
    if (currentList.length <= 1) return;
    setGlobalData(prev => ({
      ...prev,
      eventTypes: (prev.eventTypes || DEFAULT_EVENT_TYPES).filter(t => t.id !== id)
    }));
  };

  // --- ניהול אירועים ביומן (כולל שיבוץ אוטומטי על פני רצף ימים!) ---
  const exportAllEventsToICS = () => {
    const evList = globalData.events || [];
    if (evList.length === 0) {
      showToast('אין עדיין אירועים ביומן לייצוא.', { kind: 'warning' });
      return;
    }
    if (isNative) {
      showToast('באנדרואיד אין צורך בייצוא – התזכורות מגיעות כהתראות והאירוע הקרוב מוצג בווידג׳ט 🌿', { duration: 4000 });
      return;
    }
    const esc = (t = '') => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const nextDay = (dStr) => addIntervalToDate(dStr, 1, 'daily').replace(/-/g, '');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BalanceApp//HE', 'CALSCALE:GREGORIAN'];
    evList.forEach(ev => {
      const d = ev.date.replace(/-/g, '');
      const t = (ev.time || '12:00').replace(':', '') + '00';
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${ev.id}@balance-app`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`SUMMARY:${esc(`${ev.typeIcon || '📅'} ${ev.title}`)}`);
      if (ev.isAllDay) {
        lines.push(`DTSTART;VALUE=DATE:${d}`);
        lines.push(`DTEND;VALUE=DATE:${nextDay(ev.date)}`);
      } else {
        lines.push(`DTSTART:${d}T${t}`);
        lines.push('DURATION:PT1H');
      }
      if (ev.notes) lines.push(`DESCRIPTION:${esc(ev.notes)}`);
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const ics = lines.join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-calendar-events.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const saveCalendarEvent = () => {
    if (!eventTitle.trim() || !eventDate) return;

    const chosenType = eventTypesList.find(t => t.id === eventTypeId) || eventTypesList[0];
    const resolvedMinutes =
      eventReminderMode === 'custom_minutes'
        ? Number(customMinutesBefore) || 30
        : eventReminderMode === 'custom_datetime'
        ? 0
        : Number(eventReminderMode);

    if (editingEventId) {
      const updatedPayload = {
        id: editingEventId,
        title: eventTitle.trim(),
        typeId: chosenType.id,
        typeLabel: chosenType.label,
        typeIcon: chosenType.icon,
        color: chosenType.color,
        date: eventDate,
        isAllDay: eventIsAllDay,
        time: eventIsAllDay ? '' : (eventTime || '12:00'),
        notes: eventNotes.trim(),
        reminderMode: eventReminderMode,
        reminderMinutes: resolvedMinutes,
        customReminderDate: eventReminderMode === 'custom_datetime' ? customReminderDate : eventDate,
        customReminderTime: eventReminderMode === 'custom_datetime' ? customReminderTime : (eventTime || '09:00'),
        notified: false
      };
      setGlobalData(prev => ({
        ...prev,
        events: (prev.events || []).map(ev => (ev.id === editingEventId ? updatedPayload : ev))
      }));
      setEditingEventId(null);
    } else {
      // בדיקה אם נבחר רצף של כמה ימים!
      const datesToCreate = getDatesBetween(eventDate, eventEndDate || eventDate);
      const baseId = Date.now();
      const newEventsBatch = datesToCreate.map((dStr, idx) => ({
        id: baseId + idx,
        title: datesToCreate.length > 1 ? `${eventTitle.trim()} (יום ${idx + 1}/${datesToCreate.length})` : eventTitle.trim(),
        typeId: chosenType.id,
        typeLabel: chosenType.label,
        typeIcon: chosenType.icon,
        color: chosenType.color,
        date: dStr,
        isAllDay: eventIsAllDay,
        time: eventIsAllDay ? '' : (eventTime || '12:00'),
        notes: eventNotes.trim(),
        reminderMode: eventReminderMode,
        reminderMinutes: resolvedMinutes,
        customReminderDate: eventReminderMode === 'custom_datetime' ? customReminderDate : dStr,
        customReminderTime: eventReminderMode === 'custom_datetime' ? customReminderTime : (eventTime || '09:00'),
        notified: false
      }));

      setGlobalData(prev => ({
        ...prev,
        events: [...(prev.events || []), ...newEventsBatch]
      }));
      adjustPoints(POINTS.EVENT);
    }

    setEventTitle('');
    setEventNotes('');
    setEventIsAllDay(false);
  };

  const startEditEvent = (ev) => {
    setActiveTab('calendar');
    setEditingEventId(ev.id);
    setEventTitle(ev.title);
    setEventTypeId(ev.typeId || 'meeting');
    setEventDate(ev.date);
    setEventEndDate(ev.date);
    setEventIsAllDay(Boolean(ev.isAllDay));
    setEventTime(ev.time || '12:00');
    setEventNotes(ev.notes || '');
    setEventReminderMode(ev.reminderMode || String(ev.reminderMinutes ?? '15'));
    if (ev.reminderMode === 'custom_minutes') {
      setCustomMinutesBefore(ev.reminderMinutes || 30);
    }
    setCustomReminderDate(ev.customReminderDate || ev.date);
    setCustomReminderTime(ev.customReminderTime || ev.time || '09:00');
    window.scrollTo({ top: 260, behavior: 'smooth' });
  };

  const deleteCalendarEvent = (id) => {
    setGlobalData(prev => ({
      ...prev,
      events: (prev.events || []).filter(ev => ev.id !== id)
    }));
    if (editingEventId === id) {
      setEditingEventId(null);
      setEventTitle('');
      setEventNotes('');
    }
  };

  const formatReminderBadgeText = (ev) => {
    if (ev.reminderMode === '-1' || ev.reminderMinutes === -1) return 'ללא התראה 🔕';
    if (ev.reminderMode === 'custom_datetime') {
      return `התראה מותאמת: ${ev.customReminderDate} ב-${ev.customReminderTime} 🎯`;
    }
    if (ev.reminderMode === 'custom_minutes') {
      return `התראה: ${ev.reminderMinutes} דק׳ לפני ⏱️`;
    }
    const preset = REMINDER_OPTIONS.find(r => r.value === String(ev.reminderMinutes));
    return preset ? preset.label : `התראה: ${ev.reminderMinutes} דק׳ לפני`;
  };

  const allSortedEvents = [...(globalData.events || [])].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time || '').localeCompare(b.time || '');
  });

  const upcomingEvents = allSortedEvents.filter(ev => ev.date >= realTodayStr);

  const formatUpcomingWhen = (ev) => {
    const todayMs = new Date(realTodayStr).setHours(0, 0, 0, 0);
    const evMs = new Date(ev.date).setHours(0, 0, 0, 0);
    const diffDays = Math.round((evMs - todayMs) / 86400000);
    const timeLabel = ev.isAllDay ? 'כל היום' : `ב-${ev.time}`;
    if (diffDays < 0) return `עבר (${ev.date.slice(5)})`;
    if (diffDays === 0) return `היום (${timeLabel})`;
    if (diffDays === 1) return `מחר (${timeLabel})`;
    return `עוד ${diffDays} ימים (${ev.date.slice(5)})`;
  };

  const pinStatusToAndroidLockScreen = () => {
    const nextEv = upcomingEvents[0];
    const nextEvStr = nextEv ? `${nextEv.typeIcon || '📅'} קרוב: ${nextEv.title} (${formatUpcomingWhen(nextEv)})` : '📅 אין אירועים קרובים';
    const statusBody = `${nextEvStr}\n⭐ ${globalData.points} נק׳ | 💧 מים: ${currentDay.waterCount}/${globalData.waterTarget}`;
    sendAndroidNotification(`🌿 יומן וסטטוס - ${currentUser?.displayName || ''}`, statusBody, 'lockscreen-status');
  };

  // --- מנוע התראות אוטומטי ---
  useEffect(() => {
    if (!currentUser) return;
    // באנדרואיד ההתראות כבר מתוזמנות מראש במכשיר – כאן רק פותחים חלונות ומסמנים אירועים, בלי כפילויות
    const push = isNative ? () => {} : sendAndroidNotification;
    const checkRemindersAndEvents = () => {
      const now = new Date();
      const currentHHMM = now.toTimeString().slice(0, 5);
      const hour = now.getHours();

      const uPrefix = currentUser.username;
      const morningKey = `${uPrefix}_morning_${realTodayStr}`;
      const middayKey = `${uPrefix}_midday_${realTodayStr}`;
      const eveningKey = `${uPrefix}_evening_${realTodayStr}`;

      if (!localStorage.getItem(morningKey) && (currentHHMM === globalData.morningReminderTime || (hour >= 6 && hour < 11))) {
        localStorage.setItem(morningKey, 'true');
        push(`בוקר טוב, ${currentUser.displayName}! ☀️`, `${MANTRAS[mantraIdx]} — היכנסי לכתוב כוונה יומית.`);
        if (!widgetMode) setShowMorningModal(true);
      }

      const todayObj = daysHistory[realTodayStr];
      const hasMiddayToday = todayObj && todayObj.middayCheckin;
      if (!localStorage.getItem(middayKey) && !hasMiddayToday && (currentHHMM === (globalData.middayReminderTime || '13:30') || (hour >= 13 && hour < 16))) {
        localStorage.setItem(middayKey, 'true');
        push("עצירת אמצע היום 🌤️", "איך את מרגישה עכשיו? קחי נשימה עמוקה, שתי כוס מים ועשי צ׳ק-אין קצר!");
        if (!widgetMode) setShowMiddayModal(true);
      }

      const hasScoredToday = todayObj && todayObj.dailyScore !== null;
      if (!localStorage.getItem(eveningKey) && !hasScoredToday && (currentHHMM === globalData.eveningReminderTime || hour >= 20)) {
        localStorage.setItem(eveningKey, 'true');
        push("סוף יום מתקרב 🌙", "זמן למלא על כל היום ולתת ציון יומי!");
        if (!widgetMode) setShowEveningModal(true);
      }

      const nowMs = now.getTime();
      const nowMins = hhmmToMinutes(currentHHMM);
      const support = globalData.eatingSupport || DEFAULT_EATING_SUPPORT;
      // חלון של 30 דק׳ אחרי השעה שנבחרה – כך שההתראה תקפוץ גם אם האפליקציה נפתחה קצת באיחור
      const isInWindow = (hhmm) => {
        const target = hhmmToMinutes(hhmm);
        return target !== null && nowMins >= target && nowMins - target <= 30;
      };

      // 🍽️ תזכורות לאכילה סדירה (זמנים שבחרת בעצמך)
      (support.mealReminders || []).forEach(r => {
        const key = `${uPrefix}_mealrem_${r.id}_${realTodayStr}`;
        if (!localStorage.getItem(key) && isInWindow(r.time)) {
          localStorage.setItem(key, 'true');
          push(
            `זמן ל${r.label} 🍽️`,
            'אכילה סדירה לאורך היום עוזרת לגוף להרגיש בטוח ומפחיתה דחפים בהמשך. שבי, תאכלי לאט ותיהני 💛',
            `meal-rem-${r.id}`
          );
        }
      });

      // 🌙 תזכורת לפני שעה מאתגרת
      if (support.riskReminderTime) {
        const riskKey = `${uPrefix}_riskrem_${realTodayStr}`;
        if (!localStorage.getItem(riskKey) && isInWindow(support.riskReminderTime)) {
          localStorage.setItem(riskKey, 'true');
          push(
            'השעה המאתגרת מתקרבת 🌙',
            'מה התוכנית שלך להערב? אם יגיע דחף – כפתור "רגע קשה עם אוכל" באפליקציה מחכה לך. את לא לבד.',
            'risk-reminder'
          );
        }
      }

      // 🌊 סוף טיימר הגלישה על הדחף
      const timerEndRaw = localStorage.getItem(`${uPrefix}_urge_timer_end`);
      if (timerEndRaw && nowMs >= Number(timerEndRaw)) {
        localStorage.removeItem(`${uPrefix}_urge_timer_end`);
        push(
          `עברו ${URGE_TIMER_MINUTES} דקות 🌊`,
          'איך הדחף עכשיו? היכנסי לתעד איך זה הסתיים – כל תוצאה נחשבת.',
          'urge-timer'
        );
      }

      // 💛 מעקב עדין שעה אחרי רגע קשה
      const followUpRaw = localStorage.getItem(`${uPrefix}_followup_at`);
      if (followUpRaw && nowMs >= Number(followUpRaw)) {
        localStorage.removeItem(`${uPrefix}_followup_at`);
        push(
          'רק בודקת מה שלומך 💛',
          'בלי לפצות ובלי לדלג – הארוחה הבאה כרגיל, בזמן הרגיל שלה. כוס מים, נשימה עמוקה, וחמלה לעצמך.',
          'urge-followup'
        );
      }

      let eventsUpdated = false;
      const updatedEvents = (globalData.events || []).map(ev => {
        if (ev.notified || ev.reminderMode === '-1' || ev.reminderMinutes === -1) return ev;

        const baseTimeStr = ev.isAllDay ? '08:30' : (ev.time || '12:00');
        const eventDateTimeMs = new Date(`${ev.date}T${baseTimeStr}:00`).getTime();
        let triggerTimeMs = eventDateTimeMs - (Number(ev.reminderMinutes || 0) * 60 * 1000);

        if (ev.reminderMode === 'custom_datetime' && ev.customReminderDate && ev.customReminderTime) {
          triggerTimeMs = new Date(`${ev.customReminderDate}T${ev.customReminderTime}:00`).getTime();
        }

        if (nowMs >= triggerTimeMs && nowMs <= Math.max(eventDateTimeMs, triggerTimeMs) + 3600000) {
          eventsUpdated = true;
          push(
            `${ev.typeIcon || '📅'} ${ev.typeLabel || 'אירוע'}: ${ev.title}`,
            `${ev.isAllDay ? 'אירוע כל היום' : `בשעה ${ev.time}`}${ev.notes ? ` • ${ev.notes}` : ''}`,
            `event-${ev.id}`
          );
          return { ...ev, notified: true };
        }
        return ev;
      });

      if (eventsUpdated) {
        setGlobalData(prev => ({ ...prev, events: updatedEvents }));
      }
    };

    checkRemindersAndEvents();
    const timer = setInterval(checkRemindersAndEvents, 20000);
    return () => clearInterval(timer);
  }, [currentUser, globalData.morningReminderTime, globalData.middayReminderTime, globalData.eveningReminderTime, globalData.events, globalData.eatingSupport, realTodayStr, mantraIdx, daysHistory, widgetMode]);

  // --- טיימר "גלישה על הדחף" ---
  useEffect(() => {
    if (!urgeTimerEnd) return;
    const t = setInterval(() => setUrgeTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [urgeTimerEnd]);

  useEffect(() => {
    if (urgeTimerEnd && urgeStep === 'timer' && urgeTick >= urgeTimerEnd) {
      setUrgeStep('outcome');
    }
  }, [urgeTick, urgeTimerEnd, urgeStep]);

  const openUrgeModal = () => {
    if (urgeTimerEnd) {
      // חזרה לסשן פתוח – ממשיכים מאיפה שעצרנו
      setUrgeStep(Date.now() >= urgeTimerEnd ? 'outcome' : 'timer');
      setShowUrgeModal(true);
      return;
    }
    setUrgeStep('halt');
    setUrgeHalt([]);
    setUrgeIntensity(3);
    setUrgeNote('');
    setUrgeUsedTimer(false);
    setUrgeDoneOutcome(null);
    setShowUrgeModal(true);
  };

  const toggleUrgeHalt = (id) => {
    setUrgeHalt(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const startUrgeTimer = () => {
    const end = Date.now() + URGE_TIMER_MINUTES * 60 * 1000;
    setUrgeTimerEnd(end);
    setUrgeTick(Date.now());
    setUrgeUsedTimer(true);
    setUrgeStep('timer');
    // נשמר גם במכשיר – כך שהתראת "איך הדחף עכשיו?" תקפוץ גם אם סגרת את החלון
    if (currentUser) localStorage.setItem(`${currentUser.username}_urge_timer_end`, String(end));
    scheduleOneShot(
      NOTIF_IDS.URGE_TIMER,
      `עברו ${URGE_TIMER_MINUTES} דקות 🌊`,
      'איך הדחף עכשיו? לחצי כדי לתעד איך זה הסתיים – כל תוצאה נחשבת.',
      end,
      { open: 'sos' }
    );
  };

  const stopUrgeTimer = () => {
    setUrgeTimerEnd(null);
    cancelOneShot(NOTIF_IDS.URGE_TIMER);
    if (currentUser) localStorage.removeItem(`${currentUser.username}_urge_timer_end`);
    setUrgeStep('outcome');
  };

  const saveUrgeEntry = (outcome) => {
    const entry = {
      id: Date.now(),
      time: getNowHHMM(),
      halt: urgeHalt,
      intensity: urgeIntensity,
      note: urgeNote.trim(),
      outcome,
      usedTimer: urgeUsedTimer
    };
    updateCurrentDay(day => ({ ...day, urges: [entry, ...(day.urges || [])] }));
    adjustPoints(POINTS.URGE_CHECKIN);

    setUrgeTimerEnd(null);
    cancelOneShot(NOTIF_IDS.URGE_TIMER);
    if (currentUser) {
      localStorage.removeItem(`${currentUser.username}_urge_timer_end`);
      if (outcome === 'binge' && globalData.eatingSupport?.followUpAfterHardMoment !== false) {
        const followAt = Date.now() + 60 * 60 * 1000;
        localStorage.setItem(`${currentUser.username}_followup_at`, String(followAt));
        scheduleOneShot(
          NOTIF_IDS.URGE_FOLLOWUP,
          'רק בודקת מה שלומך 💛',
          'בלי לפצות ובלי לדלג – הארוחה הבאה כרגיל, בזמן הרגיל שלה. כוס מים, נשימה עמוקה, וחמלה לעצמך.',
          followAt
        );
      }
    }
    setUrgeDoneOutcome(outcome);
    setUrgeStep('done');
  };

  const deleteUrgeEntry = (id) => {
    updateCurrentDay(day => ({ ...day, urges: (day.urges || []).filter(u => u.id !== id) }));
  };

  const updateEatingSupport = (patch) => {
    setGlobalData(prev => ({
      ...prev,
      eatingSupport: { ...DEFAULT_EATING_SUPPORT, ...(prev.eatingSupport || {}), ...patch }
    }));
  };

  const addMealReminder = () => {
    if (!newMealReminderTime) return;
    const current = globalData.eatingSupport?.mealReminders || [];
    const next = [...current, { id: Date.now(), time: newMealReminderTime, label: newMealReminderLabel.trim() || 'ארוחה' }]
      .sort((a, b) => a.time.localeCompare(b.time));
    updateEatingSupport({ mealReminders: next });
    setNewMealReminderTime('');
    setNewMealReminderLabel('ארוחה');
  };

  const removeMealReminder = (id) => {
    updateEatingSupport({ mealReminders: (globalData.eatingSupport?.mealReminders || []).filter(r => r.id !== id) });
  };

  // --- אנדרואיד: קישורים מהווידג'ט / מהתראות, תזמון התראות ועדכון הווידג'ט ---
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => listenForDeepLinks(action => setPendingAction(action)), []);

  useEffect(() => {
    if (!currentUser) return;
    let cleanup = () => {};
    initNativeNotifications(extra => { if (extra?.open) setPendingAction(extra.open); })
      .then(fn => { cleanup = fn || (() => {}); });
    return () => cleanup();
  }, [currentUser?.uid]);

  // מבצעים פעולה רק אחרי שהנתונים מהענן נטענו – כדי שהסנכרון לא ידרוס אותה
  useEffect(() => {
    if (!pendingAction || !currentUser || !cloudReady) return;
    const action = pendingAction;
    setPendingAction(null);
    if (action !== 'widget') setWidgetMode(false);
    if (selectedDate !== realTodayStr && ['water', 'sos', 'morning', 'midday', 'evening'].includes(action)) {
      setSelectedDate(realTodayStr);
    }
    switch (action) {
      case 'sos': openUrgeModal(); break;
      case 'water':
        setActiveTab('day');
        // מחכים רגע שהתאריך יתעדכן להיום לפני ההוספה
        setTimeout(() => setPendingAction('water_add'), 0);
        break;
      case 'water_add': changeWater(1); break;
      case 'journal': setActiveTab('journal'); break;
      case 'calendar': setActiveTab('calendar'); break;
      case 'morning':
        setMorningInput((daysHistory[realTodayStr] || {}).morningIntention || '');
        setShowMorningModal(true);
        break;
      case 'midday': setShowMiddayModal(true); break;
      case 'evening': setShowEveningModal(true); break;
      case 'widget': setWidgetMode(true); break;
      default: setActiveTab('day');
    }
  }, [pendingAction, currentUser, cloudReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // תזמון מחדש של כל ההתראות במכשיר בכל שינוי רלוונטי (עם השהייה קצרה)
  useEffect(() => {
    if (!isNative || !currentUser) return;
    const t = setTimeout(() => {
      syncNativeSchedule(buildSchedulePlan({
        globalData,
        daysHistory,
        mantras: MANTRAS,
        displayName: currentUser.displayName,
        urgeTimerMinutes: URGE_TIMER_MINUTES
      }));
    }, 2000);
    return () => clearTimeout(t);
  }, [globalData, daysHistory, currentUser]);

  const updateCurrentDay = (updater) => {
    setDaysHistory(prev => {
      const existing = prev[selectedDate] || createEmptyDay();
      const updated = typeof updater === 'function' ? updater(existing) : updater;
      return { ...prev, [selectedDate]: updated };
    });
  };

  const adjustPoints = (delta) => {
    setGlobalData(prev => ({
      ...prev,
      points: Math.max(0, prev.points + delta),
      lifetimePoints: delta > 0 ? (prev.lifetimePoints || prev.points) + delta : (prev.lifetimePoints || prev.points)
    }));
    if (delta > 0) {
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 }, disableForReducedMotion: true });
      haptic('success');
      showToast(`+${delta} נק׳ ⭐`, { kind: 'points', duration: 1400 });
    } else if (delta < 0) {
      haptic('light');
    }
  };

  const saveMorningIntention = () => {
    if (morningInput.trim()) {
      updateCurrentDay(day => ({ ...day, morningIntention: morningInput.trim() }));
      adjustPoints(POINTS.MORNING);
    }
    setShowMorningModal(false);
  };

  const saveMiddayCheckin = () => {
    const isFirstMidday = !currentDay.middayCheckin;
    const checkObj = {
      mood: middayMood,
      note: middayNote.trim(),
      time: getNowHHMM()
    };
    updateCurrentDay(day => ({
      ...day,
      middayCheckin: checkObj,
      waterCount: day.waterCount + 1,
      journals: middayNote.trim()
        ? [{ id: Date.now(), context: 'צ׳ק-אין אמצע היום 🌤️', mood: middayMood, thought: middayNote.trim(), time: checkObj.time }, ...day.journals]
        : day.journals
    }));
    if (isFirstMidday) adjustPoints(POINTS.MIDDAY);
    setMiddayNote('');
    setShowMiddayModal(false);
  };

  const saveEveningReview = () => {
    const isFirstTimeScoring = currentDay.dailyScore === null;
    updateCurrentDay(day => ({ ...day, dailyScore: tempScore, dailySummary: tempSummary }));
    if (isFirstTimeScoring) adjustPoints(POINTS.EVENING);
    setShowEveningModal(false);
  };

  const getWeekDaysStrip = () => {
    const base = new Date(selectedDate);
    const dayOfWeek = base.getDay();
    const sunday = new Date(base);
    sunday.setDate(base.getDate() - dayOfWeek);

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const hasEvents = (globalData.events || []).some(ev => ev.date === dStr);
      const hasData = Boolean(hasEvents || daysHistory[dStr]?.dailyScore || daysHistory[dStr]?.tasks?.length || daysHistory[dStr]?.journals?.length);
      return {
        label: HEBREW_DAYS[i],
        dayNum: d.getDate(),
        dateStr: dStr,
        isSelected: dStr === selectedDate,
        hasData
      };
    });
  };

  // --- סדר יום: אימונים מביאים +10 נקודות, משימה רגילה +2 נקודות ---
  const selectedSchedCategoryObj = scheduleCategoriesList.find(c => c.id === newTaskCategory) || scheduleCategoriesList[0];
  const isSelectedCatWorkout = selectedSchedCategoryObj?.behavior === 'workout' || selectedSchedCategoryObj?.id === 'workout';

  const handleSelectScheduleCategory = (cat) => {
    if (cat.behavior === 'meal' || cat.id === 'meal') {
      if (newTaskTime) setMealTime(newTaskTime);
      setActiveTab('journal');
      return;
    }
    setNewTaskCategory(cat.id);
    if (cat.id === 'friends' && !newTaskText) setNewTaskText('פגישה עם חברים');
  };

  const addTask = () => {
    const resolvedWorkoutName = workoutSubtype === 'אחר (הקלדה ידנית)' ? customWorkoutSubtype.trim() : workoutSubtype;
    const finalTitle = newTaskText.trim() || (isSelectedCatWorkout ? resolvedWorkoutName : '');
    if (!finalTitle) return;

    const newTaskObj = {
      id: Date.now(),
      time: newTaskTime || '',
      text: finalTitle,
      subtitle: newTaskSubtitle.trim(),
      category: selectedSchedCategoryObj.id,
      categoryIcon: selectedSchedCategoryObj.icon,
      categoryLabel: selectedSchedCategoryObj.label,
      isWorkout: isSelectedCatWorkout,
      workoutSubtype: isSelectedCatWorkout ? resolvedWorkoutName : null,
      workoutPostMetric: isSelectedCatWorkout && workoutPostMetric.trim() ? workoutPostMetric.trim() : null,
      workoutIntensity: isSelectedCatWorkout ? workoutIntensity : null,
      done: false
    };

    updateCurrentDay(day => ({
      ...day,
      tasks: [...day.tasks, newTaskObj]
    }));

    setNewTaskText('');
    setNewTaskSubtitle('');
    setNewTaskTime('');
    setWorkoutPostMetric('');
  };

  const toggleTask = (id) => {
    const targetTask = (currentDay.tasks || []).find(t => t.id === id);
    const willBeDone = targetTask ? !targetTask.done : false;
    const isWorkoutTask = Boolean(targetTask && (targetTask.isWorkout || targetTask.category === 'workout' || isWorkoutHabitTitle(targetTask.text)));
    const rewardPts = isWorkoutTask ? POINTS.WORKOUT : POINTS.TASK;

    if (!targetTask) return;
    updateCurrentDay(day => ({
      ...day,
      tasks: day.tasks.map(t => (t.id === id ? { ...t, done: willBeDone } : t))
    }));
    adjustPoints(willBeDone ? rewardPts : -rewardPts);

    if (targetTask && isWorkoutTask && willBeDone) {
      setWorkoutMetricModalTask(targetTask);
      setModalWorkoutIntensity(targetTask.workoutIntensity || 4);
      setModalWorkoutNotes(targetTask.workoutPostMetric || '');
    }
  };

  const savePostWorkoutMetricModal = () => {
    if (!workoutMetricModalTask) return;
    const summaryMetric = `${modalWorkoutFeeling} • עצימות ${modalWorkoutIntensity}/5${modalWorkoutNotes.trim() ? ` • ${modalWorkoutNotes.trim()}` : ''}`;
    updateCurrentDay(day => ({
      ...day,
      tasks: day.tasks.map(t =>
        t.id === workoutMetricModalTask.id
          ? { ...t, workoutPostMetric: summaryMetric, workoutIntensity: modalWorkoutIntensity }
          : t
      )
    }));
    adjustPoints(POINTS.WORKOUT_METRIC);
    setWorkoutMetricModalTask(null);
    setModalWorkoutNotes('');
  };

  const startEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
    setEditingTaskSubtitle(task.subtitle || '');
    setEditingTaskTime(task.time || '');
  };

  const saveEditTask = (taskId) => {
    if (!editingTaskText.trim()) return;
    updateCurrentDay(day => ({
      ...day,
      tasks: day.tasks.map(t => 
        t.id === taskId 
          ? { ...t, text: editingTaskText.trim(), subtitle: editingTaskSubtitle.trim(), time: editingTaskTime || '' } 
          : t
      )
    }));
    setEditingTaskId(null);
    setEditingTaskText('');
    setEditingTaskSubtitle('');
    setEditingTaskTime('');
  };

  const deleteTask = (id) => {
    updateCurrentDay(day => ({
      ...day,
      tasks: day.tasks.filter(t => t.id !== id)
    }));
  };

  // --- הרגלים קבועים ---
  const calculateStreak = (completedDates) => {
    const set = new Set(completedDates);
    let count = 0;
    let checkDate = new Date(realTodayStr);
    if (!set.has(realTodayStr)) checkDate.setDate(checkDate.getDate() - 1);
    while (set.has(checkDate.toISOString().split('T')[0])) {
      count++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return count;
  };

  const toggleHabitOnSelectedDate = (habitId) => {
    const habit = (globalData.habits || []).find(h => h.id === habitId);
    if (!habit) return;
    const alreadyDone = (habit.completedDates || []).includes(selectedDate);
    const habitPts = isWorkoutHabitTitle(habit.title) ? POINTS.WORKOUT : POINTS.HABIT;
    setGlobalData(prev => ({
      ...prev,
      habits: prev.habits.map(h => {
        if (h.id !== habitId) return h;
        const dates = h.completedDates || [];
        const updatedDates = alreadyDone ? dates.filter(d => d !== selectedDate) : [...new Set([...dates, selectedDate])];
        return { ...h, completedDates: updatedDates, streak: calculateStreak(updatedDates) };
      })
    }));
    adjustPoints(alreadyDone ? -habitPts : habitPts);
  };

  const addHabit = () => {
    if (!newHabit.trim()) return;
    setGlobalData(prev => ({
      ...prev,
      habits: [
        ...prev.habits, 
        { 
          id: Date.now(), 
          title: newHabit.trim(), 
          subtitle: newHabitSubtitle.trim(), 
          time: newHabitTime || '', 
          streak: 0, 
          completedDates: [] 
        }
      ]
    }));
    setNewHabit('');
    setNewHabitSubtitle('');
    setNewHabitTime('');
  };

  const startEditHabit = (habit) => {
    setEditingHabitId(habit.id);
    setEditingHabitTitle(habit.title);
    setEditingHabitSubtitle(habit.subtitle || '');
    setEditingHabitTime(habit.time || '');
  };

  const saveEditHabit = (habitId) => {
    if (!editingHabitTitle.trim()) return;
    setGlobalData(prev => ({
      ...prev,
      habits: prev.habits.map(h => 
        h.id === habitId 
          ? { ...h, title: editingHabitTitle.trim(), subtitle: editingHabitSubtitle.trim(), time: editingHabitTime || '' } 
          : h
      )
    }));
    setEditingHabitId(null);
    setEditingHabitTitle('');
    setEditingHabitSubtitle('');
    setEditingHabitTime('');
  };

  const deleteHabit = (habitId) => {
    setGlobalData(prev => ({
      ...prev,
      habits: prev.habits.filter(h => h.id !== habitId)
    }));
  };

  // --- הרגלים להפחתה ---
  const addBadHabit = () => {
    if (!newBadHabitTitle.trim()) return;
    setGlobalData(prev => ({
      ...prev,
      badHabits: [
        ...(prev.badHabits || []),
        { id: Date.now(), title: newBadHabitTitle.trim(), penalty: Number(newBadHabitPenalty) || 8, slipDates: [], createdAt: realTodayStr }
      ]
    }));
    setNewBadHabitTitle('');
  };

  const recordBadHabitSlip = (badHabit) => {
    const penalty = badHabit.penalty || 8;
    adjustPoints(-penalty);
    setGlobalData(prev => ({
      ...prev,
      badHabits: (prev.badHabits || []).map(b => 
        b.id === badHabit.id ? { ...b, slipDates: [...(b.slipDates || []), selectedDate] } : b
      )
    }));
    const randomQuote = ENCOURAGING_QUOTES[Math.floor(Math.random() * ENCOURAGING_QUOTES.length)];
    setEncouragementBanner({ habitTitle: badHabit.title, penalty, quote: randomQuote });
  };

  const deleteBadHabit = (id) => {
    setGlobalData(prev => ({
      ...prev,
      badHabits: (prev.badHabits || []).filter(b => b.id !== id)
    }));
  };

  const getCleanDaysStreak = (badHabit) => {
    const slips = badHabit.slipDates || [];
    if (slips.includes(realTodayStr)) return 0;
    let cleanCount = 0;
    let checkDate = new Date(realTodayStr);
    const startLimit = new Date(badHabit.createdAt || realTodayStr);
    while (checkDate >= startLimit) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (slips.includes(dStr)) break;
      cleanCount++;
      checkDate.setDate(checkDate.getDate() - 1);
      if (cleanCount > 365) break;
    }
    return cleanCount;
  };

  // --- איחוד מלא של סדר היום ---
  const selectedDayEvents = (globalData.events || [])
    .filter(ev => ev.date === selectedDate)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  // אירועים בכל רצף הימים שנבחר בלוח השנה
  const rangeEvents = (globalData.events || [])
    .filter(ev => selectedDateRangeArray.includes(ev.date))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '').localeCompare(b.time || '');
    });

  const allDayEventsForSelectedDate = selectedDayEvents.filter(ev => ev.isAllDay || !ev.time);
  const timedEventsForSelectedDate = selectedDayEvents.filter(ev => !ev.isAllDay && ev.time);

  const combinedSchedule = [
    ...(globalData.habits || []).map(h => ({
      id: `habit-${h.id}`,
      rawId: h.id,
      time: h.time || '',
      text: h.title,
      subtitle: h.subtitle || '',
      done: (h.completedDates || []).includes(selectedDate),
      itemType: 'habit',
      streak: calculateStreak(h.completedDates || []),
      isWorkout: isWorkoutHabitTitle(h.title),
      rawObj: h
    })),
    ...timedEventsForSelectedDate.map(ev => ({
      id: `event-${ev.id}`,
      rawId: ev.id,
      time: ev.time || '',
      text: ev.title,
      subtitle: ev.notes || ev.typeLabel || '',
      icon: ev.typeIcon || '📅',
      color: ev.color || '#f4b342',
      itemType: 'event',
      rawObj: ev
    })),
    ...(currentDay.tasks || []).map(t => ({
      ...t,
      time: t.time || '',
      rawId: t.id,
      itemType: 'task',
      rawObj: t
    })),
    ...(currentDay.meals || []).map(m => ({
      id: `meal-${m.id}`,
      rawId: m.id,
      time: m.time || '',
      text: `ארוחת ${m.type}`,
      subtitle: m.text,
      itemType: 'meal',
      rawObj: m
    }))
  ].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return -1;
    if (!b.time) return 1;
    return a.time.localeCompare(b.time);
  });

  // --- תקציב: הוצאות, הכנסות ויעד הוצאות שבועי ---
  const addExpense = () => {
    if (!expTitle.trim() || !expCost) return;

    let finalCategoryName = expCategory;

    if (expCategory === '__other__') {
      const cleanNewCat = customOtherExpCatName.trim() || 'הוצאה מותאמת';
      finalCategoryName = cleanNewCat;

      const exists = expenseCategoriesList.some(c => c.name === cleanNewCat);
      if (!exists) {
        const newCatObj = {
          id: `exp_custom_${Date.now()}`,
          name: cleanNewCat,
          icon: customOtherExpCatIcon || '✨',
          color: customOtherExpCatColor || '#a78bfa'
        };
        setGlobalData(prev => ({
          ...prev,
          expenseCategories: [...(prev.expenseCategories || DEFAULT_EXPENSE_CATEGORIES), newCatObj]
        }));
      }
      setExpCategory(cleanNewCat);
      setCustomOtherExpCatName('');
    }

    const item = {
      id: Date.now(),
      title: expTitle.trim(),
      cost: Number(expCost),
      category: finalCategoryName,
      expenseType: expType,
      date: selectedDate
    };
    setGlobalData(prev => ({ ...prev, expenses: [item, ...prev.expenses] }));
    setExpTitle('');
    setExpCost('');
  };

  const deleteExpense = (id) => {
    setGlobalData(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== id)
    }));
  };

  const addIncome = () => {
    if (!incTitle.trim() || !incAmount) return;

    let finalIncCategory = incCategory;
    if (incCategory === '__custom_inc__') {
      const cleanCustomInc = customIncCategoryName.trim() || 'הכנסה נוספת';
      finalIncCategory = cleanCustomInc;
      const exists = incomeCategoriesList.some(c => c.name === cleanCustomInc);
      if (!exists) {
        const newIncCat = {
          id: `inc_custom_${Date.now()}`,
          name: cleanCustomInc,
          icon: '💰',
          color: '#10b981'
        };
        setGlobalData(prev => ({
          ...prev,
          incomeCategories: [...(prev.incomeCategories || DEFAULT_INCOME_CATEGORIES), newIncCat]
        }));
      }
      setIncCategory(cleanCustomInc);
      setCustomIncCategoryName('');
    }

    const totalRepeats = incIsRecurring ? Math.max(1, Math.min(60, Number(incRepeatCount) || 1)) : 1;
    const baseId = Date.now();
    const generatedIncomes = [];

    for (let i = 0; i < totalRepeats; i++) {
      const targetDate = i === 0 ? selectedDate : addIntervalToDate(selectedDate, i, incRepeatFreq);
      generatedIncomes.push({
        id: baseId + i,
        title: incTitle.trim(),
        amount: Number(incAmount),
        category: finalIncCategory,
        date: targetDate,
        isRecurring: incIsRecurring && totalRepeats > 1,
        repeatIndex: i + 1,
        repeatTotal: totalRepeats
      });
    }

    setGlobalData(prev => ({
      ...prev,
      incomes: [...generatedIncomes, ...(prev.incomes || [])]
    }));

    adjustPoints(POINTS.INCOME);
    setIncTitle('');
    setIncAmount('');
    setIncIsRecurring(false);
  };

  const deleteIncome = (id) => {
    setGlobalData(prev => ({
      ...prev,
      incomes: (prev.incomes || []).filter(inc => inc.id !== id)
    }));
  };

  const startEditExpenseCategory = (cat) => {
    setEditingExpCatId(cat.id);
    setEditExpCatName(cat.name);
    setEditExpCatIcon(cat.icon);
    setEditExpCatColor(cat.color);
  };

  const saveEditExpenseCategory = (oldCat) => {
    if (!editExpCatName.trim()) return;
    const newName = editExpCatName.trim();
    setGlobalData(prev => ({
      ...prev,
      expenseCategories: (prev.expenseCategories || DEFAULT_EXPENSE_CATEGORIES).map(c =>
        c.id === oldCat.id ? { ...c, name: newName, icon: editExpCatIcon || '📦', color: editExpCatColor } : c
      ),
      expenses: (prev.expenses || []).map(e =>
        e.category === oldCat.name ? { ...e, category: newName } : e
      )
    }));
    setEditingExpCatId(null);
  };

  const deleteExpenseCategory = (cat) => {
    if (expenseCategoriesList.length <= 1) return;
    setGlobalData(prev => ({
      ...prev,
      expenseCategories: (prev.expenseCategories || DEFAULT_EXPENSE_CATEGORIES).filter(c => c.id !== cat.id)
    }));
  };

  // --- חישובי הוצאות שבועיים וחודשיים ---
  const weekDaysObjs = getWeekDaysStrip();
  const weekStartStr = weekDaysObjs[0]?.dateStr || selectedDate;
  const weekEndStr = weekDaysObjs[6]?.dateStr || selectedDate;

  const dayExpenses = globalData.expenses.filter(e => e.date === selectedDate);
  const weekExpenses = globalData.expenses.filter(e => e.date >= weekStartStr && e.date <= weekEndStr);
  const monthExpenses = globalData.expenses.filter(e => e.date.startsWith(selectedMonth));

  const spentSelectedWeek = weekExpenses.reduce((acc, c) => acc + c.cost, 0);
  const spentSelectedMonth = monthExpenses.reduce((acc, c) => acc + c.cost, 0);
  const weeklyTarget = Number(globalData.weeklyLimit) || 1000;
  const remainingWeeklyBudget = Math.max(0, weeklyTarget - spentSelectedWeek);

  const monthIncomes = (globalData.incomes || []).filter(inc => inc.date.startsWith(selectedMonth));
  const incomeSelectedMonth = monthIncomes.reduce((acc, c) => acc + c.amount, 0);
  const netCashflowMonth = incomeSelectedMonth - spentSelectedMonth;

  const allMonthExpenseCategoryNames = Array.from(
    new Set([
      ...expenseCategoriesList.map(c => c.name),
      ...monthExpenses.map(e => e.category)
    ])
  );

  const categoryBreakdown = allMonthExpenseCategoryNames.map((catName, idx) => {
    const foundCat = expenseCategoriesList.find(c => c.name === catName);
    const sum = monthExpenses.filter(e => e.category === catName).reduce((acc, c) => acc + c.cost, 0);
    const pct = spentSelectedMonth > 0 ? Math.round((sum / spentSelectedMonth) * 100) : 0;
    return {
      name: catName,
      icon: foundCat?.icon || '✨',
      color: foundCat?.color || ['#f4b342', '#a3be8c', '#f8cce0', '#bfd7f6', '#eae4f9'][idx % 5],
      sum,
      pct
    };
  }).filter(c => c.sum > 0).sort((a, b) => b.sum - a.sum);

  const allMonthIncomeCategoryNames = Array.from(
    new Set([
      ...incomeCategoriesList.map(c => c.name),
      ...monthIncomes.map(inc => inc.category)
    ])
  );

  const incomeCategoryBreakdown = allMonthIncomeCategoryNames.map((catName, idx) => {
    const foundCat = incomeCategoriesList.find(c => c.name === catName);
    const sum = monthIncomes.filter(i => i.category === catName).reduce((acc, c) => acc + c.amount, 0);
    const pct = incomeSelectedMonth > 0 ? Math.round((sum / incomeSelectedMonth) * 100) : 0;
    return {
      name: catName,
      icon: foundCat?.icon || '💰',
      color: foundCat?.color || ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][idx % 4],
      sum,
      pct
    };
  }).filter(c => c.sum > 0).sort((a, b) => b.sum - a.sum);

  // חישוב 4 הצבעים בטבעת האיזון
  const checkableSchedule = combinedSchedule.filter(i => i.itemType === 'habit' || i.itemType === 'task');
  const habitsScore10 = checkableSchedule.length > 0
    ? Math.max(2, (checkableSchedule.filter(i => i.done).length / checkableSchedule.length) * 10)
    : 8.0;

  const waterScore4 = Math.min(4, (currentDay.waterCount / Math.max(1, globalData.waterTarget)) * 4);
  const stepsScore4 = currentDay.stepsGoalMet ? 4 : 2;
  const sleepScore2 = (currentDay.sleepHours ?? 7) >= 7 ? 2 : 1;
  const bodyScore10 = Math.min(10, waterScore4 + stepsScore4 + sleepScore2);

  const mindScore10 = currentDay.dailyScore 
    ? Number(currentDay.dailyScore) 
    : Math.min(10, 5.5 + (currentDay.morningIntention ? 1.5 : 0) + (currentDay.middayCheckin ? 1.5 : 0) + (currentDay.journals.length > 0 ? 1.5 : 0));

  const slipsOnDay = (globalData.badHabits || []).reduce((acc, b) => acc + (b.slipDates || []).filter(d => d === selectedDate).length, 0);
  const weeklyBudgetOk = spentSelectedWeek <= weeklyTarget;
  const controlScore10 = Math.max(2, (weeklyBudgetOk ? 6 : 3) + Math.max(0, 4 - slipsOnDay * 2));

  const computedBalanceScore = ((habitsScore10 + bodyScore10 + mindScore10 + controlScore10) / 4).toFixed(1);

  // עדכון הווידג'ט במסך הבית של אנדרואיד
  const todayDataForWidget = daysHistory[realTodayStr] || createEmptyDay();
  const nextEventForWidget = upcomingEvents[0];
  const widgetPayload = JSON.stringify({
    name: currentUser?.displayName || '',
    points: globalData.points,
    score: computedBalanceScore,
    water: todayDataForWidget.waterCount || 0,
    waterTarget: globalData.waterTarget,
    nextEvent: nextEventForWidget
      ? `${nextEventForWidget.typeIcon || '📅'} ${nextEventForWidget.title} · ${formatUpcomingWhen(nextEventForWidget)}`
      : 'אין אירועים קרובים',
    mantra: MANTRAS[mantraIdx]
  });
  useEffect(() => {
    if (!currentUser) return;
    const t = setTimeout(() => updateNativeWidget(JSON.parse(widgetPayload)), 800);
    return () => clearTimeout(t);
  }, [widgetPayload, currentUser]);

  const PILLARS_INFO = [
    {
      name: 'שגרה והרגלים',
      color: '#f9e076',
      icon: '🔥',
      score: habitsScore10.toFixed(1),
      desc: 'אחוז השלמת ההרגלים הקבועים והמשימות בסדר היום שלך.'
    },
    {
      name: 'גוף וחיוניות',
      color: '#a3be8c',
      icon: '💧',
      score: bodyScore10.toFixed(1),
      desc: 'שילוב של שתיית מים, עמידה ביעד הצעדים היומי ושעות שינה.'
    },
    {
      name: 'נפש ומודעות',
      color: '#f8cce0',
      icon: '💭',
      score: mindScore10.toFixed(1),
      desc: 'כוונת בוקר, צ׳ק-אין אמצע היום, יומן רגשות ודירוג סוף היום.'
    },
    {
      name: 'שליטה ואיזון כלכלי',
      color: '#bfd7f6',
      icon: '🛡️',
      score: controlScore10.toFixed(1),
      desc: 'עמידה ביעד ההוצאות השבועי ושמירה על יום נקי מהרגלים מגונים.'
    }
  ];

  // --- משימות עבודה וכללי ---
  const addWorkTask = () => {
    if (!workTitle.trim()) return;
    setGlobalData(prev => ({
      ...prev,
      workTasks: [
        ...(prev.workTasks || []), 
        { id: Date.now(), title: workTitle.trim(), dueDate: workDeadline || '', done: false }
      ]
    }));
    setWorkTitle('');
    setWorkDeadline('');
  };

  const toggleWorkTask = (id) => {
    const target = (globalData.workTasks || []).find(w => w.id === id);
    if (!target) return;
    const nextDone = !target.done;
    setGlobalData(prev => ({
      ...prev,
      workTasks: (prev.workTasks || []).map(w => (w.id === id ? { ...w, done: nextDone } : w))
    }));
    adjustPoints(nextDone ? POINTS.WORK_TASK : -POINTS.WORK_TASK);
  };

  const deleteWorkTask = (id) => {
    setGlobalData(prev => ({
      ...prev,
      workTasks: (prev.workTasks || []).filter(w => w.id !== id)
    }));
  };

  const getDeadlineInfo = (dueDate, isDone) => {
    if (isDone) return { text: 'הושלם ✓', className: 'deadline-done' };
    if (!dueDate) return { text: 'ללא דדליין 📌', className: 'deadline-upcoming' };
    const todayMs = new Date(realTodayStr).setHours(0, 0, 0, 0);
    const dueMs = new Date(dueDate).setHours(0, 0, 0, 0);
    const diffDays = Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `באיחור (${Math.abs(diffDays)} ימים) ⚠️`, className: 'deadline-overdue' };
    if (diffDays === 0) return { text: 'דדליין להיום! ⏰', className: 'deadline-today' };
    if (diffDays === 1) return { text: 'דדליין למחר', className: 'deadline-today' };
    return { text: `עוד ${diffDays} ימים (${dueDate.slice(5)})`, className: 'deadline-upcoming' };
  };

  const sortedWorkTasks = [...(globalData.workTasks || [])].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  // --- מטרות צד ---
  const toggleStepsGoal = () => {
    const nextState = !currentDay.stepsGoalMet;
    updateCurrentDay(day => ({ ...day, stepsGoalMet: nextState }));
    adjustPoints(nextState ? POINTS.STEPS : -POINTS.STEPS);
  };

  const changeWater = (delta) => {
    const nextWater = Math.max(0, (currentDay.waterCount || 0) + delta);
    let rewarded = Boolean(currentDay.waterGoalRewarded);
    let ptsDelta = 0;
    if (!rewarded && nextWater >= globalData.waterTarget) {
      ptsDelta = POINTS.WATER;
      rewarded = true;
    } else if (rewarded && nextWater < globalData.waterTarget) {
      ptsDelta = -POINTS.WATER;
      rewarded = false;
    }
    updateCurrentDay(day => ({ ...day, waterCount: nextWater, waterGoalRewarded: rewarded }));
    if (ptsDelta) adjustPoints(ptsDelta);
  };

  const addToWishlist = () => {
    if (!wishTitle.trim() || !wishCost) return;
    const item = { id: Date.now(), title: wishTitle, cost: Number(wishCost), createdAt: selectedDate };
    setGlobalData(prev => ({ ...prev, wishlist: [item, ...(prev.wishlist || [])] }));
    setWishTitle('');
    setWishCost('');
  };

  const skipImpulseItem = (item) => {
    setGlobalData(prev => ({
      ...prev,
      savedFromImpulse: (prev.savedFromImpulse || 0) + item.cost,
      wishlist: (prev.wishlist || []).filter(w => w.id !== item.id)
    }));
    adjustPoints(POINTS.SKIP_IMPULSE);
  };

  const buyWishlistItem = (item) => {
    const exp = {
      id: Date.now(),
      title: item.title,
      cost: item.cost,
      category: 'קניות ושופינג',
      expenseType: 'want',
      date: selectedDate
    };
    setGlobalData(prev => ({
      ...prev,
      expenses: [exp, ...prev.expenses],
      wishlist: (prev.wishlist || []).filter(w => w.id !== item.id)
    }));
  };

  const typeTotals = {
    need: monthExpenses.filter(e => (e.expenseType || 'need') === 'need').reduce((a, c) => a + c.cost, 0),
    want: monthExpenses.filter(e => e.expenseType === 'want').reduce((a, c) => a + c.cost, 0),
    impulse: monthExpenses.filter(e => e.expenseType === 'impulse').reduce((a, c) => a + c.cost, 0)
  };
  const impulsePct = spentSelectedMonth > 0 ? Math.round((typeTotals.impulse / spentSelectedMonth) * 100) : 0;

  // --- דפוסים ב-7 הימים האחרונים (למודעות בלבד, בלי שיפוט) ---
  const last7Dates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return getLocalDateStr(d);
  });
  const last7Urges = last7Dates.flatMap(dStr => (daysHistory[dStr]?.urges || []));
  const haltCounts = HALT_OPTIONS.map(h => ({
    ...h,
    count: last7Urges.filter(u => (u.halt || []).includes(h.id)).length
  })).filter(h => h.count > 0).sort((a, b) => b.count - a.count);
  const dayPartCounts = last7Urges.reduce((acc, u) => {
    const part = getDayPartLabel(u.time);
    acc[part] = (acc[part] || 0) + 1;
    return acc;
  }, {});
  const topDayPart = Object.entries(dayPartCounts).sort((a, b) => b[1] - a[1])[0];
  const urgesWithTimer = last7Urges.filter(u => u.usedTimer);
  const surfedCount = urgesWithTimer.filter(u => u.outcome === 'passed' || u.outcome === 'meal').length;
  // --- תובנות שבועיות (7 הימים האחרונים, מהישן לחדש) ---
  const MOOD_VALUES = { '🤩': 5, '🙂': 4, '😐': 3, '😤': 2, '😴': 2 };
  const weekInsights = [...last7Dates].reverse().map(dStr => {
    const day = daysHistory[dStr] || {};
    const moods = [
      ...(day.journals || []).map(j => MOOD_VALUES[j.mood]),
      day.middayCheckin ? MOOD_VALUES[day.middayCheckin.mood] : undefined
    ].filter(Boolean);
    const habitsTotal = (globalData.habits || []).length;
    const habitsDone = (globalData.habits || []).filter(h => (h.completedDates || []).includes(dStr)).length;
    const [, , dd] = dStr.split('-');
    const [y, m, d] = dStr.split('-').map(Number);
    return {
      dateStr: dStr,
      label: HEBREW_DAYS[new Date(y, m - 1, d).getDay()],
      dayNum: Number(dd),
      score: day.dailyScore ?? null,
      mood: moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null,
      water: day.waterCount || 0,
      sleep: day.sleepHours ?? null,
      habitsPct: habitsTotal ? Math.round((habitsDone / habitsTotal) * 100) : null,
      journals: (day.journals || []).length,
      isToday: dStr === realTodayStr
    };
  });
  const avgOf = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const scoredDays = weekInsights.filter(d => d.score !== null);
  const weekAvgScore = avgOf(scoredDays.map(d => Number(d.score)));
  const weekAvgWater = avgOf(weekInsights.map(d => d.water));
  const weekHabitsPct = avgOf(weekInsights.filter(d => d.habitsPct !== null).map(d => d.habitsPct));
  const weekJournalCount = weekInsights.reduce((a, d) => a + d.journals, 0);
  const weekInsightTips = (() => {
    const tips = [];
    const compare = (pred, label) => {
      const yes = scoredDays.filter(pred).map(d => Number(d.score));
      const no = scoredDays.filter(d => !pred(d)).map(d => Number(d.score));
      if (yes.length >= 2 && no.length >= 2) {
        const diff = avgOf(yes) - avgOf(no);
        if (Math.abs(diff) >= 0.8) {
          tips.push(diff > 0
            ? `בימים ש${label}, הציון היומי שלך היה גבוה ב-${diff.toFixed(1)} בממוצע ✨`
            : `מעניין: בימים ש${label} הציון דווקא היה נמוך יותר – אולי משהו אחר משפיע? 🤔`);
        }
      }
    };
    compare(d => d.water >= globalData.waterTarget, 'עמדת ביעד המים');
    compare(d => d.sleep !== null && d.sleep >= 7, 'ישנת 7 שעות ומעלה');
    compare(d => d.habitsPct !== null && d.habitsPct >= 50, 'השלמת לפחות חצי מההרגלים');
    compare(d => d.journals > 0, 'כתבת ביומן');
    if (!tips.length) {
      tips.push(scoredDays.length < 4
        ? 'דרגי עוד כמה ימים בערב – ואז אראה לך מה הכי משפיע על ההרגשה שלך 🌱'
        : 'השבוע די יציב – המשיכי בקצב שלך 🌿');
    }
    return tips.slice(0, 2);
  })();

  const selectedDayUrges = currentDay.urges || [];
  const eatingSupport = globalData.eatingSupport || DEFAULT_EATING_SUPPORT;
  const urgeSecondsLeft = urgeTimerEnd ? Math.max(0, Math.ceil((urgeTimerEnd - urgeTick) / 1000)) : 0;
  const urgeSurfPrompt = URGE_SURF_PROMPTS[Math.floor((URGE_TIMER_MINUTES * 60 - urgeSecondsLeft) / 30) % URGE_SURF_PROMPTS.length];

  // --- תזונה וארוחות ---
  const addMeal = () => {
    if (!mealText.trim()) return;
    const chosenTime = mealTime || getNowHHMM();
    const item = {
      id: Date.now(),
      type: mealType,
      text: mealText.trim(),
      time: chosenTime
    };
    updateCurrentDay(day => ({ ...day, meals: [item, ...day.meals] }));
    adjustPoints(POINTS.MEAL);
    setReflectionModal({ contextTitle: `ארוחת ${mealType} (${chosenTime}): ${mealText.trim()}` });
    setMealText('');
    setMealTime(getNowHHMM());
  };

  const startEditMeal = (meal) => {
    setEditingMealId(meal.id);
    setEditingMealType(meal.type || 'בוקר');
    setEditingMealText(meal.text || '');
    setEditingMealTime(meal.time || getNowHHMM());
  };

  const saveEditMeal = (mealId) => {
    if (!editingMealText.trim()) return;
    updateCurrentDay(day => ({
      ...day,
      meals: day.meals.map(m => 
        m.id === mealId 
          ? { ...m, type: editingMealType, text: editingMealText.trim(), time: editingMealTime || m.time } 
          : m
      )
    }));
    setEditingMealId(null);
    setEditingMealText('');
  };

  const deleteMeal = (mealId) => {
    updateCurrentDay(day => ({
      ...day,
      meals: day.meals.filter(m => m.id !== mealId)
    }));
  };

  const saveReflection = () => {
    if (!deepThought.trim()) return;
    const entry = {
      id: Date.now(),
      context: reflectionModal.contextTitle,
      mood: selectedMood,
      thought: deepThought,
      time: getNowHHMM()
    };
    updateCurrentDay(day => ({ ...day, journals: [entry, ...day.journals] }));
    adjustPoints(POINTS.JOURNAL);
    setDeepThought('');
    setReflectionModal(null);
  };

  // --- חנות פינוקים ---
  const redeemReward = (reward) => {
    if (globalData.points < reward.cost) {
      showToast(`חסרות לך עוד ${reward.cost - globalData.points} נקודות לפינוק הזה – את בדרך! 🌱`, { kind: 'warning' });
      haptic('warning');
      return;
    }
    setGlobalData(prev => ({
      ...prev,
      points: prev.points - reward.cost,
      redeemedHistory: [
        { id: Date.now(), title: reward.title, cost: reward.cost, date: realTodayStr },
        ...(prev.redeemedHistory || [])
      ]
    }));
    confetti({ particleCount: 75, spread: 85, origin: { y: 0.6 }, disableForReducedMotion: true });
    haptic('success');
    showToast(`מימשת: ${reward.title} – מגיע לך! 🎁`, { kind: 'success', duration: 3200 });
  };

  const addCustomReward = () => {
    if (!newRewardTitle.trim() || !newRewardCost) return;
    setGlobalData(prev => ({
      ...prev,
      rewards: [...(prev.rewards || []), { id: Date.now(), title: newRewardTitle.trim(), cost: Number(newRewardCost) }]
        .sort((a, b) => a.cost - b.cost)
    }));
    setNewRewardTitle('');
    setNewRewardCost('');
  };

  const deleteReward = (id) => {
    setGlobalData(prev => ({
      ...prev,
      rewards: (prev.rewards || []).filter(r => r.id !== id)
    }));
  };

  const buildCalendarDays = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      const dayEvents = (globalData.events || []).filter(ev => ev.date === dateStr);
      cells.push({ dayNum: d, dateStr, data: daysHistory[dateStr], events: dayEvents });
    }
    return cells;
  };

  // --- מסך התחברות / הרשמה ---
  if (!currentUser) {
    return (
      <div className="auth-screen">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '4px' }}>🌿</div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 900 }}>איזון יומי ויומן</h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--muted)', marginTop: '4px' }}>
            התחברי לחשבון האישי שלך כדי לסנכרן נתונים בין כל המכשירים
          </p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button 
              type="button"
              className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
            >
              התחברות קיימת
            </button>
            <button 
              type="button"
              className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
            >
              משתמש חדש ✨
            </button>
          </div>

          {authError && <div className="auth-error">{authError}</div>}

          <form onSubmit={handleAuthSubmit}>
            <div className="auth-field">
              <label>שם משתמש (באנגלית או בעברית)</label>
              <input 
                placeholder="למשל: shira"
                value={authUsername}
                onChange={e => setAuthUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            {authMode === 'register' && (
              <div className="auth-field">
                <label>שם פרטי לתצוגה באפליקציה</label>
                <input 
                  placeholder="למשל: שירה"
                  value={authDisplayName}
                  onChange={e => setAuthDisplayName(e.target.value)}
                />
              </div>
            )}

            <div className="auth-field">
              <label>סיסמה אישית</label>
              <input 
                type="password"
                placeholder={authMode === "register" ? "לפחות 6 תווים..." : "הסיסמה שלך..."}
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            <label className="remember-row">
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={e => setRememberMe(e.target.checked)} 
              />
              <span>שמור כניסת משתמש אוטומטית במכשיר זה</span>
            </label>

            <button 
              type="submit" 
              disabled={authLoading}
              style={{ width: '100%', background: '#f4b342', color: '#1c1917', padding: '13px', fontSize: '0.96rem' }}
            >
              {authLoading ? 'מתחבר לענן... ☁️' : authMode === 'login' ? 'כניסה וסנכרון מהענן ←' : 'פתיחת חשבון ושמירה בענן ✨'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- תצוגת ווידג'ט מהיר ---
  if (widgetMode) {
    return (
      <div className="widget-mode-shell">
        <ToastHost toasts={toasts} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>יומן ואיזון 🌿 ({currentUser.displayName})</h3>
            <small style={{ color: 'var(--muted)' }}>{realTodayStr} • ⭐ {globalData.points} נק׳ • ציון {computedBalanceScore}</small>
          </div>
          <button onClick={exitWidgetModeWithUrl} style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
            לאפליקציה המלאה ↗
          </button>
        </div>

        <button className="urge-sos-card" onClick={() => { exitWidgetModeWithUrl(); openUrgeModal(); }}>
          <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>רגע קשה עם אוכל? 🫶</div>
          <span className="urge-sos-pill">SOS</span>
        </button>

        <div className="widget-glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 900, fontSize: '0.95rem' }}>📅 אירועים קרובים ביומן</span>
            <button className="mini-btn" onClick={() => { exitWidgetModeWithUrl(); setActiveTab('calendar'); }}>
              + הוסף / ערוך
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>אין אירועים קרובים ביומן.</p>
          ) : (
            upcomingEvents.slice(0, 5).map(ev => (
              <div key={ev.id} className="upcoming-widget-item" style={{ borderRightColor: ev.color || '#f4b342' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                    {ev.typeIcon || '📅'} {ev.title}
                  </div>
                  <small style={{ color: 'var(--muted)', display: 'block' }}>
                    {ev.typeLabel || 'אירוע'} {ev.notes ? `• ${ev.notes}` : ''}
                  </small>
                </div>
                <span className="when-pill">{formatUpcomingWhen(ev)}</span>
              </div>
            ))
          )}
        </div>

        <div className="widget-glass-card">
          <div style={{ fontWeight: 800, marginBottom: '10px', fontSize: '0.9rem' }}>🔥 סימון מהיר להרגלים היום:</div>
          {globalData.habits.map(h => {
            const isDone = (h.completedDates || []).includes(selectedDate);
            return (
              <div key={h.id} className={`widget-habit-chip ${isDone ? 'done' : ''}`} onClick={() => toggleHabitOnSelectedDate(h.id)}>
                <div>
                  <span>{isDone ? '✓ ' : '○ '} {h.time ? `[${h.time}] ` : ''}{h.title}</span>
                  {h.subtitle && <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>{h.subtitle}</div>}
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>🔥 {calculateStreak(h.completedDates || [])}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <ToastHost toasts={toasts} />
      {/* Toolbar עליון אסתטי */}
      <header className="clean-toolbar">
        <div className="toolbar-top">
          <div>
            <h1 className="greeting-title">היי, {currentUser.displayName}</h1>
            <div className="greeting-sub">
              <span>{levelInfo.title}</span>
              <span>•</span>
              <span>{syncStatus}</span>
              {selectedDate !== realTodayStr && (
                <button 
                  onClick={() => { setSelectedDate(realTodayStr); setRangeStart(realTodayStr); setRangeEnd(realTodayStr); }}
                  style={{ padding: '2px 8px', fontSize: '0.7rem', background: '#f4b342', color: '#1c1917' }}
                >
                  חזרה להיום
                </button>
              )}
            </div>
          </div>

          <div className="toolbar-actions">
            <div className="points-pill-top" onClick={() => setActiveTab('calendar')} title="יומן וחנות פינוקים">
              ⭐ {globalData.points}
            </div>
            <button 
              className="circle-icon-btn" 
              style={{ background: 'var(--amber-soft)', borderColor: '#f4b342' }}
              onClick={() => setShowNotificationCenter(true)} 
              title="תזכורות והתראות"
            >
              <Bell size={17} />
            </button>
            <button className="circle-icon-btn" onClick={() => setShowWidgetGuide(true)} title="ווידג'ט אירועים למסך הבית">
              <Smartphone size={17} />
            </button>
            <button 
              className="circle-icon-btn" 
              onClick={() => setShowUserModal(true)} 
              title="פרופיל משתמש והחלפת חשבון"
            >
              <User size={17} />
            </button>
          </div>
        </div>

        {/* סרגל 7 ימים שבועי */}
        <div className="week-strip">
          {weekDaysObjs.map(d => (
            <div key={d.dateStr} className="week-day-col" onClick={() => handleCalendarDayClick(d.dateStr)}>
              <span className="week-day-name">{d.label}</span>
              <div className={`week-day-circle ${d.isSelected ? 'active' : ''}`}>
                {d.dayNum}
                {d.hasData && !d.isSelected && <span className="week-day-dot" />}
              </div>
            </div>
          ))}
        </div>
      </header>

      <main className="content tab-fade" key={activeTab}>
        {/* טאב 1: מסך הבית + סדר יום */}
        {activeTab === 'day' && (
          <>
            <div className="section-header" style={{ marginTop: 2 }}>
              <span className="section-title">צ׳ק-אין יומי</span>
              <small 
                style={{ color: 'var(--muted)', cursor: 'pointer', fontWeight: 700 }}
                onClick={() => setMantraIdx((mantraIdx + 1) % MANTRAS.length)}
              >
                החלף מנטרה ↻
              </small>
            </div>

            <div className="checkin-hero-card">
              <div className="checkin-hero-title">איך את מרגישה עכשיו?</div>
              <div className="checkin-hero-sub">
                "{MANTRAS[mantraIdx]}"
              </div>

              <svg viewBox="0 0 360 110" preserveAspectRatio="xMidYMax meet" style={{ width: 'calc(100% + 36px)', height: 'auto', display: 'block', margin: '6px -18px 0' }}>
                <circle cx="275" cy="48" r="24" fill="#f97316" />
                <circle cx="268" cy="44" r="2.2" fill="#1c1917" />
                <circle cx="282" cy="44" r="2.2" fill="#1c1917" />
                <path d="M270 52 Q275 56 280 52" stroke="#1c1917" strokeWidth="2" fill="none" strokeLinecap="round" />
                <line x1="275" y1="14" x2="275" y2="8" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                <line x1="305" y1="26" x2="311" y2="21" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                <line x1="245" y1="26" x2="239" y2="21" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                <line x1="312" y1="50" x2="319" y2="50" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                <line x1="238" y1="50" x2="231" y2="50" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                <path d="M-20 110 Q90 65 210 92 T380 75 L380 120 L-20 120 Z" fill="#a3be8c" />
                <path d="M120 110 Q240 68 380 95 L380 120 L120 120 Z" fill="#84a35a" />
                <polygon points="35,98 46,62 57,98" fill="#3f6212" />
                <polygon points="60,102 68,75 76,102" fill="#3f6212" />
                <polygon points="325,95 334,64 343,95" fill="#3f6212" />
              </svg>
            </div>

            <button className="checkin-cta-pill" onClick={() => setShowMiddayModal(true)}>
              <span>{currentDay.middayCheckin ? `בוצע צ׳ק-אין (${currentDay.middayCheckin.mood}) • לחצי לעדכון` : `צ׳ק-אין אמצע היום (+${POINTS.MIDDAY} נק׳)`}</span>
              <ArrowLeft size={18} />
            </button>

            <button className="urge-sos-card" onClick={openUrgeModal}>
              <div>
                <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>רגע קשה עם אוכל? 🫶</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '3px', opacity: 0.85 }}>
                  עצירה קצרה, נשימה, וגלישה על הדחף – בלי שיפוט
                </div>
              </div>
              <span className="urge-sos-pill">SOS</span>
            </button>

            <div className="quick-journal-grid">
              <div
                className="pastel-card pastel-pink"
                onClick={() => setReflectionModal({ contextTitle: 'עצירה והכרת תודה 🌱' })}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: '0.92rem' }}>עצירה והשתקפות 🌱</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '4px' }}>
                    על מה את מודה היום?
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>היום</small>
                  <span className="pastel-tag">אישי</span>
                </div>
              </div>

              <div 
                className="pastel-card pastel-lavender" 
                onClick={() => {
                  setMorningInput(currentDay.morningIntention || '');
                  setShowMorningModal(true);
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: '0.92rem' }}>כוונה יומית 🌞</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '4px' }}>
                    {currentDay.morningIntention ? `"${currentDay.morningIntention}"` : 'איך את רוצה להרגיש היום?'}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>היום</small>
                  <span className="pastel-tag">מיינדפולנס</span>
                </div>
              </div>
            </div>

            {/* כותרות לאירועי "כל היום" מהיומן בראש סדר היום */}
            {allDayEventsForSelectedDate.map(ev => (
              <div 
                key={`allday-${ev.id}`} 
                className="all-day-banner"
                style={{ borderRightColor: ev.color || '#f4b342' }}
              >
                <div>
                  <div>
                    <span className="all-day-badge">כל היום</span>
                    <strong style={{ fontSize: '0.96rem' }}>{ev.typeIcon || '📅'} {ev.title}</strong>
                  </div>
                  {(ev.notes || ev.typeLabel) && (
                    <div className="item-subtitle">
                      {ev.notes || ev.typeLabel}
                    </div>
                  )}
                </div>
                <div className="action-icons">
                  <button className="mini-btn" onClick={() => startEditEvent(ev)} title="עריכת אירוע"><Edit2 size={13} /></button>
                  <button className="mini-btn danger" onClick={() => deleteCalendarEvent(ev.id)} title="מחיקה"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}

            {/* סדר יום מלא + מטרות צד */}
            <div className="daily-split">
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card-title"><CheckSquare size={18} /> סדר יום, אירועים והרגלים</div>

                {combinedSchedule.length === 0 && (
                  <p style={{ fontSize: '0.84rem', color: 'var(--muted)', marginBottom: '10px' }}>
                    אין פעילויות רשומות ליום זה. בחרי קטגוריה למטה להוספה:
                  </p>
                )}

                {combinedSchedule.map(item => {
                  const isEditingThisHabit = item.itemType === 'habit' && editingHabitId === item.rawId;
                  const isEditingThisTask = item.itemType === 'task' && editingTaskId === item.rawId;
                  const itemIsWorkout = Boolean(item.isWorkout || item.category === 'workout' || isWorkoutHabitTitle(item.text));

                  if (item.itemType === 'event') {
                    return (
                      <div key={item.id} className="event-item-card" style={{ borderRightColor: item.color }}>
                        <div style={{ flex: 1 }}>
                          <div>
                            <span className="event-time-badge">{item.time}</span>
                            <strong style={{ fontSize: '0.88rem' }}>{item.icon} {item.text}</strong>
                          </div>
                          {item.subtitle && <div className="item-subtitle">{item.subtitle}</div>}
                        </div>
                        <div className="action-icons">
                          <button className="mini-btn" onClick={() => startEditEvent(item.rawObj)} title="עריכה ביומן"><Edit2 size={13} /></button>
                          <button className="mini-btn danger" onClick={() => deleteCalendarEvent(item.rawId)} title="מחיקה"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    );
                  }

                  if (item.itemType === 'meal') {
                    return (
                      <div 
                        key={item.id} 
                        className="task-item" 
                        style={{ background: 'var(--surface)', borderRadius: '14px', padding: '8px 10px', marginBottom: '6px', cursor: 'pointer', border: '1px solid var(--border)' }}
                        onClick={() => setActiveTab('journal')}
                        title="לחצי למעבר לדף האוכל"
                      >
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                            🍽️ {item.time && <strong style={{ marginLeft: '4px' }}>{item.time}</strong>}
                            {item.text}
                          </div>
                          {item.subtitle && <div className="item-subtitle">{item.subtitle}</div>}
                        </div>
                        <span className="mini-btn">לאוכל ←</span>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={item.id} 
                      className={`task-item ${item.done ? 'done' : ''} ${item.itemType === 'habit' ? 'habit-row' : ''}`}
                    >
                      {isEditingThisHabit ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                          <input value={editingHabitTitle} onChange={e => setEditingHabitTitle(e.target.value)} placeholder="כותרת ההרגל..." />
                          <input value={editingHabitSubtitle} onChange={e => setEditingHabitSubtitle(e.target.value)} placeholder="משפט פירוט מתחת לכותרת..." />
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input type="time" value={editingHabitTime} onChange={e => setEditingHabitTime(e.target.value)} />
                            <button className="mini-btn" onClick={() => setEditingHabitTime('')}>ללא שעה</button>
                            <button className="mini-btn" onClick={() => saveEditHabit(item.rawId)}><Check size={14} /></button>
                            <button className="mini-btn" onClick={() => setEditingHabitId(null)}><X size={14} /></button>
                          </div>
                        </div>
                      ) : isEditingThisTask ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                          <input value={editingTaskText} onChange={e => setEditingTaskText(e.target.value)} placeholder="כותרת הפעילות..." />
                          <input value={editingTaskSubtitle} onChange={e => setEditingTaskSubtitle(e.target.value)} placeholder="משפט פירוט מתחת לכותרת..." />
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input type="time" value={editingTaskTime} onChange={e => setEditingTaskTime(e.target.value)} />
                            <button className="mini-btn" onClick={() => setEditingTaskTime('')}>ללא שעה</button>
                            <button className="mini-btn" onClick={() => saveEditTask(item.rawId)}><Check size={14} /></button>
                            <button className="mini-btn" onClick={() => setEditingTaskId(null)}><X size={14} /></button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', cursor: 'pointer', flex: 1, minWidth: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={item.done} 
                              onChange={() => item.itemType === 'habit' ? toggleHabitOnSelectedDate(item.rawId) : toggleTask(item.rawId)} 
                              style={{ width: 'auto', marginTop: '4px' }} 
                            />
                            <div style={{ fontSize: '0.86rem', minWidth: 0 }}>
                              <div>
                                {item.categoryIcon && <span style={{ marginLeft: '4px' }}>{item.categoryIcon}</span>}
                                {item.time && <strong style={{ marginLeft: '4px' }}>{item.time}</strong>}
                                <span style={{ fontWeight: 800 }}>{item.text}</span>
                                {itemIsWorkout && (
                                  <span className="workout-metric-pill" style={{ marginRight: '6px' }}>
                                    💪 +{POINTS.WORKOUT} נק׳
                                  </span>
                                )}
                              </div>

                              {item.subtitle && <div className="item-subtitle">{item.subtitle}</div>}

                              {item.workoutSubtype && (
                                <div className="item-subtitle" style={{ color: 'var(--green-text)', fontWeight: 700 }}>
                                  סוג אימון: {item.workoutSubtype}
                                </div>
                              )}
                              {item.workoutPostMetric && (
                                <div className="workout-metric-pill">
                                  📊 מדד אחרי: {item.workoutPostMetric}
                                </div>
                              )}

                              {item.itemType === 'habit' && (
                                <div>
                                  <span className="habit-tag">🔥 {item.streak} ימים</span>
                                </div>
                              )}
                            </div>
                          </label>

                          <div className="action-icons">
                            {itemIsWorkout && item.itemType === 'task' && (
                              <button 
                                className="mini-btn" 
                                style={{ background: 'var(--green-soft)', color: 'var(--green-text)' }}
                                onClick={() => {
                                  setWorkoutMetricModalTask(item.rawObj);
                                  setModalWorkoutIntensity(item.workoutIntensity || 4);
                                  setModalWorkoutNotes(item.workoutPostMetric || '');
                                }}
                                title={`עדכון מדד אחרי אימון (+${POINTS.WORKOUT_METRIC} נק׳)`}
                              >
                                📊
                              </button>
                            )}
                            {item.itemType === 'habit' ? (
                              <>
                                <button className="mini-btn" onClick={() => startEditHabit(item.rawObj)}><Edit2 size={13} /></button>
                                <button className="mini-btn danger" onClick={() => deleteHabit(item.rawId)}><Trash2 size={13} /></button>
                              </>
                            ) : (
                              <>
                                <button className="mini-btn" onClick={() => startEditTask(item.rawObj)}><Edit2 size={13} /></button>
                                <button className="mini-btn danger" onClick={() => deleteTask(item.rawId)}><Trash2 size={13} /></button>
                              </>
                            )}
                            <button className="mini-btn" onClick={() => setReflectionModal({ contextTitle: `${item.itemType === 'habit' ? 'הרגל' : 'פעילות'}: ${item.text}` })}>
                              💭
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {/* טופס הוספה לסדר היום */}
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <small style={{ fontWeight: 900, color: 'var(--dark)' }}>
                      ➕ בחרי קטגוריה לסדר היום:
                    </small>
                    <button 
                      type="button"
                      className="mini-btn" 
                      onClick={() => setShowScheduleCatManager(!showScheduleCatManager)}
                    >
                      ⚙️ עריכת / הוספת קטגוריות
                    </button>
                  </div>

                  {showScheduleCatManager && (
                    <div className="custom-reminder-box" style={{ marginBottom: '10px', background: 'var(--card)' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: '6px' }}>
                        ✏️ עריכת קטגוריות סדר יום או הוספת חדשה:
                      </div>
                      {scheduleCategoriesList.map(sc => (
                        <div key={sc.id} className="task-item" style={{ padding: '5px 0' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                            {sc.icon} {sc.label}
                            {sc.behavior === 'workout' ? ` (+${POINTS.WORKOUT} נק׳)` : sc.behavior === 'meal' ? ' (מעביר לאוכל)' : ''}
                          </span>
                          <div className="action-icons">
                            <button className="mini-btn" onClick={() => startEditScheduleCategory(sc)}><Edit2 size={12} /></button>
                            <button className="mini-btn danger" onClick={() => deleteScheduleCategory(sc.id)}><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input 
                            placeholder="אייקון" 
                            value={schedCatIconInput} 
                            onChange={e => setSchedCatIconInput(e.target.value)} 
                            style={{ width: '54px', textAlign: 'center' }} 
                          />
                          <input 
                            placeholder="שם הקטגוריה (למשל: לימודים / קניות)..." 
                            value={schedCatLabelInput} 
                            onChange={e => setSchedCatLabelInput(e.target.value)} 
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <select value={schedCatBehaviorInput} onChange={e => setSchedCatBehaviorInput(e.target.value)}>
                            <option value="regular">פעילות רגילה (+{POINTS.TASK} נק׳)</option>
                            <option value="workout">אימון (+{POINTS.WORKOUT} נק׳ ותת-קטגוריה)</option>
                            <option value="meal">ארוחה (מעביר אוטומטית לדף האוכל)</option>
                          </select>
                          <button type="button" onClick={saveScheduleCategory} style={{ padding: '8px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            {editingSchedCatId ? 'עדכן' : '+ הוסף'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="schedule-cat-grid">
                    {scheduleCategoriesList.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        className={`schedule-cat-btn ${newTaskCategory === cat.id ? 'active' : ''}`}
                        onClick={() => handleSelectScheduleCategory(cat)}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>

                  {isSelectedCatWorkout && (
                    <div className="custom-reminder-box" style={{ marginBottom: '8px', background: 'var(--green-soft)', borderColor: '#86efac' }}>
                      <small style={{ fontWeight: 800, color: 'var(--green-text)', display: 'block', marginBottom: '4px' }}>
                        💪 תת-קטגוריה (איזה אימון? מעניק +{POINTS.WORKOUT} נק׳!):
                      </small>
                      <select value={workoutSubtype} onChange={e => setWorkoutSubtype(e.target.value)} style={{ background: 'var(--card)', marginBottom: '6px' }}>
                        {WORKOUT_SUBTYPES.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                      </select>
                      {workoutSubtype === 'אחר (הקלדה ידנית)' && (
                        <input 
                          placeholder="הקלידי את סוג האימון..." 
                          value={customWorkoutSubtype} 
                          onChange={e => setCustomWorkoutSubtype(e.target.value)}
                          style={{ background: 'var(--card)', marginBottom: '6px' }}
                        />
                      )}
                      <small style={{ fontWeight: 700, color: 'var(--green-text)', display: 'block', marginBottom: '4px' }}>
                        📊 מדד אחרי האימון (+{POINTS.WORKOUT_METRIC} נק׳ בונוס במילוי):
                      </small>
                      <input 
                        placeholder="איך הרגשת אחרי? מרחק / משקלים / אנרגיה..." 
                        value={workoutPostMetric} 
                        onChange={e => setWorkoutPostMetric(e.target.value)}
                        style={{ background: 'var(--card)' }}
                      />
                    </div>
                  )}

                  <div className="input-row" style={{ flexDirection: 'column', marginTop: '6px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <small style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>שעה (אופציונלי):</small>
                      <input type="time" value={newTaskTime} onChange={e => setNewTaskTime(e.target.value)} />
                    </div>
                    <input 
                      placeholder={isSelectedCatWorkout ? `כותרת אימון (+${POINTS.WORKOUT} נק׳)...` : `כותרת הפעילות (+${POINTS.TASK} נק׳)...`} 
                      value={newTaskText} 
                      onChange={e => setNewTaskText(e.target.value)} 
                    />
                    <input 
                      placeholder="משפט פירוט מתחת לכותרת (אופציונלי)..." 
                      value={newTaskSubtitle} 
                      onChange={e => setNewTaskSubtitle(e.target.value)} 
                    />
                    <button onClick={addTask}>
                      <Plus size={16} /> הוספה לסדר היום ({isSelectedCatWorkout ? `+${POINTS.WORKOUT} נק׳ 💪` : `+${POINTS.TASK} נק׳`})
                    </button>
                  </div>
                </div>
              </div>

              {/* עמודת צד: צעדים + מים + שינה */}
              <div>
                <div className="side-goal" style={{ background: currentDay.stepsGoalMet ? 'var(--amber-soft)' : '#ffffff' }}>
                  <Footprints size={22} color="#1c1917" />
                  <div style={{ fontWeight: 900, fontSize: '0.84rem', marginTop: '4px' }}>
                    {globalData.stepsTarget.toLocaleString()} צעדים
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', margin: '4px 0 8px' }}>
                    {currentDay.stepsGoalMet ? `עמדת ביעד! (+${POINTS.STEPS})` : `סמני עמידה (+${POINTS.STEPS} נק׳)`}
                  </div>
                  <button 
                    onClick={toggleStepsGoal}
                    style={{ 
                      width: '100%', fontSize: '0.76rem', padding: '8px 6px',
                      background: currentDay.stepsGoalMet ? 'var(--ink)' : '#f4b342',
                      color: currentDay.stepsGoalMet ? '#ffffff' : '#1c1917'
                    }}
                  >
                    {currentDay.stepsGoalMet ? '✓ בוצע היום' : 'סמני יעד'}
                  </button>
                </div>

                <div className="side-goal">
                  <Droplets size={22} color="#3b82f6" />
                  <div style={{ fontWeight: 900, fontSize: '0.84rem', marginTop: '4px' }}>שתיית מים (+{POINTS.WATER} נק׳)</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 900, margin: '2px 0' }}>
                    {currentDay.waterCount} / {globalData.waterTarget}
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(100, (currentDay.waterCount / globalData.waterTarget) * 100)}%`, background: '#bfd7f6' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                    <button className="icon-btn" style={{ flex: 1, fontSize: '0.78rem' }} onClick={() => changeWater(1)}>+ כוס</button>
                    <button className="icon-btn" style={{ padding: '6px 8px' }} onClick={() => changeWater(-1)}><Minus size={13} /></button>
                  </div>
                </div>

                <div className="side-goal">
                  <BatteryCharging size={20} color="#a3be8c" />
                  <div style={{ fontWeight: 900, fontSize: '0.8rem', marginTop: '2px' }}>שעות שינה</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, margin: '4px 0' }}>
                    {currentDay.sleepHours ?? 7} שעות
                  </div>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    <button className="mini-btn" onClick={() => updateCurrentDay(d => ({ ...d, sleepHours: Math.max(0, (d.sleepHours ?? 7) - 0.5) }))}>-</button>
                    <button className="mini-btn" onClick={() => updateCurrentDay(d => ({ ...d, sleepHours: Math.min(14, (d.sleepHours ?? 7) + 0.5) }))}>+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* משימות עבודה וכללי */}
            <div className="card" style={{ marginTop: '16px' }}>
              <div className="card-title">
                <Briefcase size={18} /> משימות עבודה וכללי – עם או בלי דדליין (+{POINTS.WORK_TASK} נק׳)
              </div>
              {sortedWorkTasks.map(w => {
                const badge = getDeadlineInfo(w.dueDate, w.done);
                return (
                  <div key={w.id} className={`task-item ${w.done ? 'done' : ''}`}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
                      <input type="checkbox" checked={w.done} onChange={() => toggleWorkTask(w.id)} style={{ width: 'auto' }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{w.title}</div>
                        <span className={`deadline-badge ${badge.className}`}>{badge.text}</span>
                      </div>
                    </label>
                    <div className="action-icons">
                      <button className="mini-btn" onClick={() => setReflectionModal({ contextTitle: `משימה: ${w.title}` })}>💭</button>
                      <button className="mini-btn danger" onClick={() => deleteWorkTask(w.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                );
              })}

              <div className="input-row" style={{ flexDirection: 'column', marginTop: '12px' }}>
                <input placeholder="משימה חדשה (עבודה / סידורים / פרויקט)..." value={workTitle} onChange={e => setWorkTitle(e.target.value)} />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Clock size={16} color="#78716c" />
                  <small style={{ whiteSpace: 'nowrap', color: 'var(--muted)' }}>דדליין (אופציונלי):</small>
                  <input type="date" value={workDeadline} onChange={e => setWorkDeadline(e.target.value)} />
                  {workDeadline && <button className="mini-btn" onClick={() => setWorkDeadline('')}>ללא דדליין</button>}
                </div>
                <button onClick={addWorkTask}><Plus size={16} /> הוספת משימה</button>
              </div>
            </div>
          </>
        )}

        {/* טאב 2: טבעת ציון האיזון + פירוט מערכות + הרגלים */}
        {activeTab === 'habits' && (
          <>
            <div className="score-ring-card">
              <div 
                onClick={() => setShowScoreInfoModal(true)}
                style={{ position: 'relative', width: '210px', height: '210px', margin: '0 auto', cursor: 'pointer' }}
              >
                <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  {PILLARS_INFO.map((p, i) => {
                    const SEG = 95;
                    const CIRC = 2 * Math.PI * 76;
                    const filled = Math.max(4, (Math.min(10, Number(p.score)) / 10) * SEG);
                    return (
                      <g key={p.name}>
                        <circle cx="100" cy="100" r="76" fill="none" stroke={p.color} strokeOpacity="0.25" strokeWidth="18"
                          strokeDasharray={`${SEG} ${CIRC}`} strokeDashoffset={-i * 120} strokeLinecap="round" />
                        <circle className="ring-seg" cx="100" cy="100" r="76" fill="none" stroke={p.color} strokeWidth="18"
                          strokeDasharray={`${filled} ${CIRC}`} strokeDashoffset={-i * 120} strokeLinecap="round" />
                      </g>
                    );
                  })}
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '2.7rem', fontWeight: 900, letterSpacing: '-1px', color: 'var(--dark)' }}>
                    {computedBalanceScore}
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowScoreInfoModal(true); }}
                    style={{ 
                      background: 'var(--chip)', color: 'var(--dark)', padding: '4px 10px', 
                      fontSize: '0.75rem', borderRadius: '99px', marginTop: '4px', gap: '4px' 
                    }}
                  >
                    <span>ציון האיזון שלך</span>
                    <Info size={14} />
                  </button>
                </div>
              </div>

              <div className="ring-actions-row">
                <button 
                  className="dark-pill-btn"
                  onClick={() => {
                    setTempScore(currentDay.dailyScore || 8);
                    setTempSummary(currentDay.dailySummary || '');
                    setShowEveningModal(true);
                  }}
                >
                  דירוג וסיכום יום ⭐
                </button>
                <button className="circle-icon-btn" onClick={() => setShowScoreInfoModal(true)}>
                  <Info size={17} />
                </button>
                <button className="circle-icon-btn" onClick={() => setShowMiddayModal(true)}>🌤️</button>
                <button className="circle-icon-btn" onClick={() => setReflectionModal({ contextTitle: 'כתיבה חופשית על מדד האיזון' })}>💭</button>
              </div>
            </div>

            {/* תובנות שבועיות */}
            <div className="card insights-card">
              <div className="card-title" style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingUp size={18} /> השבוע שלך במבט אחד</span>
                <small style={{ color: 'var(--muted)', fontWeight: 700 }}>7 ימים אחרונים</small>
              </div>

              <div className="insight-kpis">
                <div className="insight-kpi">
                  <span className="insight-kpi-value">{weekAvgScore !== null ? weekAvgScore.toFixed(1) : '–'}</span>
                  <span className="insight-kpi-label">ציון יומי ממוצע</span>
                </div>
                <div className="insight-kpi">
                  <span className="insight-kpi-value">{weekHabitsPct !== null ? `${Math.round(weekHabitsPct)}%` : '–'}</span>
                  <span className="insight-kpi-label">השלמת הרגלים</span>
                </div>
                <div className="insight-kpi">
                  <span className="insight-kpi-value">{weekAvgWater !== null ? weekAvgWater.toFixed(1) : '–'}</span>
                  <span className="insight-kpi-label">כוסות מים ביום</span>
                </div>
                <div className="insight-kpi">
                  <span className="insight-kpi-value">{weekJournalCount}</span>
                  <span className="insight-kpi-label">כתיבות ביומן</span>
                </div>
              </div>

              <div className="insight-chart" role="img" aria-label="ציון יומי ב-7 הימים האחרונים">
                {weekInsights.map(d => (
                  <button
                    key={d.dateStr}
                    type="button"
                    className={`insight-bar-col ${d.dateStr === selectedDate ? 'selected' : ''}`}
                    onClick={() => handleCalendarDayClick(d.dateStr)}
                    title={d.score !== null ? `ציון ${d.score}/10` : 'לא דורג'}
                  >
                    <span className="insight-bar-value">{d.score ?? ''}</span>
                    <span className="insight-bar-track">
                      <span
                        className={`insight-bar-fill ${d.score === null ? 'empty' : d.score >= 8 ? 'high' : d.score >= 5 ? 'mid' : 'low'}`}
                        style={{ height: d.score !== null ? `${Math.max(8, d.score * 10)}%` : '8%' }}
                      />
                    </span>
                    <span className="insight-mood">{d.mood === null ? '·' : d.mood >= 4.5 ? '🤩' : d.mood >= 3.5 ? '🙂' : d.mood >= 2.5 ? '😐' : '😤'}</span>
                    <span className={`insight-bar-label ${d.isToday ? 'today' : ''}`}>{d.isToday ? 'היום' : d.label}</span>
                  </button>
                ))}
              </div>

              {weekInsightTips.map(tip => (
                <div key={tip} className="insight-tip">{tip}</div>
              ))}
            </div>

            <div className="card">
              <div className="card-title" style={{ justifyContent: 'space-between' }}>
                <span>מערכות האיזון שלך (פירוט הצבעים)</span>
                <button className="mini-btn" onClick={() => setShowScoreInfoModal(true)}>הסבר מלא ⓘ</button>
              </div>
              {PILLARS_INFO.map(p => (
                <div key={p.name} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.86rem', marginBottom: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                      <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: p.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                        {p.icon}
                      </span>
                      {p.name}
                    </span>
                    <span><strong style={{ fontSize: '1rem' }}>{p.score}</strong> <small style={{ color: 'var(--muted)' }}>מתוך 10</small></span>
                  </div>
                  <div className="progress-bar" style={{ height: '10px' }}>
                    <div className="progress-fill" style={{ width: `${Number(p.score) * 10}%`, background: p.color }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-title"><Flame size={18} color="#f4b342" /> הרגלים מקדמים קבועים (אימון = +{POINTS.WORKOUT} נק׳, רגיל = +{POINTS.HABIT} נק׳)</div>
              {globalData.habits.map(h => {
                const isDone = (h.completedDates || []).includes(selectedDate);
                const isEditing = editingHabitId === h.id;
                const isWorkoutH = isWorkoutHabitTitle(h.title);

                return (
                  <div key={h.id} className="task-item">
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                        <input value={editingHabitTitle} onChange={e => setEditingHabitTitle(e.target.value)} placeholder="כותרת ההרגל..." />
                        <input value={editingHabitSubtitle} onChange={e => setEditingHabitSubtitle(e.target.value)} placeholder="משפט פירוט מתחת לכותרת..." />
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input type="time" value={editingHabitTime} onChange={e => setEditingHabitTime(e.target.value)} />
                          <button className="mini-btn" onClick={() => setEditingHabitTime('')}>ללא שעה</button>
                          <button onClick={() => saveEditHabit(h.id)}><Check size={16} /></button>
                          <button className="icon-btn" onClick={() => setEditingHabitId(null)}><X size={16} /></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div style={{ fontWeight: 800 }}>
                            {h.time ? <span style={{ color: 'var(--amber-text)', marginLeft: '6px' }}>{h.time}</span> : null}
                            {h.title}
                            <span className="workout-metric-pill" style={{ marginRight: '6px', background: isWorkoutH ? '#d1fae5' : '#fef5df', color: isWorkoutH ? '#065f46' : '#92400e' }}>
                              +{isWorkoutH ? POINTS.WORKOUT : POINTS.HABIT} נק׳
                            </span>
                          </div>
                          {h.subtitle && <div className="item-subtitle">{h.subtitle}</div>}
                        </div>
                        <div className="action-icons">
                          <span className="streak-badge">🔥 {calculateStreak(h.completedDates || [])}</span>
                          <button 
                            style={{ background: isDone ? '#a3be8c' : 'var(--ink)', color: isDone ? '#1c1917' : 'white', padding: '6px 12px', fontSize: '0.8rem' }} 
                            onClick={() => toggleHabitOnSelectedDate(h.id)}
                          >
                            {isDone ? '✓ בוצע' : 'סמני'}
                          </button>
                          <button className="mini-btn" onClick={() => startEditHabit(h)}><Edit2 size={14} /></button>
                          <button className="mini-btn danger" onClick={() => deleteHabit(h.id)}><Trash2 size={14} /></button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              <div className="input-row" style={{ flexDirection: 'column', marginTop: '14px' }}>
                <input placeholder="שם ההרגל המקדם החדש..." value={newHabit} onChange={e => setNewHabit(e.target.value)} />
                <input placeholder="משפט פירוט מתחת לכותרת ההרגל (אופציונלי)..." value={newHabitSubtitle} onChange={e => setNewHabitSubtitle(e.target.value)} />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <small style={{ whiteSpace: 'nowrap', color: 'var(--muted)' }}>שעה (אופציונלי):</small>
                  <input type="time" value={newHabitTime} onChange={e => setNewHabitTime(e.target.value)} />
                </div>
                <button onClick={addHabit}>הוסף הרגל מקדם</button>
              </div>
            </div>

            <div className="card">
              <div className="card-title"><HeartHandshake size={18} color="#e11d48" /> הרגלים להפחתה ושחרור (עם משפטי עידוד)</div>
              {encouragementBanner && (
                <div className="encourage-banner">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong>💗 עידוד וחמלה ({encouragementBanner.habitTitle} • -{encouragementBanner.penalty} נק׳)</strong>
                    <button className="mini-btn" onClick={() => setEncouragementBanner(null)}><X size={14} /></button>
                  </div>
                  <p style={{ marginBottom: '10px' }}>"{encouragementBanner.quote}"</p>
                  <button 
                    style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                    onClick={() => {
                      setReflectionModal({ contextTitle: `התבוננות בחמלה על טריגר: ${encouragementBanner.habitTitle}` });
                      setEncouragementBanner(null);
                    }}
                  >
                    💭 כתבי ביומן מה היה הטריגר (+{POINTS.JOURNAL} נק׳ חזרה!)
                  </button>
                </div>
              )}

              {(globalData.badHabits || []).map(bh => {
                const slipsToday = (bh.slipDates || []).filter(d => d === selectedDate).length;
                const cleanStreak = getCleanDaysStreak(bh);

                return (
                  <div key={bh.id} className="bad-habit-row">
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--rose-text)' }}>{bh.title}</div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span className="clean-streak-badge">🛡️ {cleanStreak} ימים נקיים</span>
                        <small style={{ color: '#e11d48', fontWeight: 700 }}>-{bh.penalty} נק׳</small>
                        {slipsToday > 0 && <small style={{ color: 'var(--rose-text)' }}>(דווח {slipsToday} היום)</small>}
                      </div>
                    </div>
                    <div className="action-icons">
                      <button 
                        onClick={() => recordBadHabitSlip(bh)}
                        style={{ background: '#e11d48', fontSize: '0.75rem', padding: '7px 10px' }}
                      >
                        מעדתי (-{bh.penalty})
                      </button>
                      <button className="mini-btn danger" onClick={() => deleteBadHabit(bh.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                );
              })}

              <div className="input-row" style={{ flexDirection: 'column', marginTop: '12px' }}>
                <input placeholder="הרגל שתרצי להפחית..." value={newBadHabitTitle} onChange={e => setNewBadHabitTitle(e.target.value)} />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <small style={{ whiteSpace: 'nowrap', color: 'var(--muted)' }}>קנס נקודות:</small>
                  <input type="number" value={newBadHabitPenalty} onChange={e => setNewBadHabitPenalty(e.target.value)} style={{ width: '80px' }} />
                  <button style={{ flex: 1 }} onClick={addBadHabit}>+ הוסף הרגל להפחתה</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* טאב 3: יומן אירועים + בחירת כמה ימים רצוף בלוח השנה! */}
        {activeTab === 'calendar' && (
          <>
            <div className="card">
              <div className="card-title" style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarIcon size={18} /> יומן חודשי ({selectedMonth})
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    type="button"
                    className="mini-btn"
                    style={{ 
                      background: isRangeMode ? '#f4b342' : 'var(--chip)', 
                      color: isRangeMode ? '#1c1917' : 'var(--dark)', 
                      fontWeight: 900 
                    }}
                    onClick={() => {
                      const nextMode = !isRangeMode;
                      setIsRangeMode(nextMode);
                      setRangeStart(selectedDate);
                      setRangeEnd(selectedDate);
                    }}
                  >
                    {isRangeMode ? '↔️ בחירת רצף ימים: פעיל' : '↔️ בחירת רצף ימים'}
                  </button>
                  <button className="mini-btn" onClick={exportAllEventsToICS} title="סנכרן לווידג׳ט הטלפון">
                    📲
                  </button>
                </div>
              </div>

              {isRangeMode && (
                <div className="range-banner">
                  <span>
                    {rangeStart === rangeEnd 
                      ? `נבחר יום התחלה: ${rangeStart} (לחצי על יום סיום בלוח)` 
                      : `רצף נבחר: ${rangeStart} עד ${rangeEnd} (${selectedDateRangeArray.length} ימים רצוף)`}
                  </span>
                  {rangeStart !== rangeEnd && (
                    <button 
                      type="button" 
                      className="mini-btn" 
                      onClick={() => { setRangeStart(selectedDate); setRangeEnd(selectedDate); }}
                    >
                      איפוס
                    </button>
                  )}
                </div>
              )}

              <div className="calendar-grid">
                {HEBREW_DAYS.map(d => <div key={d} className="calendar-header-cell">{d}</div>)}
                {buildCalendarDays().map((cell, idx) => {
                  if (!cell) return <div key={`empty-${idx}`} />;
                  const score = cell.data?.dailyScore;
                  const dayEvents = cell.events || [];
                  const scoreClass = score >= 8 ? 'score-high' : score >= 5 ? 'score-mid' : 'score-low';

                  const isInRange = isRangeMode && selectedDateRangeArray.includes(cell.dateStr);
                  const isRangeEdge = isRangeMode && (cell.dateStr === rangeStart || cell.dateStr === rangeEnd);
                  const isSingleSelected = !isRangeMode && cell.dateStr === selectedDate;

                  return (
                    <div 
                      key={cell.dateStr}
                      onClick={() => handleCalendarDayClick(cell.dateStr)}
                      className={`calendar-day ${isSingleSelected ? 'selected' : ''} ${isInRange ? 'in-range' : ''} ${isRangeEdge ? 'range-edge' : ''}`}
                    >
                      <span>{cell.dayNum}</span>
                      {dayEvents.length > 0 && (
                        <div className="event-dots-row">
                          {dayEvents.slice(0, 3).map(ev => (
                            <span key={ev.id} className="event-dot" style={{ background: ev.color || '#f4b342' }} />
                          ))}
                        </div>
                      )}
                      {score ? (
                        <span className={`score-pill ${scoreClass}`}>{score}/10</span>
                      ) : dayEvents.length > 0 ? (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--amber-text)' }}>
                          {dayEvents[0].typeIcon || '📅'}{dayEvents.length}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ borderTop: '4px solid #f4b342' }}>
              <div className="card-title" style={{ justifyContent: 'space-between' }}>
                <span>
                  📅 {selectedDateRangeArray.length > 1 ? `אירועים ברצף (${rangeStart} עד ${rangeEnd})` : `אירועים ביומן ליום ${selectedDate}`}
                </span>
                <button className="mini-btn" onClick={() => setShowEventTypesManager(!showEventTypesManager)}>
                  ⚙️ קטגוריות יומן
                </button>
              </div>

              {/* הצגת האירועים ביום או ברצף הימים שנבחר */}
              {rangeEvents.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  {rangeEvents.map(ev => (
                    <div key={ev.id} className="event-item-card" style={{ borderRightColor: ev.color || '#f4b342' }}>
                      <div style={{ flex: 1 }}>
                        <div>
                          <span className="event-time-badge">{ev.isAllDay ? 'כל היום' : ev.time}</span>
                          <strong style={{ fontSize: '0.9rem' }}>{ev.typeIcon || '📅'} {ev.title}</strong>
                          <small style={{ marginRight: '6px', color: 'var(--muted)' }}>({ev.date.slice(5)})</small>
                        </div>
                        {ev.notes && <div className="item-subtitle">{ev.notes}</div>}
                      </div>
                      <div className="action-icons">
                        <button className="mini-btn" onClick={() => startEditEvent(ev)}><Edit2 size={13} /></button>
                        <button className="mini-btn danger" onClick={() => deleteCalendarEvent(ev.id)}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showEventTypesManager && (
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '12px', borderRadius: '16px', marginBottom: '14px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '8px' }}>
                    ✨ הוספה או עריכה של קטגוריות אירועים ביומן:
                  </div>
                  {eventTypesList.map(t => (
                    <div key={t.id} className="task-item" style={{ padding: '6px 0' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem' }}>
                        <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: t.color, display: 'inline-block' }} />
                        {t.icon} {t.label}
                      </span>
                      <div className="action-icons">
                        <button className="mini-btn" onClick={() => startEditEventType(t)}><Edit2 size={12} /></button>
                        <button className="mini-btn danger" onClick={() => deleteEventType(t.id)}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', alignItems: 'center' }}>
                    <input placeholder="אימוג׳י" value={newTypeIcon} onChange={e => setNewTypeIcon(e.target.value)} style={{ width: '58px', textAlign: 'center' }} />
                    <input placeholder="שם הקטגוריה..." value={newTypeLabel} onChange={e => setNewTypeLabel(e.target.value)} />
                    <input type="color" value={newTypeColor} onChange={e => setNewTypeColor(e.target.value)} style={{ width: '44px', height: '38px', padding: '2px' }} />
                    <button onClick={saveEventType} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                      {editingTypeId ? 'עדכן' : '+'}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ background: 'var(--surface)', padding: '14px', borderRadius: '18px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 900, fontSize: '0.92rem', marginBottom: '8px', color: editingEventId ? 'var(--amber-text)' : 'var(--dark)' }}>
                  {editingEventId ? '✏️ עריכת אירוע קיים' : `➕ הוספת אירוע ליומן ולסדר היום (+${POINTS.EVENT} נק׳)`}
                </div>

                <small style={{ fontWeight: 800, color: 'var(--text-2)' }}>בחרי קטגוריית אירוע:</small>
                <div className="event-type-chips">
                  {eventTypesList.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      className={`event-type-chip ${eventTypeId === t.id ? 'selected' : ''}`}
                      style={{ background: t.color }}
                      onClick={() => setEventTypeId(t.id)}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                <div className="input-row" style={{ flexDirection: 'column', marginTop: '8px' }}>
                  <input 
                    placeholder="כותרת האירוע (למשל: חופשה / יום הולדת / פגישה)..." 
                    value={eventTitle} 
                    onChange={e => setEventTitle(e.target.value)} 
                    style={{ background: 'var(--card)' }}
                  />
                  <input 
                    placeholder="משפט פירוט מתחת לכותרת (יופיע גם בסדר היום)..." 
                    value={eventNotes} 
                    onChange={e => setEventNotes(e.target.value)} 
                    style={{ background: 'var(--card)' }}
                  />

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', margin: '4px 0' }}>
                    <input 
                      type="checkbox" 
                      checked={eventIsAllDay} 
                      onChange={e => setEventIsAllDay(e.target.checked)} 
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span>אירוע של כל היום (יופיע ככותרת בראש סדר היום 🌟)</span>
                  </label>

                  {/* בחירת תאריך התחלה ותאריך סיום (רצף ימים) */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <small style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>מתאריך:</small>
                      <input 
                        type="date" 
                        value={eventDate} 
                        onChange={e => {
                          setEventDate(e.target.value);
                          if (eventEndDate < e.target.value) setEventEndDate(e.target.value);
                        }} 
                        style={{ background: 'var(--card)' }} 
                      />
                    </div>
                    {!editingEventId && (
                      <div style={{ flex: 1 }}>
                        <small style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>עד תאריך (לרצף ימים):</small>
                        <input 
                          type="date" 
                          value={eventEndDate} 
                          min={eventDate}
                          onChange={e => setEventEndDate(e.target.value)} 
                          style={{ background: 'var(--card)' }} 
                        />
                      </div>
                    )}
                  </div>

                  {!eventIsAllDay && (
                    <div>
                      <small style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>שעת האירוע:</small>
                      <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} style={{ background: 'var(--card)' }} />
                    </div>
                  )}

                  <div>
                    <small style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>
                      🔔 מתי להציג התראה על האירוע?
                    </small>
                    <select value={eventReminderMode} onChange={e => setEventReminderMode(e.target.value)} style={{ background: 'var(--card)' }}>
                      {REMINDER_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>

                  {eventReminderMode === 'custom_minutes' && (
                    <div className="custom-reminder-box">
                      <small style={{ fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                        ⏱️ כמה דקות לפני האירוע להקפיץ התראה?
                      </small>
                      <input type="number" value={customMinutesBefore} onChange={e => setCustomMinutesBefore(e.target.value)} style={{ background: 'var(--card)' }} />
                    </div>
                  )}

                  {eventReminderMode === 'custom_datetime' && (
                    <div className="custom-reminder-box">
                      <small style={{ fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                        🎯 בחרי תאריך ושעה מדויקים להתראה:
                      </small>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="date" value={customReminderDate} onChange={e => setCustomReminderDate(e.target.value)} style={{ background: 'var(--card)', flex: 1.2 }} />
                        <input type="time" value={customReminderTime} onChange={e => setCustomReminderTime(e.target.value)} style={{ background: 'var(--card)', flex: 1 }} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button style={{ flex: 1, background: '#f4b342', color: '#1c1917' }} onClick={saveCalendarEvent}>
                      {editingEventId 
                        ? 'שמור שינויים באירוע ✓' 
                        : getDatesBetween(eventDate, eventEndDate).length > 1 
                        ? `שמור אירוע ל-${getDatesBetween(eventDate, eventEndDate).length} ימים רצוף 🔔` 
                        : 'שמור אירוע ביומן ובסדר היום 🔔'}
                    </button>
                    {editingEventId && (
                      <button className="icon-btn" onClick={() => { setEditingEventId(null); setEventTitle(''); setEventNotes(''); }}>
                        ביטול
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title" style={{ justifyContent: 'space-between' }}>
                <span>📋 כל האירועים ביומן (עריכה וניהול)</span>
                <button className="mini-btn" onClick={activateWidgetModeWithUrl}>תצוגת ווידג׳ט 📱</button>
              </div>
              {allSortedEvents.length === 0 ? (
                <p style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>אין עדיין אירועים שמורים ביומן.</p>
              ) : (
                allSortedEvents.map(ev => (
                  <div key={ev.id} className="upcoming-widget-item" style={{ borderRightColor: ev.color || '#f4b342' }}>
                    <div onClick={() => setSelectedDate(ev.date)} style={{ cursor: 'pointer', flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                        {ev.typeIcon || '📅'} {ev.title}
                        <small style={{ marginRight: '6px', color: 'var(--muted)' }}>({ev.typeLabel || 'אירוע'})</small>
                      </div>
                      {ev.notes && <div className="item-subtitle">{ev.notes}</div>}
                      <small style={{ color: 'var(--muted)', display: 'block', marginTop: '2px' }}>
                        {formatReminderBadgeText(ev)}
                      </small>
                    </div>
                    <div className="action-icons">
                      <span className="when-pill">{formatUpcomingWhen(ev)}</span>
                      <button className="mini-btn" onClick={() => startEditEvent(ev)}><Edit2 size={13} /></button>
                      <button className="mini-btn danger" onClick={() => deleteCalendarEvent(ev.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* חנות הפרסים והפינוקים המורחבת */}
            <div className="card">
              <div className="card-title"><Gift size={18} color="#f4b342" /> חנות הפרסים והפינוקים שלי (⭐ {globalData.points} נק׳ זמינות)</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '12px' }}>
                כל פעולה מוסיפה נקודות מדודות (אימון = <strong>+{POINTS.WORKOUT} נק׳</strong>, הרגל = <strong>+{POINTS.HABIT} נק׳</strong>, משימה = <strong>+{POINTS.TASK} נק׳</strong>) כך שכל פרס כאן מרגיש כמו הישג אמיתי:
              </p>
              {(globalData.rewards || []).map(r => (
                <div key={r.id} className="reward-card">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{r.title}</div>
                    <small style={{ color: 'var(--amber-text)', fontWeight: 800 }}>עלות: ⭐ {r.cost} נק׳</small>
                  </div>
                  <div className="action-icons">
                    <button 
                      onClick={() => redeemReward(r)}
                      style={{ background: globalData.points >= r.cost ? '#f4b342' : '#e2dcd0', color: '#1c1917', padding: '8px 14px', fontSize: '0.8rem' }}
                    >
                      מימוש 🎁
                    </button>
                    <button className="mini-btn danger" onClick={() => deleteReward(r.id)} title="הסר פרס">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="input-row">
                <input placeholder="הוספת פרס אישי משלך..." value={newRewardTitle} onChange={e => setNewRewardTitle(e.target.value)} />
                <input type="number" placeholder="נק׳" style={{ width: '35%' }} value={newRewardCost} onChange={e => setNewRewardCost(e.target.value)} />
                <button onClick={addCustomReward}>+</button>
              </div>
            </div>
          </>
        )}

        {/* טאב 4: תקציב – הוצאה / הכנסה + יעד הוצאות שבועי + גרפים */}
        {activeTab === 'budget' && (
          <>
            <div className="card" style={{ borderTop: budgetEntryMode === 'income' ? '4px solid #10b981' : '4px solid #1c1917' }}>
              <div className="segmented-toggle">
                <button
                  type="button"
                  className={`segmented-btn ${budgetEntryMode === 'expense' ? 'active-expense' : ''}`}
                  onClick={() => setBudgetEntryMode('expense')}
                >
                  💸 רישום הוצאה
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${budgetEntryMode === 'income' ? 'active-income' : ''}`}
                  onClick={() => setBudgetEntryMode('income')}
                >
                  💰 הוספת הכנסה
                </button>
              </div>

              {budgetEntryMode === 'expense' ? (
                <>
                  <div className="card-title" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>רישום הוצאה ליום {selectedDate}</span>
                    <button className="mini-btn" onClick={() => setShowCategoryEditor(!showCategoryEditor)}>
                      ⚙️ עריכת קטגוריות
                    </button>
                  </div>

                  <div className="input-row" style={{ flexDirection: 'column', marginTop: 0 }}>
                    <input placeholder="על מה הוצאתי?" value={expTitle} onChange={e => setExpTitle(e.target.value)} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" placeholder="סכום (₪)" value={expCost} onChange={e => setExpCost(e.target.value)} />
                      <select value={expCategory} onChange={e => setExpCategory(e.target.value)}>
                        {expenseCategoriesList.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                        <option value="__other__">➕ אחרת (הוספת קטגוריה חדשה)...</option>
                      </select>
                    </div>

                    {expCategory === '__other__' && (
                      <div className="custom-reminder-box">
                        <small style={{ fontWeight: 800, display: 'block', marginBottom: '6px' }}>
                          ✨ הגדרת קטגוריית הוצאה חדשה (תישמר ותוצג בגרפים):
                        </small>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input 
                            placeholder="אייקון" 
                            value={customOtherExpCatIcon} 
                            onChange={e => setCustomOtherExpCatIcon(e.target.value)} 
                            style={{ width: '54px', textAlign: 'center', background: 'var(--card)' }}
                          />
                          <input 
                            placeholder="שם הקטגוריה (למשל: רכב / טיפוח)..." 
                            value={customOtherExpCatName} 
                            onChange={e => setCustomOtherExpCatName(e.target.value)} 
                            style={{ background: 'var(--card)' }}
                          />
                          <input 
                            type="color" 
                            value={customOtherExpCatColor} 
                            onChange={e => setCustomOtherExpCatColor(e.target.value)} 
                            style={{ width: '44px', height: '38px', padding: '2px', background: 'var(--card)' }}
                          />
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '6px', margin: '4px 0' }}>
                      {Object.entries(EXPENSE_TYPES).map(([key, info]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setExpType(key)}
                          style={{
                            flex: 1, padding: '8px 4px', fontSize: '0.74rem',
                            background: expType === key ? 'var(--ink)' : 'var(--chip)',
                            color: expType === key ? 'white' : 'var(--dark)'
                          }}
                        >
                          {info.label}
                        </button>
                      ))}
                    </div>
                    <button onClick={addExpense}><Plus size={16} /> הוסף הוצאה</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="card-title" style={{ color: 'var(--green-text)', marginBottom: '8px' }}>
                    <TrendingUp size={18} color="#10b981" /> הוספת הכנסה (חד-פעמית או חוזרת)
                  </div>
                  <div className="input-row" style={{ flexDirection: 'column', marginTop: 0 }}>
                    <input placeholder="תיאור ההכנסה (למשל: משכורת / פרויקט / החזר)..." value={incTitle} onChange={e => setIncTitle(e.target.value)} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" placeholder="סכום ההכנסה (₪)" value={incAmount} onChange={e => setIncAmount(e.target.value)} />
                      <select value={incCategory} onChange={e => setIncCategory(e.target.value)}>
                        {incomeCategoriesList.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                        <option value="__custom_inc__">➕ הוספת סוג הכנסה ידני...</option>
                      </select>
                    </div>

                    {incCategory === '__custom_inc__' && (
                      <input 
                        placeholder="הקלידי סוג הכנסה חדש (יישמר אוטומטית)..." 
                        value={customIncCategoryName} 
                        onChange={e => setCustomIncCategoryName(e.target.value)} 
                        style={{ background: 'var(--green-soft)', borderColor: '#10b981' }}
                      />
                    )}

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer', marginTop: '4px', color: 'var(--green-text)' }}>
                      <input 
                        type="checkbox" 
                        checked={incIsRecurring} 
                        onChange={e => setIncIsRecurring(e.target.checked)} 
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span>🔄 הכנסה זו חוזרת מספר פעמים</span>
                    </label>

                    {incIsRecurring && (
                      <div className="custom-reminder-box" style={{ background: 'var(--green-soft)', borderColor: '#6ee7b7' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <small style={{ fontWeight: 800 }}>כמה פעמים תחזור?</small>
                            <input 
                              type="number" 
                              min="2" 
                              max="60" 
                              value={incRepeatCount} 
                              onChange={e => setIncRepeatCount(e.target.value)} 
                              style={{ background: 'var(--card)' }}
                            />
                          </div>
                          <div style={{ flex: 1.4 }}>
                            <small style={{ fontWeight: 800 }}>באיזו תדירות?</small>
                            <select value={incRepeatFreq} onChange={e => setIncRepeatFreq(e.target.value)} style={{ background: 'var(--card)' }}>
                              <option value="monthly">מדי חודש (באותו תאריך)</option>
                              <option value="weekly">מדי שבוע</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    <button style={{ background: '#10b981', color: 'white' }} onClick={addIncome}>
                      <Plus size={16} /> שמור הכנסה (+{POINTS.INCOME} נק׳)
                    </button>
                  </div>
                </>
              )}

              {showCategoryEditor && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '12px', borderRadius: '16px', marginTop: '14px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.84rem', marginBottom: '8px' }}>
                    🎨 עריכת קטגוריות ההוצאה שלך (מוצגות בגרפים):
                  </div>
                  {expenseCategoriesList.map(cat => (
                    <div key={cat.id} className="task-item" style={{ padding: '6px 0' }}>
                      {editingExpCatId === cat.id ? (
                        <div style={{ display: 'flex', gap: '4px', width: '100%', alignItems: 'center' }}>
                          <input value={editExpCatIcon} onChange={e => setEditExpCatIcon(e.target.value)} style={{ width: '48px', textAlign: 'center' }} />
                          <input value={editExpCatName} onChange={e => setEditExpCatName(e.target.value)} />
                          <input type="color" value={editExpCatColor} onChange={e => setEditExpCatColor(e.target.value)} style={{ width: '40px', height: '34px', padding: '2px' }} />
                          <button className="mini-btn" onClick={() => saveEditExpenseCategory(cat)}><Check size={14} /></button>
                          <button className="mini-btn" onClick={() => setEditingExpCatId(null)}><X size={14} /></button>
                        </div>
                      ) : (
                        <>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.84rem' }}>
                            <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                            {cat.icon} {cat.name}
                          </span>
                          <div className="action-icons">
                            <button className="mini-btn" onClick={() => startEditExpenseCategory(cat)}><Edit2 size={12} /></button>
                            <button className="mini-btn danger" onClick={() => deleteExpenseCategory(cat)}><Trash2 size={12} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* כרטיס 2: יעד הוצאות שבועי + התפלגות הכנסה מול הוצאה */}
            <div className="card">
              <div className="card-title" style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wallet size={18} /> יעד שבועי והתפלגות הכנסה/הוצאה
                </span>
                <button className="mini-btn" onClick={() => setShowBudgetSettings(!showBudgetSettings)}>
                  🎯 עריכת יעדים
                </button>
              </div>

              {showBudgetSettings && (
                <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '16px', marginBottom: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <small style={{ fontWeight: 800 }}>יעד הוצאות שבועי (₪):</small>
                      <input 
                        type="number" 
                        value={weeklyTarget} 
                        onChange={e => setGlobalData({ ...globalData, weeklyLimit: Number(e.target.value) })} 
                        style={{ background: 'var(--card)' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <small style={{ fontWeight: 800 }}>תקציב הוצאות חודשי (₪):</small>
                      <input 
                        type="number" 
                        value={globalData.monthlyBudget} 
                        onChange={e => setGlobalData({ ...globalData, monthlyBudget: Number(e.target.value) })} 
                        style={{ background: 'var(--card)' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="analytics-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                <div className="kpi-box" style={{ background: 'var(--green-soft)', borderColor: '#a7f3d0' }}>
                  <small style={{ color: 'var(--green-text)', fontWeight: 800 }}>הכנסות החודש</small>
                  <div className="kpi-value" style={{ color: 'var(--green-text)' }}>
                    ₪{incomeSelectedMonth.toLocaleString()}
                  </div>
                </div>
                <div className="kpi-box" style={{ background: 'var(--rose-soft)', borderColor: '#fecdd3' }}>
                  <small style={{ color: 'var(--rose-text)', fontWeight: 800 }}>הוצאות החודש</small>
                  <div className="kpi-value" style={{ color: '#e11d48' }}>
                    ₪{spentSelectedMonth.toLocaleString()}
                  </div>
                </div>
                <div className="kpi-box">
                  <small style={{ color: 'var(--muted)', fontWeight: 800 }}>תזרים נטו</small>
                  <div className="kpi-value" style={{ color: netCashflowMonth >= 0 ? 'var(--green-text)' : '#e11d48' }}>
                    {netCashflowMonth >= 0 ? `+₪${netCashflowMonth.toLocaleString()}` : `-₪${Math.abs(netCashflowMonth).toLocaleString()}`}
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '18px', marginBottom: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: '4px' }}>
                  <span>📅 <strong>הוצאות השבוע</strong> ({weekStartStr.slice(5)} עד {weekEndStr.slice(5)}):</span>
                  <span><strong>₪{spentSelectedWeek.toLocaleString()}</strong> / ₪{weeklyTarget.toLocaleString()}</span>
                </div>
                <div className="progress-bar" style={{ height: '10px' }}>
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${Math.min(100, (spentSelectedWeek / Math.max(1, weeklyTarget)) * 100)}%`, 
                      background: spentSelectedWeek > weeklyTarget ? '#e11d48' : '#a3be8c' 
                    }} 
                  />
                </div>
                <small style={{ color: spentSelectedWeek > weeklyTarget ? '#e11d48' : '#57534e', fontWeight: 700 }}>
                  {spentSelectedWeek > weeklyTarget 
                    ? `חריגה שבועית של ₪${(spentSelectedWeek - weeklyTarget).toLocaleString()}` 
                    : `נותרו לך ₪${remainingWeeklyBudget.toLocaleString()} ליעד השבועי`}
                </small>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                  <span>סה״כ הוצאות בחודש {selectedMonth}: <strong>₪{spentSelectedMonth.toLocaleString()}</strong></span>
                  <span>יעד חודשי: ₪{globalData.monthlyBudget.toLocaleString()}</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${Math.min(100, (spentSelectedMonth / Math.max(1, globalData.monthlyBudget)) * 100)}%`, 
                      background: spentSelectedMonth > globalData.monthlyBudget ? '#e11d48' : '#f4b342' 
                    }} 
                  />
                </div>
              </div>

              {(incomeSelectedMonth > 0 || spentSelectedMonth > 0) && (
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '6px' }}>
                    📊 יחס הכנסות מול הוצאות החודש:
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 800 }}>
                    <span style={{ color: 'var(--green-text)' }}>
                      הכנסות ({Math.round((incomeSelectedMonth / Math.max(1, incomeSelectedMonth + spentSelectedMonth)) * 100)}%)
                    </span>
                    <span style={{ color: '#e11d48' }}>
                      הוצאות ({Math.round((spentSelectedMonth / Math.max(1, incomeSelectedMonth + spentSelectedMonth)) * 100)}%)
                    </span>
                  </div>
                  <div className="cashflow-comparison-bar">
                    <div 
                      className="cashflow-income-seg" 
                      style={{ width: `${(incomeSelectedMonth / Math.max(1, incomeSelectedMonth + spentSelectedMonth)) * 100}%` }}
                    >
                      {incomeSelectedMonth > 0 ? `₪${incomeSelectedMonth.toLocaleString()}` : ''}
                    </div>
                    <div 
                      className="cashflow-expense-seg" 
                      style={{ width: `${(spentSelectedMonth / Math.max(1, incomeSelectedMonth + spentSelectedMonth)) * 100}%` }}
                    >
                      {spentSelectedMonth > 0 ? `₪${spentSelectedMonth.toLocaleString()}` : ''}
                    </div>
                  </div>
                </div>
              )}

              {incomeCategoryBreakdown.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.84rem', marginBottom: '8px', color: 'var(--green-text)' }}>
                    💰 פילוח הכנסות החודש לפי קטגוריה:
                  </div>
                  {incomeCategoryBreakdown.map(ic => (
                    <div key={ic.name} className="cat-row">
                      <div className="cat-header">
                        <span>{ic.icon} <strong>{ic.name}</strong></span>
                        <span><strong>₪{ic.sum.toLocaleString()}</strong> ({ic.pct}%)</span>
                      </div>
                      <div className="progress-bar" style={{ height: '6px' }}>
                        <div className="progress-fill" style={{ width: `${ic.pct}%`, background: ic.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-title"><PieChart size={18} /> גרף התפלגות הוצאות ({selectedMonth})</div>
              {spentSelectedMonth === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>עדיין אין הוצאות בחודש זה.</p>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <span className="type-pill type-need">הכרחי: ₪{typeTotals.need}</span>
                    <span className="type-pill type-want">רצון: ₪{typeTotals.want}</span>
                    <span className="type-pill type-impulse">דחף: ₪{typeTotals.impulse} ({impulsePct}%)</span>
                  </div>
                  <div className="stacked-bar">
                    {categoryBreakdown.map(c => (
                      <div key={c.name} className="stacked-segment" style={{ width: `${c.pct}%`, background: c.color }} title={`${c.name}: ${c.pct}%`} />
                    ))}
                  </div>
                  {categoryBreakdown.map(c => (
                    <div key={c.name} className="cat-row">
                      <div className="cat-header">
                        <span>{c.icon} <strong>{c.name}</strong></span>
                        <span><strong>₪{c.sum.toLocaleString()}</strong> ({c.pct}%)</span>
                      </div>
                      <div className="progress-bar" style={{ height: '6px' }}>
                        <div className="progress-fill" style={{ width: `${c.pct}%`, background: c.color }} />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="card">
              <div className="card-title">📋 היסטוריית הכנסות והוצאות</div>
              {monthIncomes.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <small style={{ fontWeight: 800, color: 'var(--green-text)' }}>הכנסות בחודש {selectedMonth}:</small>
                  {monthIncomes.map(inc => (
                    <div key={inc.id} className="task-item">
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--green-text)' }}>
                          +₪{inc.amount.toLocaleString()} • {inc.title}
                        </div>
                        <small style={{ color: 'var(--muted)' }}>
                          {inc.category} • {inc.date}
                          {inc.isRecurring ? ` • 🔄 חוזרת (${inc.repeatIndex}/${inc.repeatTotal})` : ''}
                        </small>
                      </div>
                      <button className="mini-btn danger" onClick={() => deleteIncome(inc.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <small style={{ fontWeight: 800, color: 'var(--muted)' }}>הוצאות ביום {selectedDate}:</small>
              {dayExpenses.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '4px' }}>אין הוצאות רשומות ביום זה.</p>
              ) : (
                dayExpenses.map(e => {
                  const tInfo = EXPENSE_TYPES[e.expenseType || 'need'];
                  return (
                    <div key={e.id} className="task-item">
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{e.title}</div>
                        <small style={{ color: 'var(--muted)' }}>{e.category} • </small>
                        <span className={`type-pill ${tInfo.className}`}>{tInfo.label}</span>
                      </div>
                      <div className="action-icons">
                        <strong>₪{e.cost}</strong>
                        <button className="mini-btn" onClick={() => setReflectionModal({ contextTitle: `קנייה: ${e.title} (₪${e.cost})` })}>💭</button>
                        <button className="mini-btn danger" onClick={() => deleteExpense(e.id)}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="savings-banner">
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>קופת חיסכון מוויתור על קניות דחף 💪</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900 }}>₪{(globalData.savedFromImpulse || 0).toLocaleString()} נחסכו!</div>
              </div>
              <Sparkles size={26} />
            </div>

            <div className="card">
              <div className="card-title"><ShieldAlert size={18} /> חוק 24 השעות – עצירת קניות דחף</div>
              <div className="input-row">
                <input placeholder="מה בא לך לקנות עכשיו?" value={wishTitle} onChange={e => setWishTitle(e.target.value)} />
                <input type="number" placeholder="מחיר" style={{ width: '35%' }} value={wishCost} onChange={e => setWishCost(e.target.value)} />
                <button onClick={addToWishlist}>המתנה</button>
              </div>
              <div style={{ marginTop: '12px' }}>
                {(globalData.wishlist || []).map(w => (
                  <div key={w.id} className="task-item">
                    <div>
                      <div style={{ fontWeight: 800 }}>{w.title} (₪{w.cost})</div>
                      <small style={{ color: 'var(--muted)' }}>נוסף ב-{w.createdAt}</small>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button style={{ background: '#a3be8c', color: '#1c1917', fontSize: '0.75rem', padding: '6px 10px' }} onClick={() => skipImpulseItem(w)}>
                        ויתרתי וחסכתי! (+{POINTS.SKIP_IMPULSE}) 💪
                      </button>
                      <button className="icon-btn" style={{ fontSize: '0.75rem' }} onClick={() => buyWishlistItem(w)}>קניתי</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* טאב 5: אוכל ויומן רגשות */}
        {activeTab === 'journal' && (
          <>
            <div className="card">
              <div className="card-title"><Utensils size={18} /> מה אכלתי ב-{selectedDate}? (מופיע גם בסדר היום)</div>
              <div className="input-row" style={{ flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={mealType} onChange={e => setMealType(e.target.value)} style={{ flex: 1 }}>
                    <option>בוקר</option>
                    <option>צהריים</option>
                    <option>ערב</option>
                    <option>נשנוש</option>
                  </select>
                  <input 
                    type="time" 
                    value={mealTime} 
                    onChange={e => setMealTime(e.target.value)} 
                    style={{ width: '42%' }}
                    title="שעת הארוחה"
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input placeholder={`פירוט הארוחה (+${POINTS.MEAL} נק׳)...`} value={mealText} onChange={e => setMealText(e.target.value)} />
                  <button onClick={addMeal}>שמור</button>
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                {currentDay.meals.map(m => {
                  const isEditingThisMeal = editingMealId === m.id;

                  return (
                    <div key={m.id} className="task-item">
                      {isEditingThisMeal ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select value={editingMealType} onChange={e => setEditingMealType(e.target.value)}>
                              <option>בוקר</option>
                              <option>צהריים</option>
                              <option>ערב</option>
                              <option>נשנוש</option>
                            </select>
                            <input type="time" value={editingMealTime} onChange={e => setEditingMealTime(e.target.value)} />
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input value={editingMealText} onChange={e => setEditingMealText(e.target.value)} placeholder="פירוט הארוחה..." />
                            <button className="mini-btn" onClick={() => saveEditMeal(m.id)}><Check size={14} /></button>
                            <button className="mini-btn" onClick={() => setEditingMealId(null)}><X size={14} /></button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span>
                            <strong>{m.type} ({m.time}):</strong> {m.text}
                          </span>
                          <div className="action-icons">
                            <button className="mini-btn" onClick={() => startEditMeal(m)}><Edit2 size={13} /></button>
                            <button className="mini-btn danger" onClick={() => deleteMeal(m.id)}><Trash2 size={13} /></button>
                            <button className="mini-btn" onClick={() => setReflectionModal({ contextTitle: `ארוחת ${m.type} (${m.time}): ${m.text}` })}>
                              💭
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* תמיכה ברגעים קשים עם אוכל */}
            <div className="card" style={{ borderTop: '4px solid #f8cce0' }}>
              <div className="card-title" style={{ justifyContent: 'space-between' }}>
                <span>🫶 תמיכה ברגעים קשים עם אוכל</span>
                <button className="mini-btn" style={{ background: 'var(--rose-soft)', color: 'var(--rose-text)' }} onClick={openUrgeModal}>SOS</button>
              </div>

              <div className="support-note">
                אין כאן ספירת קלוריות, אין "אסור" ואין קנסות. כל עצירה ותיעוד מזכים ב-+{POINTS.URGE_CHECKIN} נק׳ – לא משנה איך זה הסתיים, כי המודעות היא מה שבונה שינוי.
              </div>

              {/* תיעוד היום הנבחר */}
              <small style={{ fontWeight: 800, color: 'var(--text-2)' }}>רגעים שתועדו ב-{selectedDate}:</small>
              {selectedDayUrges.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '4px 0 10px' }}>לא תועדו רגעים קשים ביום זה.</p>
              ) : (
                selectedDayUrges.map(u => (
                  <div key={u.id} className="task-item">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>
                        {u.time} • <span className="urge-outcome-pill" style={{ background: URGE_OUTCOMES[u.outcome]?.color }}>{URGE_OUTCOMES[u.outcome]?.short}</span>
                        {u.usedTimer && <span style={{ marginRight: '6px', fontSize: '0.74rem' }}>🌊 טיימר</span>}
                      </div>
                      <div className="item-subtitle">
                        {(u.halt || []).map(id => HALT_OPTIONS.find(h => h.id === id)).filter(Boolean).map(h => `${h.icon} ${h.label}`).join(' · ') || 'ללא טריגר מסומן'}
                        {' '}• עוצמה {u.intensity}/5
                      </div>
                      {u.note && <div className="item-subtitle">"{u.note}"</div>}
                    </div>
                    <button className="mini-btn danger" onClick={() => deleteUrgeEntry(u.id)}><Trash2 size={13} /></button>
                  </div>
                ))
              )}

              {/* דפוסים */}
              {last7Urges.length > 0 && (
                <div className="pattern-box">
                  <div style={{ fontWeight: 900, fontSize: '0.86rem', marginBottom: '6px' }}>🔍 מה למדתי על עצמי ב-7 הימים האחרונים</div>
                  {haltCounts.length > 0 && (
                    <div style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
                      הטריגר השכיח: <strong>{haltCounts[0].icon} {haltCounts[0].label}</strong>
                      {haltCounts.length > 1 && <> (ואחריו {haltCounts[1].icon} {haltCounts[1].label})</>}
                    </div>
                  )}
                  {topDayPart && (
                    <div style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
                      הזמן שבו הכי הרבה רגעים קשים: <strong>{topDayPart[0]}</strong>
                      {!eatingSupport.riskReminderTime && ' – אולי כדאי להגדיר תזכורת לפני השעה הזו 👇'}
                    </div>
                  )}
                  {urgesWithTimer.length > 0 && (
                    <div style={{ fontSize: '0.8rem' }}>
                      🌊 השתמשת בטיימר {urgesWithTimer.length} פעמים, ו-{surfedCount} מהן הסתיימו בלי אכילה מעבר. המיומנות מתחזקת!
                    </div>
                  )}
                </div>
              )}

              {/* הגדרות התראות */}
              <div className="custom-reminder-box" style={{ marginTop: '12px', background: 'var(--card)' }}>
                <div style={{ fontWeight: 900, fontSize: '0.84rem', marginBottom: '6px' }}>🔔 התראות תומכות</div>

                <small style={{ fontWeight: 800, display: 'block', marginBottom: '4px' }}>
                  🍽️ תזכורות לאכילה סדירה (בזמנים שמתאימים לך):
                </small>
                {(eatingSupport.mealReminders || []).map(r => (
                  <div key={r.id} className="task-item" style={{ padding: '5px 0' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>⏰ {r.time} – {r.label}</span>
                    <button className="mini-btn danger" onClick={() => removeMealReminder(r.id)}><Trash2 size={12} /></button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <input type="time" value={newMealReminderTime} onChange={e => setNewMealReminderTime(e.target.value)} style={{ flex: 1 }} />
                  <select value={newMealReminderLabel} onChange={e => setNewMealReminderLabel(e.target.value)} style={{ flex: 1.2 }}>
                    <option>ארוחה</option>
                    <option>ארוחת בוקר</option>
                    <option>ארוחת צהריים</option>
                    <option>ארוחת ערב</option>
                    <option>נשנוש</option>
                  </select>
                  <button onClick={addMealReminder} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>+</button>
                </div>

                <small style={{ fontWeight: 800, display: 'block', margin: '12px 0 4px' }}>
                  🌙 תזכורת לפני שעה שמאתגרת אותי:
                </small>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input type="time" value={eatingSupport.riskReminderTime || ''} onChange={e => updateEatingSupport({ riskReminderTime: e.target.value })} />
                  {eatingSupport.riskReminderTime && (
                    <button className="mini-btn" onClick={() => updateEatingSupport({ riskReminderTime: '' })}>כיבוי</button>
                  )}
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', marginTop: '12px' }}>
                  <input
                    type="checkbox"
                    checked={eatingSupport.followUpAfterHardMoment !== false}
                    onChange={e => updateEatingSupport({ followUpAfterHardMoment: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>💛 הודעת חמלה שעה אחרי אכילה מעבר למה שרציתי</span>
                </label>
              </div>

              <div className="help-box">
                <strong>את לא צריכה להתמודד עם זה לבד.</strong> אם הרגעים האלה חוזרים הרבה או מרגישים מחוץ לשליטה, שווה לדבר עם רופא/ת משפחה או עם דיאטנית/פסיכולוגית שמתמחות באכילה רגשית – זה מטופל ומשתפר. לשיחה רגשית עכשיו: <strong>ער״ן 1201</strong> (גם בצ׳אט באתר).
              </div>
            </div>

            <div className="card">
              <div className="card-title" style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BookOpen size={18} /> יומן רגשות ({selectedDate})</span>
                <button className="icon-btn" onClick={() => setReflectionModal({ contextTitle: 'כתיבה חופשית לעומק' })}>+ כתיבה</button>
              </div>
              {currentDay.journals.map(j => (
                <div key={j.id} style={{ background: 'var(--surface)', padding: '12px', borderRadius: '16px', marginBottom: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800 }}>
                    <span>{j.mood} {j.context}</span>
                    <span style={{ color: 'var(--muted)' }}>{j.time}</span>
                  </div>
                  <p style={{ marginTop: '6px', fontSize: '0.92rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{j.thought}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* מודאל מילוי "מדד אחרי אימון" */}
      {workoutMetricModalTask && (
        <div className="modal-overlay" onClick={() => setWorkoutMetricModalTask(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '6px' }}>💪 מדד אחרי אימון: {workoutMetricModalTask.text}</h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-2)', marginBottom: '10px' }}>
              כל הכבוד על השלמת האימון! איך הגוף והאנרגיה שלך מרגישים עכשיו?
            </p>

            <small style={{ fontWeight: 800, display: 'block', marginBottom: '6px' }}>הרגשה כללית אחרי האימון:</small>
            <select 
              value={modalWorkoutFeeling} 
              onChange={e => setModalWorkoutFeeling(e.target.value)}
              style={{ marginBottom: '10px', background: 'var(--card)' }}
            >
              {POST_WORKOUT_FEELINGS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>

            <small style={{ fontWeight: 800, display: 'block', marginBottom: '6px' }}>רמת מאמץ / עצימות (1 עד 5):</small>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              {[1, 2, 3, 4, 5].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setModalWorkoutIntensity(num)}
                  style={{
                    flex: 1,
                    background: modalWorkoutIntensity === num ? '#10b981' : 'var(--chip)',
                    color: modalWorkoutIntensity === num ? 'white' : 'var(--dark)'
                  }}
                >
                  {num} 🔥
                </button>
              ))}
            </div>

            <input 
              placeholder="הערה / מרחק / משקל / זמן (אופציונלי)..." 
              value={modalWorkoutNotes} 
              onChange={e => setModalWorkoutNotes(e.target.value)}
              style={{ background: 'var(--card)' }}
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button style={{ flex: 1, background: '#10b981', color: 'white' }} onClick={savePostWorkoutMetricModal}>
                שמירת מדד אימון (+{POINTS.WORKOUT_METRIC} נק׳)
              </button>
              <button className="icon-btn" onClick={() => setWorkoutMetricModalTask(null)}>דלג</button>
            </div>
          </div>
        </div>
      )}

      {/* מודאל הסבר הציון והצבעים */}
      {showScoreInfoModal && (
        <div className="modal-overlay" onClick={() => setShowScoreInfoModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '8px' }}>ℹ️ מה מסמלים הציון היומי והצבעים?</h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-2)', lineHeight: 1.5, marginBottom: '12px' }}>
              ציון האיזון שלך (כרגע <strong>{computedBalanceScore} מתוך 10</strong>) הוא ממוצע של 4 קשתות הצבע בעיגול:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
              {PILLARS_INFO.map(p => (
                <div key={p.name} style={{ background: 'var(--card)', padding: '10px 12px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, fontSize: '0.88rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                      {p.icon} {p.name}
                    </span>
                    <span>{p.score}/10</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '4px' }}>{p.desc}</div>
                </div>
              ))}
            </div>
            <button style={{ width: '100%' }} onClick={() => setShowScoreInfoModal(false)}>
              הבנתי, תודה! ✨
            </button>
          </div>
        </div>
      )}

      {/* מודאל פרופיל והגדרות */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="profile-header">
              <div className="profile-avatar">{(currentUser.displayName || '?').trim().charAt(0)}</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>{currentUser.displayName}</div>
                <small style={{ color: 'var(--muted)' }}>@{currentUser.username} • {syncStatus}</small>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, marginTop: '2px' }}>{levelInfo.title} • ⭐ {globalData.lifetimePoints || globalData.points} נק׳ מצטברות</div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-title">🎨 מראה</div>
              <div className="segmented-toggle three">
                {[['light', '☀️ בהיר'], ['dark', '🌙 כהה'], ['auto', '📱 אוטומטי']].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`segmented-btn ${themePref === key ? 'active-theme' : ''}`}
                    onClick={() => { setThemePref(key); haptic('light'); }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-title">🎯 היעדים היומיים שלי</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <label style={{ flex: 1 }}>
                  <small style={{ fontWeight: 800 }}>💧 כוסות מים</small>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={globalData.waterTarget}
                    onChange={e => setGlobalData(prev => ({ ...prev, waterTarget: Math.max(1, Math.min(30, Number(e.target.value) || 1)) }))}
                  />
                </label>
                <label style={{ flex: 1 }}>
                  <small style={{ fontWeight: 800 }}>👟 צעדים</small>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={globalData.stepsTarget}
                    onChange={e => setGlobalData(prev => ({ ...prev, stepsTarget: Math.max(500, Number(e.target.value) || 500) }))}
                  />
                </label>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-title">💾 גיבוי ושחזור</div>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '8px', lineHeight: 1.5 }}>
                הנתונים כבר מסונכרנים לענן, אבל כדאי לשמור גם קובץ גיבוי מדי פעם (ל-Drive או למחשב).
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ flex: 1 }} onClick={handleExportBackup} disabled={backupBusy}>
                  <Download size={16} /> {backupBusy ? 'יוצר...' : 'יצירת גיבוי'}
                </button>
                <label className="file-btn">
                  ↩️ שחזור מקובץ
                  <input type="file" accept="application/json,.json" onChange={handleImportBackup} hidden />
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button onClick={handleLogout} style={{ flex: 1, background: '#e11d48', color: 'white' }}>
                <LogOut size={16} /> התנתקות
              </button>
              <button className="icon-btn" onClick={() => setShowUserModal(false)}>סגור</button>
            </div>
          </div>
        </div>
      )}

      {/* מודאל כפתור ה-+ המרכזי */}
      {showQuickAddModal && (
        <div className="modal-overlay" onClick={() => setShowQuickAddModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '12px' }}>✨ פעולה מהירה</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button 
                style={{ background: '#f4b342', color: '#1c1917', padding: '14px', borderRadius: '18px' }}
                onClick={() => { setShowQuickAddModal(false); setActiveTab('calendar'); }}
              >
                📅 אירוע ביומן
              </button>
              <button 
                style={{ background: 'var(--green-soft)', color: 'var(--green-text)', padding: '14px', borderRadius: '18px' }}
                onClick={() => { setShowQuickAddModal(false); setBudgetEntryMode('income'); setActiveTab('budget'); }}
              >
                💰 הוספת הכנסה
              </button>
              <button 
                style={{ background: 'var(--rose-soft)', color: 'var(--rose-text)', padding: '14px', borderRadius: '18px' }}
                onClick={() => { setShowQuickAddModal(false); setBudgetEntryMode('expense'); setActiveTab('budget'); }}
              >
                💸 רישום הוצאה
              </button>
              <button 
                style={{ background: 'var(--lavender-soft)', color: 'var(--dark)', padding: '14px', borderRadius: '18px' }}
                onClick={() => { setShowQuickAddModal(false); setReflectionModal({ contextTitle: 'כתיבה מהירה ביומן הרגשות' }); }}
              >
                💭 רגש / מחשבה
              </button>
              <button
                style={{ background: 'var(--rose-soft)', color: 'var(--rose-text)', padding: '14px', borderRadius: '18px', gridColumn: '1 / -1' }}
                onClick={() => { setShowQuickAddModal(false); openUrgeModal(); }}
              >
                🫶 רגע קשה עם אוכל (SOS)
              </button>
            </div>
            <button className="icon-btn" style={{ width: '100%', marginTop: '12px' }} onClick={() => setShowQuickAddModal(false)}>
              סגור
            </button>
          </div>
        </div>
      )}

      {/* מודאל צ'ק-אין אמצע היום */}
      {showMiddayModal && (
        <div className="modal-overlay" onClick={() => setShowMiddayModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '6px' }}>🌤️ עצירת אמצע היום</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '10px' }}>
              קחי נשימה עמוקה ושתי כוס מים. איך את מרגישה ברגע זה של היום?
            </p>
            <div className="mood-selector">
              {MOODS.map(m => (
                <button key={m} className={`mood-btn ${middayMood === m ? 'selected' : ''}`} onClick={() => setMiddayMood(m)}>
                  {m}
                </button>
              ))}
            </div>
            <textarea 
              rows={3} 
              placeholder="כמה מילים על המשך היום שלי (אופציונלי)..."
              value={middayNote}
              onChange={e => setMiddayNote(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button style={{ flex: 1, background: '#f4b342', color: '#1c1917' }} onClick={saveMiddayCheckin}>
                שמירה + כוס מים (+{POINTS.MIDDAY} נק׳)
              </button>
              <button className="icon-btn" onClick={() => setShowMiddayModal(false)}>סגור</button>
            </div>
          </div>
        </div>
      )}

      {/* מודאל מרכז התראות */}
      {showNotificationCenter && (
        <div className="modal-overlay" onClick={() => setShowNotificationCenter(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '8px' }}>🔔 התראות יומיות והתראות יומן</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
              <div>
                <small style={{ fontWeight: 700 }}>☀️ התראת מנטרה בבוקר:</small>
                <input 
                  type="time" 
                  value={globalData.morningReminderTime || '08:00'} 
                  onChange={e => setGlobalData({ ...globalData, morningReminderTime: e.target.value })} 
                />
              </div>
              <div>
                <small style={{ fontWeight: 700 }}>🌤️ התראת צ׳ק-אין באמצע היום:</small>
                <input 
                  type="time" 
                  value={globalData.middayReminderTime || '13:30'} 
                  onChange={e => setGlobalData({ ...globalData, middayReminderTime: e.target.value })} 
                />
              </div>
              <div>
                <small style={{ fontWeight: 700 }}>🌙 התראת ציון וסיכום בערב:</small>
                <input 
                  type="time" 
                  value={globalData.eveningReminderTime || '21:00'} 
                  onChange={e => setGlobalData({ ...globalData, eveningReminderTime: e.target.value })} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={() => sendAndroidNotification("בדיקת התראה באנדרואיד! 🎉", `המנטרה שלך: "${MANTRAS[mantraIdx]}"`)}
                style={{ width: '100%', background: '#f4b342', color: '#1c1917' }}
              >
                🔔 הפעל ושלח התראת בדיקה עכשיו
              </button>
              <button 
                onClick={pinStatusToAndroidLockScreen}
                style={{ width: '100%', background: '#a3be8c', color: '#1c1917' }}
              >
                📌 הצמד אירוע קרוב וסטטוס למסך הנעילה
              </button>
              <button className="icon-btn" style={{ width: '100%' }} onClick={() => setShowNotificationCenter(false)}>
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* מודאל הסבר ווידג'ט */}
      {showWidgetGuide && (
        <div className="modal-overlay" onClick={() => setShowWidgetGuide(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '8px' }}>📱 ווידג׳ט אירועים באנדרואיד</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button style={{ width: '100%', background: '#f4b342', color: '#1c1917' }} onClick={exportAllEventsToICS}>
                📲 סנכרן את כל האירועים לווידג׳ט הטלפון (.ics)
              </button>
              <button style={{ width: '100%', background: '#a3be8c', color: '#1c1917' }} onClick={pinStatusToAndroidLockScreen}>
                📌 הצמד אירוע קרוב למסך הנעילה
              </button>
              <button style={{ width: '100%' }} onClick={activateWidgetModeWithUrl}>
                מעבר למסך הווידג׳ט המהיר של האפליקציה ✨
              </button>
              <button className="icon-btn" style={{ width: '100%' }} onClick={() => setShowWidgetGuide(false)}>סגור</button>
            </div>
          </div>
        </div>
      )}

      {/* מודאל בוקר */}
      {showMorningModal && (
        <div className="modal-overlay" onClick={() => setShowMorningModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '8px' }}>☀️ בוקר טוב, {currentUser.displayName}!</h3>
            <div style={{ background: '#fad074', padding: '12px', borderRadius: '16px', fontWeight: 700, marginBottom: '12px' }}>
              "{MANTRAS[mantraIdx]}"
            </div>
            <textarea 
              rows={3} 
              placeholder={`מה הכוונה או ההתמקדות שלך להיום? (+${POINTS.MORNING} נק׳)`}
              value={morningInput}
              onChange={e => setMorningInput(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button style={{ flex: 1 }} onClick={saveMorningIntention}>שמירה (+{POINTS.MORNING} נק׳)</button>
              <button className="icon-btn" onClick={() => setShowMorningModal(false)}>סגור</button>
            </div>
          </div>
        </div>
      )}

      {/* מודאל ערב */}
      {showEveningModal && (
        <div className="modal-overlay" onClick={() => setShowEveningModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '6px' }}>🌙 סיכום וציון ליום ({selectedDate})</h3>
            <div className="score-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <button key={num} className={`score-btn ${tempScore === num ? 'active' : ''}`} onClick={() => setTempScore(num)}>
                  {num}
                </button>
              ))}
            </div>
            <textarea 
              rows={3} 
              placeholder="סיכום קצר של היום: על מה אני תודה היום? איך הרגשתי כללית?"
              value={tempSummary}
              onChange={e => setTempSummary(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button style={{ flex: 1 }} onClick={saveEveningReview}>שמירת ציון (+{POINTS.EVENING} נק׳)</button>
              <button className="icon-btn" onClick={() => setShowEveningModal(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* מודאל רגע קשה עם אוכל (SOS) */}
      {showUrgeModal && (
        <div className="modal-overlay" onClick={() => urgeStep !== 'timer' && setShowUrgeModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            {urgeStep === 'halt' && (
              <>
                <h3 style={{ marginBottom: '6px' }}>🫶 עצירה רגע</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '10px', lineHeight: 1.5 }}>
                  עשית צעד חשוב רק בזה שפתחת את המסך הזה. בואי נבדוק מה קורה עכשיו – אפשר לבחור יותר מאחד:
                </p>
                <div className="halt-grid">
                  {HALT_OPTIONS.map(h => (
                    <button
                      key={h.id}
                      type="button"
                      className={`halt-chip ${urgeHalt.includes(h.id) ? 'selected' : ''}`}
                      onClick={() => toggleUrgeHalt(h.id)}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{h.icon}</span>
                      <span>{h.label}</span>
                    </button>
                  ))}
                </div>

                <small style={{ fontWeight: 800, display: 'block', margin: '10px 0 6px' }}>כמה חזק הדחף עכשיו? (1–5)</small>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setUrgeIntensity(n)}
                      style={{ flex: 1, background: urgeIntensity === n ? '#e11d48' : 'var(--chip)', color: urgeIntensity === n ? 'white' : 'var(--dark)' }}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                {urgeHalt.length > 0 && (
                  <div className="urge-tips">
                    {urgeHalt.map(id => {
                      const h = HALT_OPTIONS.find(x => x.id === id);
                      return h ? <div key={id} style={{ marginBottom: '6px' }}><strong>{h.icon} {h.label}:</strong> {h.tip}</div> : null;
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  <button style={{ background: 'var(--ink)' }} onClick={startUrgeTimer}>
                    🌊 גלישה על הדחף – טיימר {URGE_TIMER_MINUTES} דק׳ עם נשימות
                  </button>
                  {urgeHalt.includes('hungry') && (
                    <button style={{ background: '#bfd7f6', color: '#1c1917' }} onClick={() => saveUrgeEntry('meal')}>
                      🍽️ אני רעבה – הולכת לאכול ארוחה מסודרת
                    </button>
                  )}
                  <button className="icon-btn" onClick={() => setUrgeStep('outcome')}>רק לתעד מה קרה</button>
                </div>
              </>
            )}

            {urgeStep === 'timer' && (
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ marginBottom: '6px' }}>🌊 גלישה על הדחף</h3>
                <div className="breath-circle"><span>נשימה</span></div>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '1px', margin: '6px 0' }}>
                  {String(Math.floor(urgeSecondsLeft / 60)).padStart(2, '0')}:{String(urgeSecondsLeft % 60).padStart(2, '0')}
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.55, minHeight: '56px', fontWeight: 600 }}>
                  {urgeSurfPrompt}
                </p>
                <small style={{ color: 'var(--muted)', display: 'block', margin: '6px 0 12px' }}>
                  אפשר לסגור את המסך – תקבלי התראה כשהזמן ייגמר.
                </small>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ flex: 1 }} onClick={stopUrgeTimer}>הדחף נחלש – לסיום ✓</button>
                  <button className="icon-btn" onClick={() => setShowUrgeModal(false)}>סגור מסך</button>
                </div>
              </div>
            )}

            {urgeStep === 'outcome' && (
              <>
                <h3 style={{ marginBottom: '6px' }}>איך זה הסתיים?</h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-2)', marginBottom: '10px' }}>
                  כל תשובה בסדר ומזכה באותן +{POINTS.URGE_CHECKIN} נק׳. כנות עם עצמך היא הכוח פה.
                </p>
                <textarea
                  rows={2}
                  placeholder="מה עזר? מה היה הטריגר? (אופציונלי)"
                  value={urgeNote}
                  onChange={e => setUrgeNote(e.target.value)}
                  style={{ marginBottom: '10px' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(URGE_OUTCOMES).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => saveUrgeEntry(key)}
                      style={{ background: info.color, color: '#1c1917' }}
                    >
                      {info.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {urgeStep === 'done' && (
              <>
                <h3 style={{ marginBottom: '8px' }}>תודה שעצרת 🫶</h3>
                <div className="encourage-banner">{URGE_OUTCOME_MESSAGES[urgeDoneOutcome]}</div>
                {urgeDoneOutcome === 'binge' && (
                  <div className="help-box" style={{ marginTop: 0 }}>
                    אם זה קורה הרבה, את לא צריכה להתמודד לבד – רופא/ת משפחה או איש/אשת מקצוע שמתמחים באכילה רגשית יכולים לעזור באמת. לשיחה עכשיו: <strong>ער״ן 1201</strong>.
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    style={{ flex: 1 }}
                    onClick={() => {
                      setShowUrgeModal(false);
                      setReflectionModal({ contextTitle: 'התבוננות בחמלה על רגע קשה עם אוכל 🫶' });
                    }}
                  >
                    💭 לכתוב עוד ביומן (+{POINTS.JOURNAL})
                  </button>
                  <button className="icon-btn" onClick={() => setShowUrgeModal(false)}>סגור</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* מודאל יומן רגשות */}
      {reflectionModal && (
        <div className="modal-overlay" onClick={() => setReflectionModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '6px' }}>יומן רגשות 💭</h3>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>
              {reflectionModal.contextTitle}
            </p>
            <div className="mood-selector">
              {MOODS.map(m => (
                <button key={m} className={`mood-btn ${selectedMood === m ? 'selected' : ''}`} onClick={() => setSelectedMood(m)}>
                  {m}
                </button>
              ))}
            </div>
            <textarea 
              rows={4} 
              placeholder="כתבי כאן לעומק... מה הרגשת בגוף? אילו מחשבות עלו סביב הפעולה הזו?"
              value={deepThought}
              onChange={e => setDeepThought(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button style={{ flex: 1 }} onClick={saveReflection}>שמירה ביומן (+{POINTS.JOURNAL} נק׳)</button>
              <button className="icon-btn" onClick={() => setReflectionModal(null)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* סרגל ניווט תחתון */}
      <div className="floating-bottom-dock-wrap">
        <nav className="floating-bottom-dock">
          <button className={`dock-btn ${activeTab === 'day' ? 'active' : ''}`} onClick={() => setActiveTab('day')}>
            <CheckSquare size={18} />
            <span>היום</span>
          </button>
          <button className={`dock-btn ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
            <CalendarIcon size={18} />
            <span>יומן</span>
          </button>
          <button className={`dock-btn ${activeTab === 'habits' ? 'active' : ''}`} onClick={() => setActiveTab('habits')}>
            <Flame size={18} />
            <span>מדד</span>
          </button>

          <button className="dock-fab-center" onClick={() => setShowQuickAddModal(true)} title="פעולה מהירה">
            <Plus size={26} />
          </button>

          <button className={`dock-btn ${activeTab === 'budget' ? 'active' : ''}`} onClick={() => setActiveTab('budget')}>
            <Wallet size={18} />
            <span>תקציב</span>
          </button>
          <button className={`dock-btn ${activeTab === 'journal' ? 'active' : ''}`} onClick={() => setActiveTab('journal')}>
            <BookOpen size={18} />
            <span>אוכל ורגש</span>
          </button>
        </nav>
      </div>
    </div>
  );
}