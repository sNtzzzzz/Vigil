import { EMPTY_ROUTINE, type Preferences, type RoutineData } from '../types/routine.ts';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const STORAGE_KEY = 'assistente-rotina:data:v1';

function isRoutineData(value: unknown): value is RoutineData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RoutineData>;
  const preferences = candidate.preferences as Partial<Preferences> | undefined;
  return Array.isArray(candidate.appointments)
    && Array.isArray(candidate.tasks)
    && !!preferences
    && typeof preferences.displayName === 'string'
    && typeof preferences.dayStartTime === 'string'
    && typeof preferences.defaultReminderMinutes === 'number'
    && typeof preferences.defaultTravelBufferMinutes === 'number'
    && typeof preferences.notificationsEnabled === 'boolean'
    && typeof preferences.quietHoursEnabled === 'boolean'
    && typeof preferences.quietStart === 'string'
    && typeof preferences.quietEnd === 'string'
    && candidate.appointments.every((item) => !!item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.date === 'string' && typeof item.startTime === 'string')
    && candidate.tasks.every((item) => !!item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.completed === 'boolean')
    && typeof candidate.hasSeenIntro === 'boolean';
}

export class RoutineRepository {
  private queue: Promise<void> = Promise.resolve();
  private readonly storage: KeyValueStorage;
  private readonly key: string;
  lastError = false;

  constructor(storage: KeyValueStorage, key = STORAGE_KEY) {
    this.storage = storage;
    this.key = key;
  }

  async load(): Promise<RoutineData> {
    try {
      const raw = await this.storage.getItem(this.key);
      if (!raw) { this.lastError = false; return emptyRoutine(); }
      const parsed: unknown = JSON.parse(raw);
      if (!isRoutineData(parsed)) throw new Error('Formato de dados inválido.');
      this.lastError = false;
      return parsed;
    } catch {
      this.lastError = true;
      return emptyRoutine();
    }
  }

  async save(data: RoutineData): Promise<void> {
    const write = this.queue.then(() => this.storage.setItem(this.key, JSON.stringify(data)));
    this.queue = write.catch(() => undefined);
    return write;
  }

  async update(transform: (current: RoutineData) => RoutineData): Promise<RoutineData> {
    let result = emptyRoutine();
    const operation = this.queue.then(async () => {
      const raw = await this.storage.getItem(this.key);
      let current = emptyRoutine();
      if (raw) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (isRoutineData(parsed)) current = parsed;
        } catch {
          current = emptyRoutine();
        }
      }
      result = transform(current);
      await this.storage.setItem(this.key, JSON.stringify(result));
    });
    this.queue = operation.catch(() => undefined);
    await operation;
    return result;
  }

  async clear(): Promise<void> {
    const operation = this.queue.then(() => this.storage.removeItem(this.key));
    this.queue = operation.catch(() => undefined);
    return operation;
  }
}

function emptyRoutine(): RoutineData {
  return {
    ...EMPTY_ROUTINE,
    appointments: [],
    tasks: [],
    preferences: { ...EMPTY_ROUTINE.preferences },
  };
}

export function upsertAppointment(data: RoutineData, appointment: RoutineData['appointments'][number]): RoutineData {
  const exists = data.appointments.some((item) => item.id === appointment.id);
  return {
    ...data,
    appointments: exists
      ? data.appointments.map((item) => item.id === appointment.id ? appointment : item)
      : [...data.appointments, appointment],
  };
}

export function deleteAppointment(data: RoutineData, id: string): RoutineData {
  return { ...data, appointments: data.appointments.filter((item) => item.id !== id) };
}

export function upsertTask(data: RoutineData, task: RoutineData['tasks'][number]): RoutineData {
  const exists = data.tasks.some((item) => item.id === task.id);
  return {
    ...data,
    tasks: exists ? data.tasks.map((item) => item.id === task.id ? task : item) : [...data.tasks, task],
  };
}

export function deleteTask(data: RoutineData, id: string): RoutineData {
  return { ...data, tasks: data.tasks.filter((item) => item.id !== id) };
}
