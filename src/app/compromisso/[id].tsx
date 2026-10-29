import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, PageHeading, Pill, PrimaryButton, Screen, SecondaryButton, sharedStyles } from '@/components/ui';
import { getAppointmentStatus, getRecommendedDeparture } from '@/engine/ProactiveEngine';
import { useRoutineStore } from '@/store/routineStore';
import { colors, spacing } from '@/theme/colors';
import { formatDate, formatTime } from '@/utils/dates';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useRoutineStore((state) => state.hydrated);
  const appointment = useRoutineStore((state) => state.appointments.find((item) => item.id === id));
  const removeAppointment = useRoutineStore((state) => state.removeAppointment);
  const [openingRoute, setOpeningRoute] = useState(false);
  useEffect(() => { if (hydrated && !appointment) router.replace('/agenda'); }, [hydrated, appointment, router]);
  if (!hydrated || !appointment) return null;

  const departure = getRecommendedDeparture(appointment);
  const departureText = departure ? departure.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined;
  const status = getAppointmentStatus(appointment);
  const statusLabel = status === 'leave' ? 'Hora de sair' : status === 'in-progress' ? 'Em andamento' : status === 'finished' ? 'Finalizado' : 'Em breve';
  const openRoute = async () => {
    if (!appointment.location?.trim()) {
      Alert.alert('Local não informado', 'Adicione um endereço ou local ao compromisso para abrir uma rota.');
      return;
    }
    setOpeningRoute(true);
    try {
      const destination = encodeURIComponent(appointment.location.trim());
      const url = `https://www.google.com/maps/search/?api=1&query=${destination}`;
      await Linking.openURL(url);
    } catch {
      Alert.alert('Não foi possível abrir o mapa', 'Tente novamente ou copie o endereço para seu aplicativo de mapas.');
    } finally { setOpeningRoute(false); }
  };
  const confirmDelete = () => Alert.alert('Excluir compromisso?', 'Este compromisso e seu lembrete programado serão removidos.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: () => { void removeAppointment(appointment.id).then(() => router.replace('/agenda')).catch(() => Alert.alert('Não foi possível excluir', 'Tente novamente.')); } },
  ]);

  return (
    <Screen>
      <PageHeading title="Detalhes" right={<Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Voltar"><Text style={styles.backText}>‹</Text></Pressable>} />
      <Card style={styles.hero}>
        <Pill label={statusLabel} tone={status === 'leave' ? 'amber' : 'moss'} />
        <Text style={styles.title}>{appointment.title}</Text>
        <Text style={styles.date}>{formatDate(appointment.date)}</Text>
        <View style={styles.timeLine}><Text style={styles.time}>{formatTime(appointment.startTime)}</Text>{appointment.endTime ? <Text style={styles.duration}>até {formatTime(appointment.endTime)}</Text> : null}</View>
      </Card>
      <Card>
        {appointment.location ? <InfoRow label="Local" value={appointment.location} /> : null}
        {appointment.travelMinutes !== undefined ? <InfoRow label="Deslocamento informado" value={`${appointment.travelMinutes} minutos`} /> : null}
        <InfoRow label="Margem de segurança" value={`${appointment.safetyMarginMinutes} minutos`} />
        {departureText ? <View style={styles.departure}><Text style={styles.departureLabel}>Saída recomendada</Text><Text style={styles.departureTime}>{formatTime(departureText)}</Text><Text style={sharedStyles.muted}>Estimativa calculada com o tempo de deslocamento informado e a margem de segurança. Não considera trânsito em tempo real.</Text></View> : null}
        {appointment.notes ? <InfoRow label="Observações" value={appointment.notes} /> : null}
      </Card>
      {appointment.location ? <PrimaryButton title={openingRoute ? 'Abrindo mapa…' : 'Abrir rota'} onPress={() => void openRoute()} disabled={openingRoute} /> : <Text style={styles.noRoute}>Adicione um endereço para abrir uma rota no mapa.</Text>}
      <View style={styles.actions}><SecondaryButton title="Editar" onPress={() => router.push({ pathname: '/formulario', params: { tipo: 'compromisso', id: appointment.id } })} /><SecondaryButton title="Excluir" danger onPress={confirmDelete} /></View>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  back: { minHeight: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#ECEDE7' },
  backText: { fontSize: 30, lineHeight: 33, color: colors.text, marginTop: -3 },
  hero: { padding: spacing.lg },
  title: { color: colors.text, fontSize: 25, fontWeight: '700', lineHeight: 31 },
  date: { color: colors.muted, fontSize: 14 },
  timeLine: { flexDirection: 'row', gap: 8, alignItems: 'baseline', marginTop: 2 },
  time: { color: colors.mossDark, fontSize: 22, fontWeight: '700' },
  duration: { color: colors.muted, fontSize: 14 },
  infoRow: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 4 },
  infoLabel: { color: colors.muted, fontSize: 12 },
  infoValue: { color: colors.text, fontSize: 15, lineHeight: 21 },
  departure: { backgroundColor: colors.softGreen, padding: 14, borderRadius: 14, gap: 4, marginTop: 10 },
  departureLabel: { color: colors.mossDark, fontSize: 12, fontWeight: '700' },
  departureTime: { color: colors.mossDark, fontSize: 26, fontWeight: '700' },
  noRoute: { textAlign: 'center', color: colors.muted, fontSize: 13, paddingVertical: 8 },
  actions: { flexDirection: 'row', gap: 10 },
});
