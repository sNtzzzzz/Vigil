import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, Field, PageHeading, Pill, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { useRoutineStore } from '@/store/routineStore';
import type { Appointment, Category, Priority, RoutineTask } from '@/types/routine';
import { colors, spacing } from '@/theme/colors';
import { combineLocalDateTime, formatDate, formatTime, localDateKey } from '@/utils/dates';
import { validateAppointmentForm, validateTaskForm } from '@/utils/validation';

type FormKind = 'compromisso' | 'tarefa' | 'lembrete';
type PickerField = 'date' | 'startTime' | 'endTime' | 'dueDate' | 'dueTime';
type Draft = {
  title: string; date: string; startTime: string; endTime: string; location: string; travelMinutes: string;
  safetyMarginMinutes: string; notes: string; description: string; dueDate: string; dueTime: string;
  priority: Priority; category: Category; reminderMinutes: number; keepDuringQuietHours: boolean;
};

const categories: Category[] = ['Pessoal', 'Trabalho', 'Estudos', 'Saúde', 'Contas'];
const reminderChoices = [0, 5, 15, 30, 60, 1440];
const blankDraft = (kind: FormKind, defaultTravel: number, defaultReminder: number): Draft => ({
  title: '', date: localDateKey(new Date()), startTime: '09:00', endTime: '', location: '', travelMinutes: '',
  safetyMarginMinutes: String(defaultTravel), notes: '', description: '', dueDate: kind === 'lembrete' ? localDateKey(new Date()) : '',
  dueTime: '', priority: kind === 'lembrete' ? 'normal' : 'normal', category: kind === 'lembrete' ? 'Pessoal' : 'Pessoal',
  reminderMinutes: defaultReminder, keepDuringQuietHours: false,
});

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getPickerDate(draft: Draft, field: PickerField): Date {
  const dateValue = field === 'date' ? draft.date : field === 'dueDate' ? (draft.dueDate || localDateKey(new Date())) : draft.date;
  const timeValue = field === 'startTime' ? draft.startTime : field === 'endTime' ? (draft.endTime || draft.startTime) : field === 'dueTime' ? (draft.dueTime || '09:00') : '12:00';
  return combineLocalDateTime(dateValue, timeValue) ?? new Date();
}

