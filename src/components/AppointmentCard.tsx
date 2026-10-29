import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Appointment } from '@/types/routine';
import { getAppointmentStatus } from '@/engine/ProactiveEngine';
import { colors, spacing } from '@/theme/colors';
import { Pill } from '@/components/ui';
import { formatDate } from '@/utils/dates';

const statusLabels = { upcoming: 'Em breve', leave: 'Hora de sair', 'in-progress': 'Em andamento', finished: 'Finalizado' };

export function AppointmentCard({ appointment, onPress, showDate = false }: { appointment: Appointment; onPress: () => void; showDate?: boolean }) {
  const status = getAppointmentStatus(appointment);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Ver ${appointment.title}`} onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.time}><Text style={styles.timeText}>{appointment.startTime}</Text><View style={styles.timeDot} /></View>
      <View style={styles.content}>
        {showDate ? <Text style={styles.date}>{formatDate(appointment.date, { weekday: 'short', day: 'numeric', month: 'short' })}</Text> : null}
        <View style={styles.titleLine}><Text style={styles.title} numberOfLines={1}>{appointment.title}</Text><Text style={styles.chevron}>›</Text></View>
        {appointment.location ? <Text style={styles.location} numberOfLines={1}>{appointment.location}</Text> : null}
        <View style={styles.footer}><Pill label={statusLabels[status]} tone={status === 'leave' ? 'amber' : status === 'finished' ? 'neutral' : 'moss'} />{appointment.notificationId ? <Text style={styles.reminder}>◷ Aviso ativo</Text> : null}</View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 83, flexDirection: 'row', gap: spacing.md, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pressed: { opacity: 0.76 },
  time: { width: 54, alignItems: 'center', gap: 8, paddingTop: 2 },
  timeText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  timeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.moss },
  content: { flex: 1, gap: 5 },
  titleLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  title: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  chevron: { fontSize: 21, color: '#92948C', lineHeight: 22 },
  location: { color: colors.muted, fontSize: 12 },
  date: { color: colors.muted, fontSize: 11, textTransform: 'capitalize' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 2 },
  reminder: { fontSize: 11, color: colors.muted },
});
