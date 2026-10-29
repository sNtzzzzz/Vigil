export interface NotificationPermissionSnapshot {
  granted: boolean;
  provisional: boolean;
  status: 'undetermined' | 'granted' | 'denied';
  canAskAgain: boolean;
}

export function formatNotificationPermissionStatus(permission: NotificationPermissionSnapshot): string {
  if (permission.granted || permission.provisional) return 'Permitidas';
  if (permission.status === 'undetermined') return 'Ainda não solicitada';
  return permission.canAskAgain ? 'Negadas' : 'Desativadas nas configurações do aparelho';
}
