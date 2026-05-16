import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import { prisma } from '../db.js';

type ReportFilters = { userId?: string; userIds?: string[]; positionId?: string };

export async function getReportData(companyId: string, from: Date, to: Date, filters: ReportFilters = {}) {
  const entries = await prisma.timeEntry.findMany({
    where: {
      companyId,
      date: { gte: from, lte: to },
      ...(filters.userIds?.length ? { userId: { in: filters.userIds } } : filters.userId ? { userId: filters.userId } : {}),
      ...(filters.positionId ? { user: { positionId: filters.positionId } } : {})
    },
    include: { user: { include: { position: true } } }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
  });
  const totalMinutes = entries.reduce((s, e) => s + e.totalMinutes, 0);
  const estimatedPay = entries.reduce((s, e) => s + (e.user.hourlyRate ? (e.totalMinutes/60) * Number(e.user.hourlyRate) : 0), 0);
  return { entries, totalMinutes, estimatedPay };
}

export async function createCsv(companyId: string, from: Date, to: Date, filters: ReportFilters = {}) {
  const data = await getReportData(companyId, from, to, filters);
  const rows = data.entries.map(e => ({ date: e.date.toISOString().slice(0,10), employee: `${e.user.firstName} ${e.user.lastName}`, start: e.startTime.toISOString(), end: e.endTime.toISOString(), breakMinutes: e.breakMinutes, hours: (e.totalMinutes/60).toFixed(2), status: e.status, workRole: e.user.position?.name ?? '', estimatedPay: e.user.hourlyRate ? ((e.totalMinutes/60) * Number(e.user.hourlyRate)).toFixed(2) : '' }));
  return new Parser({ fields: ['date','employee','start','end','breakMinutes','hours','status','workRole','estimatedPay'] }).parse(rows);
}

export async function createPdf(companyId: string, from: Date, to: Date, filters: ReportFilters = {}) {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  const data = await getReportData(companyId, from, to, filters);
  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];
  doc.on('data', c => chunks.push(c));
  doc.fontSize(20).text('TimeTrack report');
  doc.fontSize(12).text(`${company.name} • ${from.toISOString().slice(0,10)} to ${to.toISOString().slice(0,10)}`);
  doc.moveDown().text(`Total: ${(data.totalMinutes/60).toFixed(2)} hours`);
  if (data.estimatedPay > 0) doc.text(`Estimated pay: ${data.estimatedPay.toFixed(2)} NOK`);
  doc.moveDown();
  data.entries.forEach(e => doc.fontSize(10).text(`${e.date.toISOString().slice(0,10)}  ${e.user.firstName} ${e.user.lastName}  ${(e.totalMinutes/60).toFixed(2)} h  ${e.status}`));
  doc.moveDown().fontSize(8).text('Note: Compliance checks are technical helper rules and must be checked against law, tariff agreements and contracts before used as final legal assessment.');
  doc.end();
  return new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));
}