export default function RoutineFormScreen() {
  const params = useLocalSearchParams<{ tipo?: string; id?: string }>();
  const router = useRouter();
  const kind: FormKind = params.tipo === 'tarefa' || params.tipo === 'lembrete' ? params.tipo : 'compromisso';
  const appointments = useRoutineStore((state) => state.appointments);
  const tasks = useRoutineStore((state) => state.tasks);
  const preferences = useRoutineStore((state) => state.preferences);
  const hydrated = useRoutineStore((state) => state.hydrated);
  const saveAppointment = useRoutineStore((state) => state.saveAppointment);
  const saveTask = useRoutineStore((state) => state.saveTask);
  const removeTask = useRoutineStore((state) => state.removeTask);
  const appointment = kind === 'compromisso' ? appointments.find((item) => item.id === params.id) : undefined;
  const task = kind !== 'compromisso' ? tasks.find((item) => item.id === params.id) : undefined;
  const existing = appointment ?? task;
  const draftKey = `${kind}:${params.id ?? 'novo'}`;
  const [draftState, setDraftState] = useState<{ key: string; values: Partial<Draft> }>(() => ({ key: draftKey, values: {} }));
  const draftChanges = draftState.key === draftKey ? draftState.values : {};
  const baseDraft = useMemo(() => {
    const empty = blankDraft(kind, preferences.defaultTravelBufferMinutes, preferences.defaultReminderMinutes);
    if (appointment) return {
      ...empty, title: appointment.title, date: appointment.date, startTime: appointment.startTime,
      endTime: appointment.endTime ?? '', location: appointment.location ?? '',
      travelMinutes: appointment.travelMinutes === undefined ? '' : String(appointment.travelMinutes),
      safetyMarginMinutes: String(appointment.safetyMarginMinutes), notes: appointment.notes ?? '',
      keepDuringQuietHours: appointment.keepDuringQuietHours,
    };
    if (task) return {
      ...empty, title: task.title, description: task.description ?? '', dueDate: task.dueDate ?? '',
      dueTime: task.dueTime ?? '', priority: task.priority, category: task.category,
      reminderMinutes: task.reminderMinutes ?? 0, keepDuringQuietHours: task.keepDuringQuietHours,
    };
    return empty;
  }, [kind, preferences.defaultTravelBufferMinutes, preferences.defaultReminderMinutes, appointment, task]);
  const draft: Draft = { ...baseDraft, ...draftChanges };
  const [advancedOpen, setAdvancedOpen] = useState(kind === 'lembrete');
  const [picker, setPicker] = useState<PickerField | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submitted = useRef(false);
  const itemName = kind === 'compromisso' ? 'compromisso' : kind === 'lembrete' ? 'lembrete' : 'tarefa';
  const title = useMemo(() => existing ? `Editar ${itemName}` : `${kind === 'tarefa' ? 'Nova' : 'Novo'} ${itemName}`, [existing, kind, itemName]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraftState((current) => ({
    key: draftKey,
    values: { ...(current.key === draftKey ? current.values : {}), [key]: value },
  }));
  const updateFromPicker = (event: DateTimePickerEvent, value?: Date) => {
    if (!value || event.type === 'dismissed') { setPicker(null); return; }
    if (picker === 'date') set('date', localDateKey(value));
    else if (picker === 'dueDate') set('dueDate', localDateKey(value));
    else if (picker === 'startTime') set('startTime', value.toTimeString().slice(0, 5));
    else if (picker === 'endTime') set('endTime', value.toTimeString().slice(0, 5));
    else if (picker === 'dueTime') set('dueTime', value.toTimeString().slice(0, 5));
  };
  const deleteExistingTask = () => Alert.alert('Excluir item?', 'Esta ação não pode ser desfeita.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: () => { if (task) void removeTask(task.id).then(() => router.replace('/agenda')).catch(() => Alert.alert('Não foi possível excluir', 'Tente novamente.')); } },
  ]);

  const save = async () => {
    if (submitted.current) return;
    const trimmedTitle = draft.title.trim();
    const validationError = kind === 'compromisso'
      ? validateAppointmentForm(draft)
      : validateTaskForm(draft);
    if (validationError) { setError(validationError); return; }
    const travel = draft.travelMinutes === '' ? undefined : Number(draft.travelMinutes);
    submitted.current = true;
    setSubmitting(true);
    setError('');
    try {
      if (kind === 'compromisso') {
        const item: Appointment = {
          id: appointment?.id ?? newId(), title: trimmedTitle, date: draft.date, startTime: draft.startTime,
          endTime: draft.endTime || undefined, location: draft.location.trim() || undefined, travelMinutes: travel,
      safetyMarginMinutes: Math.max(0, Number(draft.safetyMarginMinutes) || 0),
          notes: draft.notes.trim() || undefined, keepDuringQuietHours: draft.keepDuringQuietHours,
          notificationId: appointment?.notificationId, notificationKey: appointment?.notificationKey,
        };
        await saveAppointment(item);
        router.replace({ pathname: '/compromisso/[id]', params: { id: item.id } });
      } else {
        const item: RoutineTask = {
          id: task?.id ?? newId(), title: trimmedTitle, kind: kind === 'lembrete' ? 'reminder' : 'task', description: draft.description.trim() || undefined,
          dueDate: draft.dueDate || undefined, dueTime: draft.dueTime || undefined, priority: draft.priority,
          category: draft.category, reminderMinutes: draft.reminderMinutes || undefined,
          keepDuringQuietHours: draft.keepDuringQuietHours, completed: task?.completed ?? false,
          completedAt: task?.completedAt, notificationId: task?.notificationId, notificationKey: task?.notificationKey,
        };
        await saveTask(item);
        router.replace('/agenda');
      }
    } catch {
      submitted.current = false;
      setSubmitting(false);
      setError('Não foi possível salvar agora. Tente novamente.');
    }
  };

  const pickButton = (label: string, field: PickerField, value: string) => (
    <Field label={label} value={value} placeholder="Selecionar" onPress={() => setPicker(field)} />
  );

  if (params.id && hydrated && !existing) {
    return <Screen><PageHeading title="Item indisponível" /><Card><Text style={styles.helper}>Este item não está mais salvo no aparelho.</Text><SecondaryButton title="Voltar à agenda" onPress={() => router.replace('/agenda')} /></Card></Screen>;
  }

  if (!hydrated) return <Screen><View style={styles.loading}><ActivityIndicator color={colors.mossDark} /><Text style={styles.helper}>Carregando seus dados…</Text></View></Screen>;

  return (
    <Screen>
      <PageHeading title={title} right={<Pressable onPress={() => router.back()} style={styles.close} accessibilityRole="button" accessibilityLabel="Fechar"><Text style={styles.closeText}>×</Text></Pressable>} />
      {error ? <Card style={styles.errorCard}><Text style={styles.errorMessage}>{error}</Text></Card> : null}
      <Field label="Título" value={draft.title} onChangeText={(value) => set('title', value)} placeholder={kind === 'compromisso' ? 'Ex.: Consulta médica' : kind === 'lembrete' ? 'Ex.: Pagar conta de luz' : 'Ex.: Revisar anotações'} />
      {kind === 'compromisso' ? <>
        {pickButton('Data', 'date', draft.date ? formatDate(draft.date) : '')}
        <View style={styles.twoColumns}>{pickButton('Início', 'startTime', formatTime(draft.startTime))}{pickButton('Término (opcional)', 'endTime', draft.endTime ? formatTime(draft.endTime) : '')}</View>
        <Field label="Local ou endereço (opcional)" value={draft.location} onChangeText={(value) => set('location', value)} placeholder="Ex.: Rua das Flores, 120" />
        <Pressable onPress={() => setAdvancedOpen(!advancedOpen)} style={styles.advancedToggle}><Text style={styles.advancedText}>{advancedOpen ? '−  Menos opções' : '+  Mais opções'}</Text></Pressable>
        {advancedOpen ? <Card style={styles.advancedCard}>
          <View style={styles.twoColumns}><Field label="Deslocamento (min)" value={draft.travelMinutes} onChangeText={(value) => set('travelMinutes', value.replace(/\D/g, ''))} placeholder="Ex.: 25" keyboardType="numeric" /><Field label="Margem (min)" value={draft.safetyMarginMinutes} onChangeText={(value) => set('safetyMarginMinutes', value.replace(/\D/g, ''))} placeholder="10" keyboardType="numeric" /></View>
          <Text style={styles.helper}>O aviso será programado para a saída recomendada, considerando o tempo e a margem informados.</Text>
          <Field label="Observações" value={draft.notes} onChangeText={(value) => set('notes', value)} placeholder="Detalhes úteis" multiline />
          <CheckOption label="Manter o aviso durante o horário de silêncio" value={draft.keepDuringQuietHours} onPress={() => set('keepDuringQuietHours', !draft.keepDuringQuietHours)} />
        </Card> : null}
      </> : <>
        <Field label="Descrição (opcional)" value={draft.description} onChangeText={(value) => set('description', value)} placeholder="Um detalhe para lembrar" multiline />
        {kind === 'tarefa' ? <View style={styles.priorityGroup}><Text style={styles.fieldLabel}>Prioridade</Text><View style={styles.chips}>{(['high', 'normal', 'low'] as Priority[]).map((priority) => <Pressable key={priority} onPress={() => set('priority', priority)}><Pill label={priority === 'high' ? 'Alta' : priority === 'normal' ? 'Normal' : 'Baixa'} tone={draft.priority === priority ? 'moss' : 'neutral'} /></Pressable>)}</View></View> : null}
        <Pressable onPress={() => setAdvancedOpen(!advancedOpen)} style={styles.advancedToggle}><Text style={styles.advancedText}>{advancedOpen ? '−  Menos opções' : '+  Prazo e lembrete'}</Text></Pressable>
        {advancedOpen ? <Card style={styles.advancedCard}>
          {pickButton('Prazo (opcional)', 'dueDate', draft.dueDate ? formatDate(draft.dueDate) : 'Sem prazo')}
          {draft.dueDate ? pickButton('Horário (opcional)', 'dueTime', draft.dueTime ? formatTime(draft.dueTime) : '09h') : null}
          <View style={styles.priorityGroup}><Text style={styles.fieldLabel}>Categoria</Text><View style={styles.chips}>{categories.map((category) => <Pressable key={category} onPress={() => set('category', category)}><Pill label={category} tone={draft.category === category ? 'moss' : 'neutral'} /></Pressable>)}</View></View>
          <View style={styles.priorityGroup}><Text style={styles.fieldLabel}>Avisar antes do prazo</Text><View style={styles.chips}>{reminderChoices.map((minutes) => <Pressable key={minutes} onPress={() => set('reminderMinutes', minutes)}><Pill label={minutes === 0 ? 'Sem aviso' : minutes === 1440 ? '1 dia' : `${minutes} min`} tone={draft.reminderMinutes === minutes ? 'moss' : 'neutral'} /></Pressable>)}</View></View>
          <CheckOption label="Manter o aviso durante o horário de silêncio" value={draft.keepDuringQuietHours} onPress={() => set('keepDuringQuietHours', !draft.keepDuringQuietHours)} />
        </Card> : null}
      </>}
      <PrimaryButton title={submitting ? 'Salvando…' : 'Salvar'} onPress={() => void save()} loading={submitting} />
      {task ? <SecondaryButton title="Excluir item" danger onPress={deleteExistingTask} /> : null}
      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <View style={styles.pickerScrim}><View style={styles.pickerCard}>
          <Text style={styles.pickerTitle}>{picker?.toLowerCase().includes('date') || picker === 'date' ? 'Escolha uma data' : 'Escolha um horário'}</Text>
          {picker ? <DateTimePicker value={getPickerDate(draft, picker)} mode={picker.toLowerCase().includes('date') ? 'date' : 'time'} display="spinner" onChange={updateFromPicker} style={styles.picker} /> : null}
          <PrimaryButton title="Concluir" onPress={() => setPicker(null)} />
        </View></View>
      </Modal>
    </Screen>
  );
}

