export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function combineLocalDateTime(dateKey: string, time: string): Date | null {
  const dateParts = dateKey.split('-').map(Number);
  const timeParts = time.split(':').map(Number);
  if (dateParts.length !== 3 || timeParts.length !== 2 || [...dateParts, ...timeParts].some(Number.isNaN)) return null;
  const [year, month, day] = dateParts;
  const [hour, minute] = timeParts;
  const result = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (result.getFullYear() !== year || result.getMonth() !== month - 1 || result.getDate() !== day || result.getHours() !== hour || result.getMinutes() !== minute) return null;
  return result;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function formatTime(time: string): string {
  return time.replace(/^0/, '').replace(':', 'h');
}

export function formatDate(dateKey: string, options?: Intl.DateTimeFormatOptions): string {
  const date = combineLocalDateTime(dateKey, '12:00');
  if (!date) return dateKey;
  return new Intl.DateTimeFormat('pt-BR', options ?? { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}

export function minutesUntil(target: Date, now: Date): number {
  return Math.round((target.getTime() - now.getTime()) / 60_000);
}

export function isValidDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && combineLocalDateTime(value, '12:00') !== null;
}

export function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}
