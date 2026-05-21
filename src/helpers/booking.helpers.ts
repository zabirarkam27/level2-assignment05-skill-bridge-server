export function dayOfWeekFromDateString(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error("Invalid date format (YYYY-MM-DD)");
  }

  return new Date(y, m - 1, d).getDay();
}

export function buildSessionDateTime(date: string, startTime: string): Date {
  return new Date(`${date}T${startTime}:00`);
}