function CheckOption({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: value }} onPress={onPress} style={styles.checkRow}><View style={[styles.checkbox, value && styles.checkboxOn]}>{value ? <Text style={styles.checkMark}>✓</Text> : null}</View><Text style={styles.checkLabel}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  close: { height: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#ECEDE7' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 240 },
  closeText: { color: colors.text, fontSize: 26, lineHeight: 28, marginTop: -2 },
  twoColumns: { flexDirection: 'row', gap: spacing.md },
  advancedToggle: { minHeight: 44, justifyContent: 'center' },
  advancedText: { color: colors.mossDark, fontSize: 14, fontWeight: '600' },
  advancedCard: { gap: spacing.md },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  priorityGroup: { gap: 9 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  checkRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, borderColor: '#B5B8AA', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  checkboxOn: { backgroundColor: colors.mossDark, borderColor: colors.mossDark },
  checkMark: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  checkLabel: { flex: 1, color: colors.text, fontSize: 13 },
  errorCard: { backgroundColor: '#F9ECE9', borderColor: '#ECD5D0' },
  errorMessage: { color: colors.danger, fontSize: 13 },
  pickerScrim: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.lg },
  pickerCard: { backgroundColor: colors.surface, borderRadius: 20, padding: spacing.md, gap: spacing.md },
  pickerTitle: { color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  picker: { alignSelf: 'center' },
});
