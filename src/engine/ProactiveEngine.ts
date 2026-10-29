import type { Appointment, RoutineTask, RoutineData } from '../types/routine.ts';
import { addMinutes, combineLocalDateTime, formatDate, localDateKey, minutesUntil } from '../utils/dates.ts';

export const DEFAULT_APPOINTMENT_DURATION_MINUTES = 60;

export interface AppointmentConflict {
  first: Appointment;
  second: Appointment;
}

export interface DailySummary {
  appointmentCount: number;
  pendingTaskCount: number;
  priorities: RoutineTask[];
  nextAppointment?: Appointment;
  conflictCount: number;
  attentionMessage: string;
}

export function getRecommendedDeparture(appointment: Appointment): Date | null {
  const start = combineLocalDateTime(appointment.date, appointment.startTime);
  if (!start) return null;
  return addMinutes(start, -(appointment.travelMinutes ?? 0) - appointment.safetyMarginMinutes);
}

export function findAppointmentConflicts(appointments: Appointment[]): AppointmentConflict[] {
  const ordered = [...appointments].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  const conflicts: AppointmentConflict[] = [];
  for (let index = 0; index < ordered.length; index += 1) {
    const first = ordered[index];
    const firstStart = combineLocalDateTime(first.date, first.startTime);
    if (!firstStart) continue;
    const firstEnd = combineLocalDateTime(first.date, first.endTime ?? addMinutes(firstStart, DEFAULT_APPOINTMENT_DURATION_MINUTES).toTimeString().slice(0, 5));
    if (!firstEnd) continue;
    for (let nextIndex = index + 1; nextIndex < ordered.length; nextIndex += 1) {
      const second = ordered[nextIndex];
      if (second.date !== first.date) break;
      const secondStart = combineLocalDateTime(second.date, second.startTime);
      if (!secondStart || secondStart >= firstEnd) break;
      const secondEnd = combineLocalDateTime(second.date, second.endTime ?? addMinutes(secondStart, DEFAULT_APPOINTMENT_DURATION_MINUTES).toTimeString().slice(0, 5));
      if (secondEnd && firstStart < secondEnd && secondStart < firstEnd) conflicts.push({ first, second });
    }
  }
  return conflicts;
}

export function isInQuietHours(date: Date, start: string, end: string): boolean {
  const toMinute = (value: string): number => {
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
  };
  const current = date.getHours() * 60 + date.getMinutes();
  const quietStart = toMinute(start);
  const quietEnd = toMinute(end);
  if (quietStart === quietEnd) return true;
  return quietStart < quietEnd
    ? current >= quietStart && current < quietEnd
    : current >= quietStart || current < quietEnd;
}

export function shouldScheduleAt(
  target: Date,
  now: Date,
  preferences: RoutineData['preferences'],
  keepDuringQuietHours: boolean,
): boolean {
  if (!preferences.notificationsEnabled || target <= now) return false;
  if (preferences.quietHoursEnabled && !keepDuringQuietHours && isInQuietHours(target, preferences.quietStart, preferences.quietEnd)) return false;
  return true;
}

export function getTaskReminderDate(task: RoutineTask, defaultTime = '09:00'): Date | null {
  if (!task.dueDate) return null;
  const dueAt = combineLocalDateTime(task.dueDate, task.dueTime ?? defaultTime);
  if (!dueAt) return null;
  return addMinutes(dueAt, -(task.reminderMinutes ?? 0));
}

export function getDailySummary(data: RoutineData, now = new Date()): DailySummary {
  const today = localDateKey(now);
  const todaysAppointments = data.appointments
    .filter((item) => item.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const nextAppointment = data.appointments
    .filter((item) => {
      const start = combineLocalDateTime(item.date, item.startTime);
      const end = start ? combineLocalDateTime(item.date, item.endTime ?? addMinutes(start, DEFAULT_APPOINTMENT_DURATION_MINUTES).toTimeString().slice(0, 5)) : null;
      return start !== null && (start >= now || (end !== null && now < end));
    })
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0];
  const pending = data.tasks.filter((item) => !item.completed && (!item.dueDate || item.dueDate <= today));
  const priorities = [...pending].sort((a, b) => {
    const weight = { high: 0, normal: 1, low: 2 } as const;
    return weight[a.priority] - weight[b.priority] || (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99');
  }).slice(0, 3);
  const conflicts = findAppointmentConflicts(data.appointments.filter((item) => item.date === today));
  let attentionMessage = 'Seu dia está livre por enquanto.';
  if (conflicts.length > 0) attentionMessage = 'Você tem compromissos com horários sobrepostos.';
  else if (nextAppointment) {
    const start = combineLocalDateTime(nextAppointment.date, nextAppointment.startTime);
    const until = start ? minutesUntil(start, now) : Infinity;
    if (until <= 0) attentionMessage = `Seu compromisso “${nextAppointment.title}” é agora.`;
    else if (until <= 60) attentionMessage = `Seu próximo compromisso começa ${until <= 1 ? 'em instantes' : `em ${until} minutos`}.`;
    else if (nextAppointment.date !== today) attentionMessage = `Seu próximo compromisso é ${formatDate(nextAppointment.date, { weekday: 'long' })} às ${nextAppointment.startTime.replace(':', 'h')}.`;
    else attentionMessage = `Seu próximo compromisso é às ${nextAppointment.startTime.replace(':', 'h')}.`;
  } else if (pending.length > 0) attentionMessage = `Você tem ${pending.length} ${pending.length === 1 ? 'tarefa pendente' : 'tarefas pendentes'} para organizar.`;
  else if (todaysAppointments.length > 0) attentionMessage = 'Seus compromissos de hoje já passaram.';
  return {
    appointmentCount: todaysAppointments.length,
    pendingTaskCount: pending.length,
    priorities,
    nextAppointment,
    conflictCount: conflicts.length,
    attentionMessage,
  };
}

export function getAppointmentStatus(appointment: Appointment, now = new Date()): 'upcoming' | 'leave' | 'in-progress' | 'finished' {
  const start = combineLocalDateTime(appointment.date, appointment.startTime);
  if (!start) return 'upcoming';
  const end = combineLocalDateTime(appointment.date, appointment.endTime ?? addMinutes(start, DEFAULT_APPOINTMENT_DURATION_MINUTES).toTimeString().slice(0, 5));
  if (end && now >= end) return 'finished';
  const departure = getRecommendedDeparture(appointment);
  if (now >= start) return 'in-progress';
  if (departure && now >= departure) return 'leave';
  return 'upcoming';
}
