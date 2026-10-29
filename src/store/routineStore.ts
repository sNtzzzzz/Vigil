import { create } from 'zustand';
import { cancelNotification, configureNotificationChannel, hasNotificationPermission, requestNotificationPermission, scheduleAppointmentNotification, scheduleTaskNotification } from '@/services/notifications';
import { EMPTY_ROUTINE, type Appointment, type Preferences, type RoutineData, type RoutineTask } from '@/types/routine';
import { routineRepository } from '@/storage/asyncStorage';
import { deleteAppointment, deleteTask, upsertAppointment, upsertTask } from '@/storage/routineRepository';

interface RoutineState extends RoutineData {
  hydrated: boolean;
  storageError?: string;
  initialize: () => Promise<void>;
  saveAppointment: (item: Appointment) => Promise<void>;
  removeAppointment: (id: string) => Promise<void>;
  saveTask: (item: RoutineTask) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  savePreferences: (value: Preferences) => Promise<boolean>;
  markIntroSeen: () => Promise<void>;
  rescheduleAll: () => Promise<void>;
  clearAll: () => Promise<void>;
}

async function saveNotificationId(
  kind: 'appointment' | 'task',
  id: string,
  notification: { notificationId?: string; notificationKey?: string },
): Promise<void> {
  await routineRepository.update((data) => {
    if (kind === 'appointment') return {
      ...data,
      appointments: data.appointments.map((item) => item.id === id
        ? { ...item, notificationId: notification.notificationId, notificationKey: notification.notificationKey }
        : item),
    };
    return {
      ...data,
      tasks: data.tasks.map((item) => item.id === id
        ? { ...item, notificationId: notification.notificationId, notificationKey: notification.notificationKey }
        : item),
    };
  });
  const data = await routineRepository.load();
  if (kind === 'appointment') useRoutineStore.setState({ appointments: data.appointments });
  else useRoutineStore.setState({ tasks: data.tasks });
}

async function syncAppointment(item: Appointment, preferences: Preferences): Promise<void> {
  try {
    const notification = await scheduleAppointmentNotification(item, preferences);
    await saveNotificationId('appointment', item.id, notification);
  } catch {
    await saveNotificationId('appointment', item.id, {});
  }
}

async function syncTask(item: RoutineTask, preferences: Preferences): Promise<void> {
  try {
    const notification = await scheduleTaskNotification(item, preferences);
    await saveNotificationId('task', item.id, notification);
  } catch {
    await saveNotificationId('task', item.id, {});
  }
}

export const useRoutineStore = create<RoutineState>((set, get) => ({
  ...EMPTY_ROUTINE,
  hydrated: false,

  initialize: async () => {
    try {
      await configureNotificationChannel();
      const data = await routineRepository.load();
      set({ ...data, hydrated: true, storageError: routineRepository.lastError ? 'Não foi possível ler os dados salvos. Confira o armazenamento do aparelho.' : undefined });
      if (data.preferences.notificationsEnabled) {
        const permissionAllowed = await hasNotificationPermission();
        if (permissionAllowed) await get().rescheduleAll();
        else await get().savePreferences({ ...data.preferences, notificationsEnabled: false });
      }
    } catch {
      set({ ...EMPTY_ROUTINE, hydrated: true, storageError: 'Não foi possível carregar seus dados. Você ainda pode continuar e tentar novamente mais tarde.' });
    }
  },

  saveAppointment: async (item) => {
    try {
      const next = await routineRepository.update((data) => upsertAppointment(data, item));
      set({ ...next, hydrated: true, storageError: undefined });
      await syncAppointment(next.appointments.find((event) => event.id === item.id) ?? item, next.preferences);
    } catch {
      set({ storageError: 'Não foi possível salvar o compromisso. Confira o espaço disponível no aparelho.' });
      throw new Error('Falha ao salvar compromisso.');
    }
  },

  removeAppointment: async (id) => {
    const current = get().appointments.find((item) => item.id === id);
    try {
      const next = await routineRepository.update((data) => deleteAppointment(data, id));
      set({ ...next, hydrated: true, storageError: undefined });
      await cancelNotification(current?.notificationId).catch(() => undefined);
    } catch {
      set({ storageError: 'Não foi possível excluir o compromisso.' });
      throw new Error('Falha ao excluir compromisso.');
    }
  },

  saveTask: async (item) => {
    try {
      const next = await routineRepository.update((data) => upsertTask(data, item));
      set({ ...next, hydrated: true, storageError: undefined });
      await syncTask(next.tasks.find((task) => task.id === item.id) ?? item, next.preferences);
    } catch {
      set({ storageError: 'Não foi possível salvar a tarefa. Confira o espaço disponível no aparelho.' });
      throw new Error('Falha ao salvar tarefa.');
    }
  },

  removeTask: async (id) => {
    const current = get().tasks.find((item) => item.id === id);
    try {
      const next = await routineRepository.update((data) => deleteTask(data, id));
      set({ ...next, hydrated: true, storageError: undefined });
      await cancelNotification(current?.notificationId).catch(() => undefined);
    } catch {
      set({ storageError: 'Não foi possível excluir a tarefa.' });
      throw new Error('Falha ao excluir tarefa.');
    }
  },

  toggleTask: async (id) => {
    const current = get().tasks.find((item) => item.id === id);
    if (!current) return;
    const task: RoutineTask = {
      ...current,
      completed: !current.completed,
      completedAt: current.completed ? undefined : new Date().toISOString(),
      notificationId: current.notificationId,
    };
    await get().saveTask(task);
  },

  savePreferences: async (value) => {
    const previous = get().preferences;
    let allowed = true;
    if (value.notificationsEnabled && !previous.notificationsEnabled) {
      allowed = await requestNotificationPermission();
      if (!allowed) value = { ...value, notificationsEnabled: false };
    }
    const next = await routineRepository.update((data) => ({ ...data, preferences: value }));
    set({ ...next, hydrated: true, storageError: undefined });
    if (!value.notificationsEnabled) {
      await Promise.all([
        ...next.appointments.map((item) => cancelNotification(item.notificationId).catch(() => undefined)),
        ...next.tasks.map((item) => cancelNotification(item.notificationId).catch(() => undefined)),
      ]);
      await routineRepository.update((data) => ({
        ...data,
        appointments: data.appointments.map((item) => ({ ...item, notificationId: undefined, notificationKey: undefined })),
        tasks: data.tasks.map((item) => ({ ...item, notificationId: undefined, notificationKey: undefined })),
      }));
      set(await routineRepository.load());
    } else if (value.notificationsEnabled) {
      await get().rescheduleAll();
    }
    return allowed;
  },

  markIntroSeen: async () => {
    const next = await routineRepository.update((data) => ({ ...data, hasSeenIntro: true }));
    set({ ...next, hydrated: true });
  },

  rescheduleAll: async () => {
    const { appointments, tasks, preferences } = get();
    if (!preferences.notificationsEnabled) return;
    await Promise.all([
      ...appointments.map((item) => syncAppointment(item, preferences)),
      ...tasks.map((item) => syncTask(item, preferences)),
    ]);
  },

  clearAll: async () => {
    const current = get();
    await Promise.all([
      ...current.appointments.map((item) => cancelNotification(item.notificationId).catch(() => undefined)),
      ...current.tasks.map((item) => cancelNotification(item.notificationId).catch(() => undefined)),
    ]);
    await routineRepository.clear();
    set({ ...EMPTY_ROUTINE, hydrated: true, storageError: undefined });
  },
}));
