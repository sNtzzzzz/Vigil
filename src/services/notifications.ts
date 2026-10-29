import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';
import type { Appointment, Preferences, RoutineTask } from '@/types/routine';
import { planAppointmentAlert, planTaskAlert, reconcileAlert } from '@/engine/notificationPlanner';
import { formatNotificationPermissionStatus } from '@/utils/notificationPermissionStatus';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function configureNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rotina', {
      name: 'Lembretes da rotina',
      importance: AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#53633C',
    });
  }
}

export async function getNotificationPermissionLabel(): Promise<string> {
  try {
    const permission = await Notifications.getPermissionsAsync();
    return formatNotificationPermissionStatus({
      granted: permission.granted,
      provisional: permission.ios?.status === IosAuthorizationStatus.PROVISIONAL,
      status: permission.status,
      canAskAgain: permission.canAskAgain,
    });
  } catch {
    return 'Indisponível neste ambiente';
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  await configureNotificationChannel();
  const current = await Notifications.getPermissionsAsync();
  const response = current.granted ? current : await Notifications.requestPermissionsAsync();
  return response.granted || response.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

export async function hasNotificationPermission(): Promise<boolean> {
  try {
    const response = await Notifications.getPermissionsAsync();
    return response.granted || response.ios?.status === IosAuthorizationStatus.PROVISIONAL;
  } catch { return false; }
}

export async function scheduleAppointmentNotification(
  appointment: Appointment,
  preferences: Preferences,
): Promise<{ notificationId?: string; notificationKey?: string }> {
  return reconcileAlert({
    schedule: ({ date, title, body, key }) => Notifications.scheduleNotificationAsync({
      content: { title, body, data: { notificationKey: key }, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        ...(Platform.OS === 'android' ? { channelId: 'rotina' } : {}),
      },
    }),
    cancel: (id) => Notifications.cancelScheduledNotificationAsync(id),
  }, planAppointmentAlert(appointment, preferences));
}

export async function scheduleTaskNotification(
  task: RoutineTask,
  preferences: Preferences,
): Promise<{ notificationId?: string; notificationKey?: string }> {
  return reconcileAlert({
    schedule: ({ date, title, body, key }) => Notifications.scheduleNotificationAsync({
      content: { title, body, data: { notificationKey: key }, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        ...(Platform.OS === 'android' ? { channelId: 'rotina' } : {}),
      },
    }),
    cancel: (id) => Notifications.cancelScheduledNotificationAsync(id),
  }, planTaskAlert(task, preferences));
}

export async function cancelNotification(notificationId?: string): Promise<void> {
  if (notificationId) await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function sendTestNotification(): Promise<void> {
  if (!(await requestNotificationPermission())) throw new Error('A permissão de notificações não foi concedida.');
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Lembrete de teste', body: 'As notificações locais estão funcionando.', sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
  });
}
