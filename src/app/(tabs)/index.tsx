import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppointmentCard } from '@/components/AppointmentCard';
import { TaskRow } from '@/components/TaskRow';
import { Card, EmptyState, PageHeading, PrimaryButton, Screen, SectionHeading, SecondaryButton, sharedStyles } from '@/components/ui';
import { getDailySummary } from '@/engine/ProactiveEngine';
import { combineLocalDateTime, localDateKey, formatDate } from '@/utils/dates';
import { useRoutineStore } from '@/store/routineStore';
import { colors, spacing } from '@/theme/colors';

export default function TodayScreen() {
  const router = useRouter();
  const appointments = useRoutineStore((state) => state.appointments);
  const tasks = useRoutineStore((state) => state.tasks);
  const preferences = useRoutineStore((state) => state.preferences);
  const hydrated = useRoutineStore((state) => state.hydrated);
  const storageError = useRoutineStore((state) => state.storageError);
  const toggleTask = useRoutineStore((state) => state.toggleTask);
  const hasSeenIntro = useRoutineStore((state) => state.hasSeenIntro);
  const markIntroSeen = useRoutineStore((state) => state.markIntroSeen);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const now = new Date();
  const today = localDateKey(now);
  const summary = getDailySummary({ appointments, tasks, preferences, hasSeenIntro }, now);
  const upcomingAppointments = appointments.filter((item) => {
    const start = combineLocalDateTime(item.date, item.startTime);
    if (!start) return false;
    const endTime = item.endTime ?? new Date(start.getTime() + 60 * 60_000).toTimeString().slice(0, 5);
    const end = combineLocalDateTime(item.date, endTime);
    return item.date >= today && (start >= now || (end !== null && now < end));
  }).sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)).slice(0, 3);
  const priorities = summary.priorities;
  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const dayDescription = `${summary.appointmentCount} ${summary.appointmentCount === 1 ? 'compromisso' : 'compromissos'} e ${summary.pendingTaskCount} ${summary.pendingTaskCount === 1 ? 'tarefa em aberto' : 'tarefas em aberto'}.`;
  const hasAnyData = appointments.length > 0 || tasks.length > 0;

  if (!hydrated) return <Screen><View style={styles.loading}><ActivityIndicator color={colors.mossDark} /><Text style={styles.loadingText}>Preparando seu dia…</Text></View></Screen>;

  const openForm = (kind: 'compromisso' | 'tarefa' | 'lembrete') => {
    setQuickAddVisible(false);
    router.push({ pathname: '/formulario', params: { tipo: kind } });
  };

  return (
    <Screen>
      <PageHeading
        title={`${greeting}${preferences.displayName ? `, ${preferences.displayName}` : ''}!`}
        subtitle={`${formatDate(today)}, ${dayDescription}`}
        right={<Pressable onPress={() => setQuickAddVisible(true)} style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.75 }]} accessibilityRole="button" accessibilityLabel="Adicionar item"><Text style={styles.addText}>＋</Text></Pressable>}
      />
      {storageError ? <Card style={styles.errorCard}><Text style={styles.errorText}>{storageError}</Text></Card> : null}

      {!hasSeenIntro ? (
        <Card style={styles.introCard}>
          <View style={styles.introMark}><Text style={styles.introGlyph}>✦</Text></View>
          <Text style={styles.introTitle}>Organize seu dia com mais tranquilidade.</Text>
          <Text style={sharedStyles.muted}>Cadastre compromissos e tarefas. Seus dados ficam neste aparelho e os lembretes são opcionais.</Text>
          <Pressable onPress={() => void markIntroSeen()} accessibilityRole="button"><Text style={styles.introDismiss}>Continuar</Text></Pressable>
        </Card>
      ) : null}

      <Card style={styles.highlight}>
        <View style={styles.highlightTop}><View style={styles.highlightMark}><Text style={styles.highlightGlyph}>✦</Text></View><Text style={styles.highlightLabel}>PARA VOCÊ</Text></View>
        <Text style={styles.highlightTitle}>{summary.attentionMessage}</Text>
        {summary.nextAppointment ? <Text style={styles.highlightSub}>{summary.nextAppointment.title} · {summary.nextAppointment.startTime}</Text> : summary.conflictCount > 0 ? <Text style={styles.highlightSub}>Confira os horários antes de sair.</Text> : null}
      </Card>

      <View>
        <SectionHeading title="Próximos compromissos" action={<Pressable onPress={() => router.push('/agenda')} hitSlop={8}><Text style={styles.link}>Ver agenda</Text></Pressable>} />
        {upcomingAppointments.length > 0 ? (
          <View style={{ gap: 9 }}>{upcomingAppointments.map((item) => <AppointmentCard key={item.id} appointment={item} showDate={item.date !== today} onPress={() => router.push({ pathname: '/compromisso/[id]', params: { id: item.id } })} />)}</View>
        ) : (
          <Card style={styles.emptyCard}><EmptyState title={hasAnyData ? 'Sem próximos compromissos' : 'Seu dia começa por aqui'} body={hasAnyData ? 'Seus novos compromissos aparecerão aqui.' : 'Adicione um compromisso, tarefa ou lembrete para manter o dia organizado.'} action={!hasAnyData ? <PrimaryButton title="Criar meu primeiro compromisso" onPress={() => openForm('compromisso')} /> : undefined} /></Card>
        )}
      </View>

      <View>
        <SectionHeading title="Minhas prioridades" action={<Pressable onPress={() => router.push('/agenda')} hitSlop={8}><Text style={styles.link}>Ver tarefas</Text></Pressable>} />
        <Card style={styles.tasksCard}>
          {priorities.length > 0 ? priorities.map((task) => <TaskRow key={task.id} task={task} onToggle={() => void toggleTask(task.id).catch(() => Alert.alert('Não foi possível salvar', 'Confira o espaço disponível no aparelho e tente novamente.'))} onEdit={() => router.push({ pathname: '/formulario', params: { tipo: task.kind === 'reminder' ? 'lembrete' : 'tarefa', id: task.id } })} />)
            : <EmptyState title={tasks.length > 0 ? 'Tudo em dia' : 'Nenhuma tarefa por enquanto'} body={tasks.length > 0 ? 'Suas tarefas prioritárias foram concluídas.' : 'Quando adicionar tarefas, elas aparecem aqui.'} action={<SecondaryButton title="Adicionar tarefa" onPress={() => openForm('tarefa')} />} />}
          {priorities.length > 0 ? <SecondaryButton title="＋  Nova tarefa" onPress={() => openForm('tarefa')} /> : null}
        </Card>
      </View>

      <Modal visible={quickAddVisible} transparent animationType="fade" onRequestClose={() => setQuickAddVisible(false)}>
        <Pressable style={styles.scrim} onPress={() => setQuickAddVisible(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>O que você quer adicionar?</Text>
            {[
              { kind: 'compromisso' as const, title: 'Compromisso', detail: 'Consulta, reunião ou evento' },
              { kind: 'tarefa' as const, title: 'Tarefa', detail: 'Algo que você precisa concluir' },
              { kind: 'lembrete' as const, title: 'Lembrete', detail: 'Uma obrigação para recordar' },
            ].map((option) => <Pressable key={option.kind} onPress={() => openForm(option.kind)} style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.background }]}><View style={styles.optionMark}><Text style={styles.optionGlyph}>{option.kind === 'compromisso' ? '◷' : option.kind === 'tarefa' ? '✓' : '◇'}</Text></View><View style={{ flex: 1, gap: 3 }}><Text style={styles.optionTitle}>{option.title}</Text><Text style={styles.optionDetail}>{option.detail}</Text></View><Text style={styles.chevron}>›</Text></Pressable>)}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  addButton: { height: 46, width: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.mossDark },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 240 },
  loadingText: { color: colors.muted, fontSize: 14 },
  addText: { color: '#FFF', fontSize: 29, fontWeight: '400', lineHeight: 32, marginTop: -2 },
  highlight: { backgroundColor: '#EEF0E7', borderColor: '#E0E5D3', padding: 18 },
  errorCard: { backgroundColor: '#F9ECE9', borderColor: '#ECD5D0' },
  errorText: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  highlightTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  highlightMark: { width: 27, height: 27, borderRadius: 14, backgroundColor: '#DDE3CE', alignItems: 'center', justifyContent: 'center' },
  highlightGlyph: { color: colors.mossDark, fontSize: 15 },
  highlightLabel: { color: colors.mossDark, letterSpacing: 1, fontWeight: '700', fontSize: 11 },
  highlightTitle: { color: colors.text, fontSize: 17, fontWeight: '600', lineHeight: 23 },
  highlightSub: { color: colors.muted, fontSize: 13 },
  link: { color: colors.mossDark, fontSize: 13, fontWeight: '600' },
  emptyCard: { paddingVertical: 2 },
  tasksCard: { paddingVertical: spacing.sm, gap: spacing.sm },
  introCard: { backgroundColor: colors.surface, gap: 8 },
  introMark: { width: 32, height: 32, backgroundColor: colors.softGreen, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  introGlyph: { color: colors.mossDark },
  introTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  introDismiss: { fontSize: 14, fontWeight: '700', color: colors.mossDark, paddingTop: 4 },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.background, paddingTop: 12, paddingHorizontal: spacing.lg, paddingBottom: 34, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 8 },
  sheetHandle: { alignSelf: 'center', height: 4, width: 42, borderRadius: 2, backgroundColor: '#C9CAC3', marginBottom: 10 },
  sheetTitle: { color: colors.text, fontSize: 19, fontWeight: '700', marginBottom: 5 },
  option: { minHeight: 70, borderRadius: 16, backgroundColor: colors.surface, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  optionMark: { height: 38, width: 38, borderRadius: 19, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  optionGlyph: { color: colors.mossDark, fontSize: 18 },
  optionTitle: { color: colors.text, fontWeight: '600', fontSize: 15 },
  optionDetail: { color: colors.muted, fontSize: 12 },
  chevron: { fontSize: 23, color: '#8E9088' },
});
