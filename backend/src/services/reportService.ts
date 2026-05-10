import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import { prisma } from '../db.js';

export async function getReportData(companyId: string, from: Date, to: Date, userId?: string) {
  const entries = await prisma.timeEntry.findMany({
    where: { companyId, date: { gte: from, lte: to }, ...(userId ? { userId } : {}) },
    include: { user: { include: { position: true } } }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
  });
  const totalMinutes = entries.reduce((s, e) => s + e.totalMinutes, 0);
  const estimatedPay = entries.reduce((s, e) => s + (e.user.hourlyRate ? (e.totalMinutes/60) * Number(e.user.hourlyRate) : 0), 0);
  return { entries, totalMinutes, estimatedPay };
}

export async function createCsv(companyId: string, from: Date, to: Date, userId?: string) {
  const data = await getReportData(companyId, from, to, userId);
  const rows = data.entries.map(e => ({ dato: e.date.toISOString().slice(0,10), ansatt: `${e.user.firstName} ${e.user.lastName}`, start: e.startTime.toISOString(), slutt: e.endTime.toISOString(), pauseMinutter: e.breakMinutes, timer: (e.totalMinutes/60).toFixed(2), status: e.status, stilling: e.user.position?.name ?? '', estimertLonn: e.user.hourlyRate ? ((e.totalMinutes/60) * Number(e.user.hourlyRate)).toFixed(2) : '' }));
  return new Parser({ fields: ['dato','ansatt','start','slutt','pauseMinutter','timer','status','stilling','estimertLonn'] }).parse(rows);
}

export async function createPdf(companyId: string, from: Date, to: Date, userId?: string) {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  const data = await getReportData(companyId, from, to, userId);
  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];
  doc.on('data', c => chunks.push(c));
  doc.fontSize(20).text('TimeTrack rapport');
  doc.fontSize(12).text(`${company.name} • ${from.toISOString().slice(0,10)} til ${to.toISOString().slice(0,10)}`);
  doc.moveDown().text(`Totalt: ${(data.totalMinutes/60).toFixed(2)} timer`);
  if (data.estimatedPay > 0) doc.text(`Estimert lønn: ${data.estimatedPay.toFixed(2)} kr`);
  doc.moveDown();
  data.entries.forEach(e => doc.fontSize(10).text(`${e.date.toISOString().slice(0,10)}  ${e.user.firstName} ${e.user.lastName}  ${(e.totalMinutes/60).toFixed(2)} t  ${e.status}`));
  doc.moveDown().fontSize(8).text('Merk: Compliance-kontroller er tekniske hjelperegler og må kvalitetssikres juridisk mot arbeidsmiljøloven/tariff/avtaler før de brukes som fasit.');
  doc.end();
  return new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));
}
