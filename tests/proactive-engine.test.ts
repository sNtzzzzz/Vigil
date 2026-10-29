import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findAppointmentConflicts,
  getDailySummary,
  getRecommendedDeparture,
  getTaskReminderDate,
  isInQuietHours,
  shouldScheduleAt,
} from '../src/engine/ProactiveEngine.ts';
import { planAppointmentAlert, planTaskAlert, reconcileAlert, type LocalNotificationPort } from '../src/engine/notificationPlanner.ts';
import { EMPTY_ROUTINE, type Appointment, type Preferences, type RoutineData, type RoutineTask } from '../src/types/routine.ts';
import { formatNotificationPermissionStatus } from '../src/utils/notificationPermissionStatus.ts';
import { validateAppointmentForm, validateTaskForm } from '../src/utils/validation.ts';

const preferences: Preferences = {
  displayName: '', dayStartTime: '08:00', defaultReminderMinutes: 15,
  defaultTravelBufferMinutes: 10, notificationsEnabled: true, quietHoursEnabled: false,
  quietStart: '22:00', quietEnd: '07:00',
};

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appointment-1', title: 'Consulta médica', date: '2026-10-27', startTime: '14:00',
    travelMinutes: 25, safetyMarginMinutes: 10, keepDuringQuietHours: false,
    ...overrides,
  };
}

function task(overrides: Partial<RoutineTask> = {}): RoutineTask {
  return {
    id: 'task-1', title: 'Pagar conta', kind: 'task', priority: 'high', category: 'Contas',
    dueDate: '2026-10-27', dueTime: '18:00', reminderMinutes: 60, keepDuringQuietHours: false,
    completed: false, ...overrides,
  };
}

test('calcula a saída subtraindo deslocamento e margem de segurança', () => {
  const departure = getRecommendedDeparture(appointment());
  assert.ok(departure);
  assert.equal(departure.getHours(), 13);
  assert.equal(departure.getMinutes(), 25);
});

test('encontra horários sobrepostos e não sinaliza compromissos encostados', () => {
  const first = appointment({ id: 'a', startTime: '10:00', endTime: '11:00' });
  const overlap = appointment({ id: 'b', startTime: '10:45', endTime: '11:30' });
  const next = appointment({ id: 'c', startTime: '11:00', endTime: '11:30' });
  const conflicts = findAppointmentConflicts([first, overlap]);
  assert.equal(conflicts.length, 1);
  assert.deepEqual([conflicts[0].first.id, conflicts[0].second.id], ['a', 'b']);
  assert.equal(findAppointmentConflicts([first, next]).length, 0);
});

test('cria o resumo diário com itens salvos, próxima consulta e prioridades', () => {
  const now = new Date(2026, 9, 27, 8, 0);
  const data: RoutineData = {
    appointments: [appointment({ startTime: '14:00', endTime: '14:30' })],
    tasks: [task(), task({ id: 'task-2', title: 'Ler capítulo', category: 'Estudos', priority: 'normal', dueDate: undefined })],
    preferences, hasSeenIntro: true,
  };
  const summary = getDailySummary(data, now);
  assert.equal(summary.appointmentCount, 1);
  assert.equal(summary.pendingTaskCount, 2);
  assert.equal(summary.nextAppointment?.id, 'appointment-1');
  assert.equal(summary.priorities[0].priority, 'high');
  assert.match(summary.attentionMessage, /14h00/);
});

test('retorna estado inicial vazio sem inventar compromissos ou tarefas', () => {
  const summary = getDailySummary(EMPTY_ROUTINE, new Date(2026, 9, 27, 8));
  assert.equal(summary.appointmentCount, 0);
  assert.equal(summary.pendingTaskCount, 0);
  assert.equal(summary.nextAppointment, undefined);
  assert.equal(summary.attentionMessage, 'Seu dia está livre por enquanto.');
});

test('calcula lembrete anterior ao prazo e identifica prazo vencido', () => {
  const reminder = getTaskReminderDate(task({ dueDate: '2026-10-28', dueTime: '12:00', reminderMinutes: 60 }));
  assert.ok(reminder);
  assert.equal(reminder.getDate(), 28);
  assert.equal(reminder.getHours(), 11);
  assert.equal(shouldScheduleAt(reminder, new Date(2026, 9, 28, 11, 1), preferences, false), false);
});

test('usa o início preferido do dia quando um prazo não tem horário definido', () => {
  const reminder = getTaskReminderDate(task({ dueDate: '2026-10-28', dueTime: undefined, reminderMinutes: 15 }), '08:30');
  assert.ok(reminder);
  assert.equal(reminder.getHours(), 8);
  assert.equal(reminder.getMinutes(), 15);
});

test('aplica período de silêncio noturno e opção individual para manter aviso', () => {
  assert.equal(isInQuietHours(new Date(2026, 9, 28, 23, 15), '22:00', '07:00'), true);
  const silentPreferences = { ...preferences, quietHoursEnabled: true };
  const target = new Date(2026, 9, 28, 23, 15);
  assert.equal(shouldScheduleAt(target, new Date(2026, 9, 28, 20), silentPreferences, false), false);
  assert.equal(shouldScheduleAt(target, new Date(2026, 9, 28, 20), silentPreferences, true), true);
});

