// גיבוי ושחזור של כל הנתונים לקובץ JSON
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const BACKUP_APP_ID = 'balance-app';
const BACKUP_VERSION = 1;

export async function exportBackup({ username, globalData, daysHistory }) {
  const payload = {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    username,
    globalData,
    daysHistory
  };
  const json = JSON.stringify(payload, null, 2);
  const fileName = `balance-backup-${new Date().toISOString().slice(0, 10)}.json`;

  if (Capacitor.isNativePlatform()) {
    // באנדרואיד: שומרים קובץ זמני ופותחים חלון שיתוף (Drive / WhatsApp / קבצים)
    const written = await Filesystem.writeFile({
      path: fileName,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8
    });
    await Share.share({
      title: 'גיבוי איזון יומי',
      text: 'קובץ גיבוי של כל הנתונים באפליקציה',
      files: [written.uri],
      dialogTitle: 'איפה לשמור את הגיבוי?'
    });
    return fileName;
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return fileName;
}

export function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('לא נבחר קובץ'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('הקובץ גדול מדי'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data?.app !== BACKUP_APP_ID || typeof data.globalData !== 'object' || typeof data.daysHistory !== 'object') {
          reject(new Error('זה לא נראה כמו קובץ גיבוי של האפליקציה'));
          return;
        }
        resolve(data);
      } catch (e) {
        reject(new Error('הקובץ פגום או לא בפורמט JSON'));
      }
    };
    reader.onerror = () => reject(new Error('לא הצלחתי לקרוא את הקובץ'));
    reader.readAsText(file);
  });
}
