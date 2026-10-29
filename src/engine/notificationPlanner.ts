import type { Appointment, Preferences, RoutineTask } from '../types/routine.ts';
import { getRecommendedDeparture, getTaskReminderDate, shouldScheduleAt } from './ProactiveEngine.ts';
import { combineLocalDateTime } from '../utils/dates.ts';

export interface LocalNotificationPort {
  schedule(input: { date: Date; title: string; body: string; key: string }): Promise<string>;
  cancel(id: string): Promise<void>;
}

export interface ScheduledAlert {
  notificationId?: string;
  notificationKey?: string;
}

export interface AlertRequest {
  date: Date | null;
  title: string;
  body: string;
  key: string;
  preferences: Preferences;
  keepDuringQuietHours: boolean;
  existingId?: string;
  existingKey?: string;
  now?: Date;
}

export async function reconcileAlert(port: LocalNotificationPort, request: AlertRequest): Promise<ScheduledAlert> {
  const now = request.now ?? new Date();
  const shouldSchedule = request.date !== null
    && shouldScheduleAt(request.date, now, request.preferences, request.keepDuringQuietHours);
  if (!shouldSchedule) {
    if (request.existingId) await port.cancel(request.existingId);
    return {};
  }
  if (request.existingId && request.existingKey === request.key) {
    return { notificationId: request.existingId, notificationKey: request.key };
  }
  if (request.existingId) await port.cancel(request.existingId);
  const notificationId = await port.schedule({
    date: request.date as Date,
    title: request.title,
    body: request.body,
    key: request.key,
  });
  return { notificationId, notificationKey: request.key };
}

export function planAppointmentAlert(appointment: Appointment, preferences: Preferences): AlertRequest {
  const date = getRecommendedDeparture(appointment);
  const start = combineLocalDateTime(appointment.date, appointment.startTime);
  const body = appointment.travelMinutes
    ? `Saída recomendada: ${date?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Deslocamento informado: ${appointment.travelMinutes} min.`
    : `Seu compromisso começa às ${appointment.startTime.replace(':', 'h')}.`;
  return {
    date: start ? date : null,
    title: 'Hora de se preparar',
    body,
    key: `appointment:${appointment.id}:${appointment.date}:${appointment.startTime}:${date?.getTime() ?? 'invalid'}:${appointment.travelMinutes ?? 0}:${appointment.safetyMarginMinutes}`,
    preferences,
    keepDuringQuietHours: appointment.keepDuringQuietHours,
    existingId: appointment.notificationId,
    existingKey: appointment.notificationKey,
  };
}

export function planTaskAlert(task: RoutineTask, preferences: Preferences): AlertRequest {
  const date = task.completed || task.reminderMinutes === undefined || task.reminderMinutes <= 0 ? null : getTaskReminderDate(task, preferences.dayStartTime);
  return {
    date,
    title: task.category === 'Contas' ? 'Conta a vencer' : task.kind === 'reminder' ? 'Lembrete' : 'Prazo se aproximando',
    body: task.title,
    key: `task:${task.id}:${task.title}:${task.category}:${task.dueDate ?? ''}:${task.dueTime ?? preferences.dayStartTime}:${task.reminderMinutes ?? 0}:${task.completed}`,
    preferences,
    keepDuringQuietHours: task.keepDuringQuietHours,
    existingId: task.notificationId,
    existingKey: task.notificationKey,
  };
}