test('não agenda lembretes quando a preferência geral está desativada', () => {
  assert.equal(shouldScheduleAt(new Date(2026, 9, 28, 9), new Date(2026, 9, 27, 9), { ...preferences, notificationsEnabled: false }, false), false);
});

test('recusa formulário de compromisso inválido e aceita valores essenciais válidos', () => {
  assert.equal(validateAppointmentForm({ title: ' ', date: '2026-10-27', startTime: '10:00' }), 'Informe um título para continuar.');
  assert.equal(validateAppointmentForm({ title: 'Consulta', date: '2026-02-30', startTime: '10:00' }), 'Confira a data e o horário do compromisso.');
  assert.equal(validateAppointmentForm({ title: 'Consulta', date: '2026-10-27', startTime: '10:00', endTime: '09:00' }), 'O horário de término deve ser depois do início.');
  assert.equal(validateAppointmentForm({ title: 'Consulta', date: '2026-10-27', startTime: '10:00', travelMinutes: '25' }), undefined);
});

test('permite tarefa sem prazo e valida prazo opcional', () => {
  assert.equal(validateTaskForm({ title: 'Ler capítulo' }), undefined);
  assert.equal(validateTaskForm({ title: 'Pagar conta', dueDate: 'inválida' }), 'Confira a data do prazo.');
  assert.equal(validateTaskForm({ title: 'Pagar conta', dueDate: '2026-10-27', dueTime: '27:00' }), 'Confira o horário do prazo.');
});

test('representa corretamente permissão de notificação ainda não solicitada ou negada', () => {
  assert.equal(formatNotificationPermissionStatus({ granted: false, provisional: false, status: 'undetermined', canAskAgain: true }), 'Ainda não solicitada');
  assert.equal(formatNotificationPermissionStatus({ granted: false, provisional: false, status: 'denied', canAskAgain: true }), 'Negadas');
  assert.equal(formatNotificationPermissionStatus({ granted: false, provisional: false, status: 'denied', canAskAgain: false }), 'Desativadas nas configurações do aparelho');
});

test('reutiliza o identificador da mesma regra e evita notificação duplicada', async () => {
  const scheduled: string[] = [];
  const canceled: string[] = [];
  const port: LocalNotificationPort = {
    schedule: async ({ key }) => { scheduled.push(key); return `native-${scheduled.length}`; },
    cancel: async (id) => { canceled.push(id); },
  };
  const request = planAppointmentAlert(appointment(), preferences);
  const first = await reconcileAlert(port, { ...request, now: new Date(2026, 9, 27, 10) });
  const second = await reconcileAlert(port, { ...request, existingId: first.notificationId, existingKey: first.notificationKey, now: new Date(2026, 9, 27, 10) });
  assert.equal(scheduled.length, 1);
  assert.deepEqual(second, first);
  assert.deepEqual(canceled, []);
});

test('reagenda após alteração e cancela alerta quando o prazo/item deixa de existir', async () => {
  const scheduled: Array<{ date: Date; key: string }> = [];
  const canceled: string[] = [];
  const port: LocalNotificationPort = {
    schedule: async ({ date, key }) => { scheduled.push({ date, key }); return `native-${scheduled.length}`; },
    cancel: async (id) => { canceled.push(id); },
  };
  const initial = planTaskAlert(task({ dueDate: '2026-10-28' }), preferences);
  const first = await reconcileAlert(port, { ...initial, now: new Date(2026, 9, 27, 8) });
  const changed = planTaskAlert(task({ dueDate: '2026-10-29', notificationId: first.notificationId, notificationKey: first.notificationKey }), preferences);
  const second = await reconcileAlert(port, { ...changed, now: new Date(2026, 9, 27, 8) });
  assert.deepEqual(canceled, [first.notificationId]);
  assert.equal(scheduled.length, 2);
  assert.equal(scheduled[1].date.getDate(), 29);
  const completed = planTaskAlert(task({ completed: true, notificationId: second.notificationId, notificationKey: second.notificationKey }), preferences);
  await reconcileAlert(port, { ...completed, now: new Date(2026, 9, 27, 8) });
  assert.equal(canceled.at(-1), second.notificationId);
});

test('recalcula e substitui o aviso quando o horário de um compromisso muda', async () => {
  const scheduled: Date[] = [];
  const canceled: string[] = [];
  const port: LocalNotificationPort = {
    schedule: async ({ date }) => { scheduled.push(date); return `event-${scheduled.length}`; },
    cancel: async (id) => { canceled.push(id); },
  };
  const firstPlan = planAppointmentAlert(appointment(), preferences);
  const first = await reconcileAlert(port, { ...firstPlan, now: new Date(2026, 9, 27, 10) });
  const changedPlan = planAppointmentAlert(appointment({
    startTime: '15:00', notificationId: first.notificationId, notificationKey: first.notificationKey,
  }), preferences);
  const changed = await reconcileAlert(port, { ...changedPlan, now: new Date(2026, 9, 27, 10) });
  assert.deepEqual(canceled, ['event-1']);
  assert.equal(scheduled.length, 2);
  assert.equal(scheduled[1].getHours(), 14);
  assert.equal(scheduled[1].getMinutes(), 25);
  assert.equal(changed.notificationId, 'event-2');
});
