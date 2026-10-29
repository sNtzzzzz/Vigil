export type Priority = 'high' | 'normal' | 'low';
export type Category = 'Pessoal' | 'Trabalho' | 'Estudos' | 'Saúde' | 'Contas';
export type TaskKind = 'task' | 'reminder';

export interface Appointment {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  location?: string;
  travelMinutes?: number;
  safetyMarginMinutes: number;
  notes?: string;
  keepDuringQuietHours: boolean;
  notificationId?: string;
  notificationKey?: string;
}

export interface RoutineTask {
  id: string;
  title: string;
  kind: TaskKind;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority: Priority;
  category: Category;
  reminderMinutes?: number;
  keepDuringQuietHours: boolean;
  completed: boolean;
  completedAt?: string;
  notificationId?: string;
  notificationKey?: string;
}

export interface Preferences {
  displayName: string;
  dayStartTime: string;
  defaultReminderMinutes: number;
  defaultTravelBufferMinutes: number;
  notificationsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
}

export interface RoutineData {
  appointments: Appointment[];
  tasks: RoutineTask[];
  preferences: Preferences;
  hasSeenIntro: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  displayName: '',
  dayStartTime: '08:00',
  defaultReminderMinutes: 15,
  defaultTravelBufferMinutes: 10,
  notificationsEnabled: false,
  quietHoursEnabled: false,
  quietStart: '22:00',
  quietEnd: '07:00',
};

export const EMPTY_ROUTINE: RoutineData = {
  appointments: [],
  tasks: [],
  preferences: DEFAULT_PREFERENCES,
  hasSeenIntro: false,
};
