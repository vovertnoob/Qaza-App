import { jsPDF } from 'jspdf';
import {
  PRAYERS,
  PRAYER_LABELS,
  type QazaSnapshot,
} from '../types/qaza';

function escapeCsv(val: string | number | undefined): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportToCsv(snapshot: QazaSnapshot): void {
  const lines: string[] = [];
  lines.push('QazaFlow Tracking Export');
  lines.push(`Exported At,${escapeCsv(new Date().toISOString())}`);
  lines.push(`Account,${escapeCsv(snapshot.profile.email || 'Local Guest')}`);
  lines.push('');

  lines.push('Prayer Balances');
  lines.push('Prayer,Initial Balance,Pending Balance,Completed Balance,Inbox Pending,Last Updated');
  for (const p of PRAYERS) {
    const b = snapshot.balances[p.id];
    lines.push(
      [
        p.label,
        b.initialBalance,
        b.pendingBalance,
        b.completedBalance,
        b.inboxPendingCount,
        b.updatedAtIso,
      ]
        .map(escapeCsv)
        .join(',')
    );
  }
  lines.push('');

  lines.push('Qaza Inbox Entries');
  lines.push('ID,Prayer,Status,Source,Date Added,Completed At,Note');
  for (const entry of snapshot.qazaEntries) {
    lines.push(
      [
        entry.id,
        PRAYER_LABELS[entry.prayerType],
        entry.status,
        entry.source,
        entry.dateAdded,
        entry.completedAt || '',
        entry.note || '',
      ]
        .map(escapeCsv)
        .join(',')
    );
  }
  lines.push('');

  lines.push('Activity History');
  lines.push('Timestamp,Action,Prayer,Quantity,Previous Pending,Updated Pending,Previous Completed,Updated Completed,Note');
  for (const log of snapshot.activityLogs) {
    lines.push(
      [
        log.clientTimestamp,
        log.actionType,
        PRAYER_LABELS[log.prayerType],
        log.quantity,
        log.previousPending,
        log.updatedPending,
        log.previousCompleted,
        log.updatedCompleted,
        log.note || '',
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(lines.join('\n'), `qazaflow-export-${dateStr}.csv`, 'text/csv;charset=utf-8;');
}

export function exportToJsonBackup(snapshot: QazaSnapshot): void {
  const payload: QazaSnapshot = {
    ...snapshot,
    exportedAt: new Date().toISOString(),
  };
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(
    JSON.stringify(payload, null, 2),
    `qazaflow-backup-${dateStr}.json`,
    'application/json'
  );
}

export function exportToPdf(snapshot: QazaSnapshot): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = 52;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(27, 77, 62);
  doc.text('QazaFlow — Qaza Namaz Progress Report', 44, y);

  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(92, 99, 94);
  doc.text(
    `Generated: ${new Date().toLocaleString()}  |  Account: ${snapshot.profile.email || 'Local Guest'}`,
    44,
    y
  );

  const totalPending = PRAYERS.reduce((acc, p) => acc + snapshot.balances[p.id].pendingBalance, 0);
  const totalCompleted = PRAYERS.reduce((acc, p) => acc + snapshot.balances[p.id].completedBalance, 0);
  const totalInitial = PRAYERS.reduce((acc, p) => acc + snapshot.balances[p.id].initialBalance, 0);
  const totalAll = totalPending + totalCompleted;
  const pct = totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0;

  y += 28;
  doc.setDrawColor(229, 226, 220);
  doc.setFillColor(248, 247, 244);
  doc.roundedRect(44, y, 507, 56, 6, 6, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(26, 29, 27);
  doc.text(`Pending: ${totalPending.toLocaleString()}`, 62, y + 24);
  doc.text(`Completed: ${totalCompleted.toLocaleString()}`, 190, y + 24);
  doc.text(`Initial Estimate: ${totalInitial.toLocaleString()}`, 320, y + 24);
  doc.text(`Progress: ${pct}%`, 462, y + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(92, 99, 94);
  doc.text(
    `Routine: ${snapshot.profile.routine.replace(/_/g, ' ')}  |  Target: ${
      snapshot.profile.targetType === 'none'
        ? 'No fixed target'
        : `${snapshot.profile.targetCount} ${snapshot.profile.targetType}`
    }`,
    62,
    y + 42
  );

  y += 84;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(26, 29, 27);
  doc.text('Prayer-Wise Balances', 44, y);

  y += 18;
  doc.setFontSize(10);
  doc.setTextColor(92, 99, 94);
  doc.text('Prayer', 44, y);
  doc.text('Initial', 190, y);
  doc.text('Pending', 290, y);
  doc.text('Completed', 390, y);
  doc.text('Inbox', 490, y);
  y += 8;
  doc.line(44, y, 551, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(26, 29, 27);
  for (const p of PRAYERS) {
    const b = snapshot.balances[p.id];
    y += 20;
    doc.text(p.label, 44, y);
    doc.text(b.initialBalance.toLocaleString(), 190, y);
    doc.text(b.pendingBalance.toLocaleString(), 290, y);
    doc.text(b.completedBalance.toLocaleString(), 390, y);
    doc.text(b.inboxPendingCount.toLocaleString(), 490, y);
  }

  y += 34;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Recent Activity (Latest 15)', 44, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const recentLogs = snapshot.activityLogs.slice(0, 15);
  if (recentLogs.length === 0) {
    doc.setTextColor(92, 99, 94);
    doc.text('No activity recorded yet.', 44, y);
  } else {
    for (const log of recentLogs) {
      if (y > 760) {
        doc.addPage();
        y = 52;
      }
      const timeLabel = new Date(log.clientTimestamp).toLocaleString();
      const prayerName = PRAYER_LABELS[log.prayerType];
      doc.setTextColor(26, 29, 27);
      doc.text(
        `${timeLabel} — ${log.actionType.replace(/_/g, ' ')} (${prayerName}, qty: ${log.quantity})`,
        44,
        y
      );
      y += 15;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 125, 122);
    doc.text(
      'QazaFlow is a personal tracking and organization tool. Consult a qualified scholar for religious questions.',
      44,
      810
    );
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`qazaflow-report-${dateStr}.pdf`);
}

export function validateBackupJson(rawText: string): QazaSnapshot {
  const parsed = JSON.parse(rawText) as Partial<QazaSnapshot>;
  if (!parsed || typeof parsed !== 'object' || !parsed.balances || !parsed.profile) {
    throw new Error('Invalid backup file format. Missing required profile or balance fields.');
  }
  for (const p of PRAYERS) {
    if (!parsed.balances[p.id] || typeof parsed.balances[p.id].pendingBalance !== 'number') {
      throw new Error(`Invalid backup file: missing valid balance for ${p.label}.`);
    }
  }
  return parsed as QazaSnapshot;
}
