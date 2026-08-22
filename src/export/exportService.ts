import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { getCategoryDef } from '../constants/categories';
import { formatDisplayDateTime } from '../utils/dateFormat';
import type { Reminder } from '../types/reminder';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));
}

function buildHtml(reminders: Reminder[]): string {
  const rows = reminders
    .map((r) => {
      const category = getCategoryDef(r.category).label;
      return `<tr>
        <td>${escapeHtml(r.title)}</td>
        <td>${escapeHtml(category)}</td>
        <td>${escapeHtml(r.subcategory ?? '')}</td>
        <td>${escapeHtml(formatDisplayDateTime(r.dueDate))}</td>
        <td>${escapeHtml(r.status)}</td>
        <td>${escapeHtml(r.notes ?? '')}</td>
      </tr>`;
    })
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Roboto, sans-serif; padding: 24px; color: #111827; }
          h1 { color: #2A6F5E; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #E2E8F0; padding: 8px 10px; font-size: 12px; text-align: left; }
          th { background: #F4F8F6; }
        </style>
      </head>
      <body>
        <h1>Remindly - All Reminders</h1>
        <p>Exported ${escapeHtml(new Date().toLocaleString())}</p>
        <table>
          <thead>
            <tr><th>Title</th><th>Category</th><th>Type</th><th>Due</th><th>Status</th><th>Notes</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;
}

export async function exportRemindersAsPdf(reminders: Reminder[]): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: buildHtml(reminders) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Export Reminders as PDF',
    });
  }
}

export async function exportRemindersAsExcel(reminders: Reminder[]): Promise<void> {
  const rows = reminders.map((r) => ({
    Title: r.title,
    Category: getCategoryDef(r.category).label,
    Type: r.subcategory ?? '',
    Due: formatDisplayDateTime(r.dueDate),
    Status: r.status,
    Notes: r.notes ?? '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reminders');
  const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' }) as string;

  const file = new File(Paths.cache, `remindly-export-${Date.now()}.xlsx`);
  file.write(base64, { encoding: 'base64' });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Export Reminders as Excel',
    });
  }
}
