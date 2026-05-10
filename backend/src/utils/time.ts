export function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}
export function calculateTotalMinutes(start: Date, end: Date, breakMinutes: number, paidBreak: boolean): number {
  const gross = minutesBetween(start, end);
  return paidBreak ? gross : Math.max(0, gross - Math.max(0, breakMinutes));
}
export function hoursToMinutes(value: number | string | { toString(): string }): number {
  return Math.round(Number(value.toString()) * 60);
}
export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date); d.setHours(0,0,0,0);
  const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff); return d;
}
export function endOfWeekMonday(date: Date): Date {
  const d = startOfWeekMonday(date); d.setDate(d.getDate() + 7); return d;
}
export function isUnder18(birthDate?: Date | null, at = new Date()): boolean {
  if (!birthDate) return false;
  const eighteen = new Date(birthDate); eighteen.setFullYear(eighteen.getFullYear() + 18);
  return eighteen > at;
}
export function touchesNightHours(start: Date, end: Date, nightStart: number, nightEnd: number): boolean {
  const cursor = new Date(start);
  while (cursor < end) {
    const h = cursor.getHours();
    if (nightStart > nightEnd ? h >= nightStart || h < nightEnd : h >= nightStart && h < nightEnd) return true;
    cursor.setMinutes(cursor.getMinutes() + 30);
  }
  return false;
}
