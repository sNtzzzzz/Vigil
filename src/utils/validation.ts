import { isValidDateKey, isValidTime } from './dates.ts';

export interface AppointmentFormValues {
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  travelMinutes?: string;
}

export interface TaskFormValues {
  title: string;
  dueDate?: string;
  dueTime?: string;
}

export function validateAppointmentForm(values: AppointmentFormValues): string | undefined {
  if (!values.title.trim()) return 'Informe um título para continuar.';
  if (!isValidDateKey(values.date) || !isValidTime(values.startTime)) return 'Confira a data e o horário do compromisso.';
  if (values.endTime && (!isValidTime(values.endTime) || values.endTime <= values.startTime)) return 'O horário de término deve ser depois do início.';
  if (values.travelMinutes) {
    const travel = Number(values.travelMinutes);
    if (!Number.isFinite(travel) || travel < 0 || travel > 1440) return 'O deslocamento deve estar entre 0 e 1.440 minutos.';
  }
  return undefined;
}

export function validateTaskForm(values: TaskFormValues): string | undefined {
  if (!values.title.trim()) return 'Informe um título para continuar.';
  if (values.dueDate && !isValidDateKey(values.dueDate)) return 'Confira a data do prazo.';
  if (values.dueTime && !isValidTime(values.dueTime)) return 'Confira o horário do prazo.';
  return undefined;
}
