import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_ROUTINE, type Appointment, type RoutineTask } from '../src/types/routine.ts';
import { RoutineRepository, deleteAppointment, deleteTask, upsertAppointment, upsertTask, type KeyValueStorage } from '../src/storage/routineRepository.ts';

class MemoryStorage implements KeyValueStorage {
  private values = new Map<string, string>();
  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { this.values.set(key, value); }
  async removeItem(key: string) { this.values.delete(key); }
}

function sampleAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return { id: 'a1', title: 'Consulta', date: '2026-10-27', startTime: '14:00', safetyMarginMinutes: 10, keepDuringQuietHours: false, ...overrides };
}

function sampleTask(overrides: Partial<RoutineTask> = {}): RoutineTask {
  return { id: 't1', title: 'Estudar', kind: 'task', priority: 'normal', category: 'Estudos', keepDuringQuietHours: false, completed: false, ...overrides };
}

test('cria, edita e exclui compromissos sem duplicar o mesmo identificador', () => {
  const created = upsertAppointment(EMPTY_ROUTINE, sampleAppointment());
  const edited = upsertAppointment(created, sampleAppointment({ title: 'Consulta alterada', startTime: '15:00' }));
  assert.equal(edited.appointments.length, 1);
  assert.equal(edited.appointments[0].title, 'Consulta alterada');
  assert.equal(edited.appointments[0].startTime, '15:00');
  assert.equal(deleteAppointment(edited, 'a1').appointments.length, 0);
});

test('persiste tarefas e preferências entre leitura e nova instância do repositório', async () => {
  const storage = new MemoryStorage();
  const repository = new RoutineRepository(storage, 'test');
  const saved = await repository.update((data) => ({
    ...upsertTask(data, sampleTask({ reminderMinutes: 30, dueDate: '2026-10-30' })),
    preferences: { ...data.preferences, notificationsEnabled: true, displayName: 'Bia' },
  }));
  assert.equal(saved.tasks[0].reminderMinutes, 30);
  const reopened = await new RoutineRepository(storage, 'test').load();
  assert.equal(reopened.tasks[0].dueDate, '2026-10-30');
  assert.equal(reopened.preferences.notificationsEnabled, true);
  assert.equal(reopened.preferences.displayName, 'Bia');
});

test('altera estado concluído e remove tarefa persistida', async () => {
  const storage = new MemoryStorage();
  const repository = new RoutineRepository(storage, 'test');
  await repository.update((data) => upsertTask(data, sampleTask()));
  await repository.update((data) => upsertTask(data, sampleTask({ completed: true, completedAt: '2026-10-27T12:00:00.000Z' })));
  assert.equal((await repository.load()).tasks[0].completed, true);
  await repository.update((data) => deleteTask(data, 't1'));
  assert.equal((await repository.load()).tasks.length, 0);
});

test('recupera vazio com segurança quando o conteúdo persistido está corrompido', async () => {
  const storage = new MemoryStorage();
  await storage.setItem('test', '{inválido');
  const loaded = await new RoutineRepository(storage, 'test').load();
  assert.deepEqual(loaded, EMPTY_ROUTINE);
});
