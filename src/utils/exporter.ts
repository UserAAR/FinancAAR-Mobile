import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import XLSX from 'xlsx';
import { database } from './database';
import { Platform, PermissionsAndroid } from 'react-native';
import * as Print from 'expo-print';

export type ExportDataType = ValueOf<typeof ALL_EXPORT_DATA_TYPES>;
export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ExportOptions {
  types: ExportDataType[];
  format: ExportFormat;
  startDate?: Date;
  endDate?: Date;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function filterByDate<T extends { date: Date }>(data: T[], start?: Date, end?: Date): T[] {
  if (!start && !end) return data;
  return data.filter(item => {
    const d = item.date;
    if (start && d < start) return false;
    if (end) {
      const dEnd = new Date(end);
      dEnd.setHours(23, 59, 59, 999);
      if (d > dEnd) return false;
    }
    return true;
  });
}

// Full list of exportable data types so that UI can stay in sync without duplicating constants
export const ALL_EXPORT_DATA_TYPES = [
  'transactions',
  'debts',
  'balances',
  'categories',
  'accounts',
] as const;

// Utility map to satisfy TS from const assertion above
type ValueOf<T> = T[keyof T];

export async function generateFile(opts: ExportOptions): Promise<string> {
  const { types, format, startDate, endDate } = opts;
  const rows: any[] = [];

  // Pre-fetch accounts & categories to translate IDs ➜ human-readable names
  const accounts = database.getAccounts();
  const categories = database.getCategories();
  const accountNameById = new Map(accounts.map(a => [a.id, a.name] as const));
  const categoryNameById = new Map(categories.map(c => [c.id, c.name] as const));

  if (types.includes('transactions')) {
    const tx = filterByDate(database.getTransactions(undefined), startDate, endDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    let running = 0;
    tx.forEach(t => {
      let sign = 0;
      switch (t.type) {
        case 'income': sign = 1; break;
        case 'expense': sign = -1; break;
        case 'debt_payment': sign = -1; break;
        default: sign = 0; // transfer etc.
      }
      running += sign * t.amount;

      rows.push({
        Type: t.type.charAt(0).toUpperCase() + t.type.slice(1),
        Date: formatDate(t.date),
        Title: t.title,
        Amount: (sign === -1 ? '-' : '') + t.amount,
        Category: categoryNameById.get(t.categoryId) || t.categoryId,
        Account: accountNameById.get(t.accountId) || t.accountId,
        RunningBalance: running,
      });
    });

    // Summary row
    rows.push({
      Type: 'Summary',
      Date: '-',
      Title: 'Net Change',
      Amount: running,
      Category: '-',
      Account: '-',
      RunningBalance: running,
    });
  }
  if (types.includes('debts')) {
    const debts = filterByDate(database.getDebts(), startDate, endDate);
    debts.forEach(d => {
      rows.push({
        Type: 'Debt',
        Date: formatDate(d.date),
        Person: d.personName,
        Amount: d.amount,
        Status: d.status,
      });
    });
  }
  if (types.includes('balances')) {
    accounts.forEach(a => {
      rows.push({
        Type: 'Balance',
        Date: formatDate(new Date()),
        Account: a.name,
        Balance: a.balance,
      });
    });
  }
  if (types.includes('accounts')) {
    accounts.forEach(a => {
      rows.push({
        Type: 'Account',
        Name: a.name,
        Kind: a.type,
        Balance: a.balance,
        Created: formatDate(a.createdAt),
      });
    });
  }
  if (types.includes('categories')) {
    categories.forEach(c => {
      rows.push({
        Type: 'Category',
        Date: '-',
        Name: c.name,
        Subtype: c.type,
      });
    });
  }

  // ---------- Better file naming ----------
  // Example: FinancAAR_Report_2025-07-08_Transactions-Debts_2025-07-01_to_2025-07-08
  function safeSlug(str: string) {
    return str.replace(/[^a-z0-9_-]+/gi, '-');
  }

  const now = new Date();
  const genDateStr = formatDate(now); // YYYY-MM-DD

  const typePart = types.length === ALL_EXPORT_DATA_TYPES.length
    ? 'AllData'
    : safeSlug(types.join('-'));

  let rangePart = 'Full';
  if (startDate && endDate) {
    rangePart = `${formatDate(startDate)}_to_${formatDate(endDate)}`;
  } else if (startDate && !endDate) {
    rangePart = `from_${formatDate(startDate)}`;
  } else if (!startDate && endDate) {
    rangePart = `to_${formatDate(endDate)}`;
  }

  const fileNameBase = `FinancAAR_Report_${genDateStr}_${typePart}_${rangePart}`;
  let fileUri = '';

  if (format === 'csv') {
    const header = Object.keys(rows[0] || {}).join(',');
    const csvContent = [header, ...rows.map(r => Object.values(r).join(','))].join('\n');
    fileUri = FileSystem.documentDirectory + fileNameBase + '.csv';
    await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
  } else if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    fileUri = FileSystem.documentDirectory + fileNameBase + '.xlsx';
    await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
  } else {
    // Generate an HTML table then convert it to a styled PDF using expo-print
    const headers = rows.length ? Object.keys(rows[0]) : ['No data'];
    const tableHead = headers.map(h => `<th>${h}</th>`).join('');
    const tableBody = rows
      .map(r =>
        '<tr>' +
        headers.map(h => `<td>${(r as any)[h] ?? ''}</td>`).join('') +
        '</tr>'
      )
      .join('');

    const html = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body{font-family:Arial,Helvetica,sans-serif;padding:16px;}
            h2{margin-bottom:24px;}
            table{width:100%;border-collapse:collapse;font-size:12px;}
            th,td{border:1px solid #ddd;padding:8px;text-align:left;}
            th{background:#f4f4f4;}
            tr:nth-child(even){background:#fafafa;}
          </style>
        </head>
        <body>
          <h2>FinancAAR Report</h2>
          <table>
            <thead><tr>${tableHead}</tr></thead>
            <tbody>${tableBody}</tbody>
          </table>
        </body>
      </html>`;

    const { uri } = await Print.printToFileAsync({ html });

    // Move to a predictable name so that PDF matches CSV/XLSX naming scheme
    const destPath = FileSystem.documentDirectory + fileNameBase + '.pdf';
    try {
      await FileSystem.copyAsync({ from: uri, to: destPath });
      // (Optional) remove the temporary file created by printToFileAsync
      await FileSystem.deleteAsync(uri, { idempotent: true });
      fileUri = destPath;
    } catch {
      // Fallback: keep original uri if copy fails
      fileUri = uri;
    }
  }

  return fileUri;
}

export async function shareFile(uri: string) {
  await Sharing.shareAsync(uri);
}

/**
 * Attempt to copy a generated file to the public Downloads folder on Android devices.
 * Returns the destination path on success, otherwise null.
 * On platforms other than Android it performs no action and returns null.
 */
export async function saveToDownloads(uri: string): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  try {
    // Prefer SAF (Android 10+)
    const Saf = (FileSystem as any).StorageAccessFramework as typeof FileSystem.StorageAccessFramework | undefined;
    const fileName = uri.split('/').pop() || `FinancAAR_Report_${Date.now()}`;

    if (Saf) {
      try {
        const downloadsDirUri = Saf.getUriForDirectoryInRoot('Download');
        const perm = await Saf.requestDirectoryPermissionsAsync(downloadsDirUri);
        if (perm.granted) {
          // Determine mimeType
          let mime: string | undefined;
          if (fileName.endsWith('.csv')) mime = 'text/csv';
          else if (fileName.endsWith('.xlsx')) mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          else if (fileName.endsWith('.pdf')) mime = 'application/pdf';

          const destUri = await Saf.createFileAsync(
            perm.directoryUri,
            fileName,
            mime || 'application/octet-stream'
          );

          // StorageAccessFramework.copyAsync can silently create an empty file when
          // copying from a file:// URI ➜ content:// destination.  Instead, read the
          // source file as Base64 and write it back to the new SAF file to guarantee
          // correct byte-for-byte transfer.
          const fileBase64 = await FileSystem.readAsStringAsync(uri, {
            encoding:
              fileName.endsWith('.csv') || fileName.endsWith('.pdf')
                ? FileSystem.EncodingType.Base64
                : FileSystem.EncodingType.Base64 /* binary safe */,
          });
          await FileSystem.writeAsStringAsync(destUri, fileBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });

          return destUri;
        }
      } catch (e) {
        // SAF failed; fall back to legacy method below
        console.warn('SAF download copy failed, falling back', e);
      }
    }

    // Legacy external storage method (requires WRITE permission for API < 33)
    if (Platform.Version < 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE as any
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return null;
      }
    }

    const externalDir = (FileSystem as any).externalStorageDirectory as string | undefined;
    if (!externalDir) return null;

    const destPath = `${externalDir}Download/${fileName}`;
    await FileSystem.copyAsync({ from: uri, to: destPath });
    return destPath;
  } catch (e) {
    console.warn('saveToDownloads failed', e);
    return null;
  }
} 