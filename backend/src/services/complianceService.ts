import type { TimeEntry, User, WorkRules, ComplianceAlert } from '@prisma/client';
import { prisma } from '../db.js';
import { calculateTotalMinutes, endOfWeekMonday, hoursToMinutes, isUnder18, minutesBetween, startOfWeekMonday, touchesNightHours } from '../utils/time.js';

type AlertInput = Pick<ComplianceAlert, 'alertType'|'message'|'severity'> & { userId: string; timeEntryId?: string };

export async function totalMinutesForUser(user: Pick<User, 'paidBreakDefault'>, start: Date, end: Date, breakMinutes: number) {
  return calculateTotalMinutes(start, end, breakMinutes, user.paidBreakDefault);
}

export async function evaluateEntry(entry: TimeEntry, user: User, rules: WorkRules): Promise<AlertInput[]> {
  const alerts: AlertInput[] = [];
  const dailyLimit = isUnder18(user.birthDate, entry.date) ? rules.maxDailyHoursUnder18 : rules.maxDailyHours;
  if (entry.totalMinutes > hoursToMinutes(dailyLimit)) alerts.push({ userId: user.id, timeEntryId: entry.id, alertType: 'MAX_DAG', severity: 'VIOLATION', message: `Dagen er over grensen på ${dailyLimit.toString()} timer.` });
  if (entry.totalMinutes > hoursToMinutes(rules.overtimeThresholdDaily)) alerts.push({ userId: user.id, timeEntryId: entry.id, alertType: 'OVERTID_DAG', severity: 'WARNING', message: `Dagen er over overtidsterskel på ${rules.overtimeThresholdDaily.toString()} timer.` });
  if (touchesNightHours(entry.startTime, entry.endTime, rules.nightShiftStartHour, rules.nightShiftEndHour)) alerts.push({ userId: user.id, timeEntryId: entry.id, alertType: 'NATTARBEID', severity: 'WARNING', message: 'Vakten berører definert nattarbeidstid.' });

  const weekStart = startOfWeekMonday(entry.date); const weekEnd = endOfWeekMonday(entry.date);
  const weekEntries = await prisma.timeEntry.findMany({ where: { userId: user.id, date: { gte: weekStart, lt: weekEnd }, id: { not: entry.id } } });
  const weeklyMinutes = weekEntries.reduce((s, e) => s + e.totalMinutes, entry.totalMinutes);
  const weeklyLimit = isUnder18(user.birthDate, entry.date) ? rules.maxWeeklyHoursUnder18 : rules.maxWeeklyHours;
  if (weeklyMinutes > hoursToMinutes(weeklyLimit)) alerts.push({ userId: user.id, timeEntryId: entry.id, alertType: 'MAX_UKE', severity: 'VIOLATION', message: `Uken er over grensen på ${weeklyLimit.toString()} timer.` });
  if (weeklyMinutes > hoursToMinutes(rules.overtimeThresholdWeekly)) alerts.push({ userId: user.id, timeEntryId: entry.id, alertType: 'OVERTID_UKE', severity: 'WARNING', message: `Uken er over overtidsterskel på ${rules.overtimeThresholdWeekly.toString()} timer.` });
  const weeklyOvertime = Math.max(0, weeklyMinutes - hoursToMinutes(rules.overtimeThresholdWeekly));
  if (weeklyOvertime > hoursToMinutes(rules.maxOvertimePerWeek)) alerts.push({ userId: user.id, timeEntryId: entry.id, alertType: 'OVERTID_MAKS_UKE', severity: 'VIOLATION', message: `Overtid denne uken er over ${rules.maxOvertimePerWeek.toString()} timer.` });

  const previous = await prisma.timeEntry.findFirst({ where: { userId: user.id, endTime: { lt: entry.startTime } }, orderBy: { endTime: 'desc' } });
  if (previous) {
    const restMinutes = minutesBetween(previous.endTime, entry.startTime);
    if (restMinutes < hoursToMinutes(rules.minRestHoursBetweenShifts)) alerts.push({ userId: user.id, timeEntryId: entry.id, alertType: 'HVILE_MELLOM_VAKTER', severity: 'VIOLATION', message: `Hvile mellom vakter er under ${rules.minRestHoursBetweenShifts.toString()} timer.` });
  }
  return alerts;
}

export async function createAlertsForEntry(entryId: string) {
  const entry = await prisma.timeEntry.findUniqueOrThrow({ where: { id: entryId } });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: entry.userId } });
  const rules = await prisma.workRules.findUniqueOrThrow({ where: { companyId: entry.companyId } });
  const alerts = await evaluateEntry(entry, user, rules);
  if (alerts.length) await prisma.complianceAlert.createMany({ data: alerts });
  return alerts;
}
