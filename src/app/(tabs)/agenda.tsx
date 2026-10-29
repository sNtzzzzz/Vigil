import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { AppointmentCard } from '@/components/AppointmentCard';
import { TaskRow } from '@/components/TaskRow';
import { Card, EmptyState, PageHeading, Pill, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { useRoutineStore } from '@/store/routineStore';
import { colors, spacing } from '@/theme/colors';
import { combineLocalDateTime, formatDate, localDateKey } from '@/utils/dates';

type Filter = 'all' | 'pending' | 'completed';

export default function AgendaScreen() {
  const router = useRouter();
  const appointments = useRoutineStore((state) => state.appointments);
  const tasks = useRoutineStore((state) => state.tasks);
  const toggleTask = useRoutineStore((state) => state.toggleTask);
  const hydrated = useRoutineStore((state) => state.hydrated);
  const [view, setView] = useState<'upcoming' | 'date'>('upcoming');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const selectedKey = localDateKey(selectedDate);
  const todayKey = localDateKey(new Date());
  const lastUpcomingDay = new Date();
  lastUpcomingDay.setDate(lastUpcomingDay.getDate() + 7);
  const maxKey = localDateKey(lastUpcomingDay);

  const visibleAppointments = useMemo(() => appointments.filter((item) => {
    if (filter === 'completed') return false;
    if (view === 'date') return item.date === selectedKey;
    if (item.date < todayKey || item.date > maxKey) return false;
    if (item.date > todayKey) return true;
    const start = combineLocalDateTime(item.date, item.startTime);
    if (!start) return false;
    const end = combineLocalDateTime(item.date, item.endTime ?? new Date(start.getTime() + 60 * 60_000).toTimeString().slice(0, 5));
    return start >= new Date() || (end !== null && end > new Date());
  }).sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)), [appointments, view, filter, selectedKey, todayKey, maxKey]);
  const visibleTasks = useMemo(() => tasks.filter((item) => {
    if (filter === 'pending' && item.completed) return false;
    if (filter === 'completed' && !item.completed) return false;
    if (view === 'date') return item.dueDate === selectedKey;
    return !item.dueDate || (item.dueDate >= todayKey && item.dueDate <= maxKey) || (!item.completed && item.dueDate < todayKey);
  }).sort((a, b) => `${a.dueDate ?? '9999-99-99'} ${a.dueTime ?? ''}`.localeCompare(`${b.dueDate ?? '9999-99-99'} ${b.dueTime ?? ''}`)), [tasks, filter, view, selectedKey, todayKey, maxKey]);

  const handleDateChange = (_event: DateTimePickerEvent, value?: Date) => {
    if (value) setSelectedDate(value);
    if (_event.type === 'dismissed' || _event.type === 'set') setDatePickerVisible(false);
  };
  const openForm = (kind: 'compromisso' | 'tarefa' | 'lembrete') => router.push({ pathname: '/formulario', params: { tipo: kind } });
  const hasResults = visibleAppointments.length > 0 || visibleTasks.length > 0;

  if (!hydrated) return <Screen><View style={styles.loading}><ActivityIndicator color={colors.mossDark} /><Text style={styles.loadingText}>Carregando agenda…</Text></View></Screen>;

  return (
    <Screen>
      <PageHeading title="Agenda" subtitle="Seus compromissos e tarefas, em um só lugar." right={<Pressable onPress={() => openForm('compromisso')} style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.75 }]} accessibilityRole="button" accessibilityLabel="Adicionar à agenda"><Text style={styles.addText}>＋</Text></Pressable>} />
      <View style={styles.segment}>
        <Pressable onPress={() => setView('upcoming')} style={[styles.segmentButton, view === 'upcoming' && styles.segmentActive]}><Text style={[styles.segmentText, view === 'upcoming' && styles.segmentTextActive]}>Próximos dias</Text></Pressable>
        <Pressable onPress={() => { setView('date'); setDatePickerVisible(true); }} style={[styles.segmentButton, view === 'date' && styles.segmentActive]}><Text style={[styles.segmentText, view === 'date' && styles.segmentTextActive]}>Por data</Text></Pressable>
      </View>
      {view === 'date' ? <Pressable style={styles.dateButton} onPress={() => setDatePickerVisible(true)}><Text style={styles.dateButtonText}>{formatDate(selectedKey)}</Text><Text style={styles.dateChevron}>⌄</Text></Pressable> : null}
      {datePickerVisible ? <View style={styles.datePickerWrap}><DateTimePicker value={selectedDate} mode="date" display={undefined} onChange={handleDateChange} /></View> : null}
      <View style={styles.filters}>{([
        ['all', 'Tudo'], ['pending', 'Pendentes'], ['completed', 'Concluídos'],
      ] as const).map(([key, label]) => <Pressable key={key} onPress={() => setFilter(key)}><Pill label={label} tone={filter === key ? 'moss' : 'neutral'} /></Pressable>)}</View>

      {hasResults ? (
        <View style={{ gap: spacing.lg }}>
          {visibleAppointments.length > 0 ? <View style={{ gap: spacing.sm }}><Text style={styles.sectionTitle}>Compromissos</Text>{visibleAppointments.map((item) => <AppointmentCard key={item.id} appointment={item} onPress={() => router.push({ pathname: '/compromisso/[id]', params: { id: item.id } })} />)}</View> : null}
          {visibleTasks.length > 0 ? <View style={{ gap: spacing.sm }}><Text style={styles.sectionTitle}>{filter === 'completed' ? 'Concluídas' : 'Tarefas e lembretes'}</Text><Card style={styles.taskList}>{visibleTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={() => void toggleTask(task.id).catch(() => Alert.alert('Não foi possível salvar', 'Confira o espaço disponível no aparelho e tente novamente.'))} onEdit={() => router.push({ pathname: '/formulario', params: { tipo: task.kind === 'reminder' ? 'lembrete' : 'tarefa', id: task.id } })} />)}</Card></View> : null}
          <SecondaryButton title="＋  Adicionar tarefa" onPress={() => openForm('tarefa')} />
        </View>
      ) : (
        <Card><EmptyState title={filter === 'completed' ? 'Nada concluído ainda' : view === 'date' ? 'Dia sem itens' : 'Sua agenda está livre'} body={view === 'date' ? 'Escolha outra data ou adicione um novo item.' : 'Adicione compromissos e tarefas para planejar os próximos dias.'} action={<PrimaryButton title="Adicionar compromisso" onPress={() => openForm('compromisso')} />} /></Card>
      )}
      <View style={styles.quickRow}>
        <SecondaryButton title="＋  Tarefa" onPress={() => openForm('tarefa')} />
        <SecondaryButton title="＋  Lembrete" onPress={() => openForm('lembrete')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  addButton: { height: 46, width: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.mossDark },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 240 },
  loadingText: { color: colors.muted, fontSize: 14 },
  addText: { color: '#FFF', fontSize: 29, lineHeight: 32, marginTop: -2 },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: '#ECEDE7', gap: 3 },
  segmentButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: colors.text },
  dateButton: { minHeight: 46, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, borderColor: colors.border, borderWidth: 1, borderRadius: 13, backgroundColor: colors.surface },
  dateButtonText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  dateChevron: { color: colors.muted, fontSize: 18 },
  datePickerWrap: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 8 },
  filters: { flexDirection: 'row', gap: 8 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  taskList: { paddingVertical: 8, gap: 2 },
  quickRow: { flexDirection: 'row', gap: 10 },
});
