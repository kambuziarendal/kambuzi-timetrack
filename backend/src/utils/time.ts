export function clockToMinutes(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    throw Object.assign(new Error("Ugyldig klokkeslett."), { status: 400 });
  const [hours, minutes] = value.split(":").map(Number);
  return hours! * 60 + minutes!;
}
export function calculateEntry(
  start: string,
  end: string,
  breakMinutes: number,
) {
  const startMinutes = clockToMinutes(start);
  const endMinutes = clockToMinutes(end);
  const crossesMidnight = endMinutes <= startMinutes;
  const elapsed = endMinutes + (crossesMidnight ? 1440 : 0) - startMinutes;
  if (elapsed > 18 * 60)
    throw Object.assign(
      new Error("En vakt kan ikke være lengre enn 18 timer."),
      { status: 400 },
    );
  if (breakMinutes < 0 || breakMinutes >= elapsed)
    throw Object.assign(new Error("Pausen må være kortere enn vakten."), {
      status: 400,
    });
  return {
    startMinutes,
    endMinutes,
    crossesMidnight,
    totalMinutes: elapsed - breakMinutes,
  };
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}
export function todayInTimezone(timezone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
