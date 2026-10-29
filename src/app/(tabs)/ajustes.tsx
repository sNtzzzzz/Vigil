import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Card, Field, PageHeading, PrimaryButton, Screen, SecondaryButton, ToggleRow } from '@/components/ui';
import { useRoutineStore } from '@/store/routineStore';
import { getNotificationPermissionLabel, sendTestNotification } from '@/services/notifications';
import type { Preferences } from '@/types/routine';
import { colors, spacing } from '@/theme/colors';
import { isValidTime } from '@/utils/dates';

export default function SettingsScreen() {
  const preferences = useRoutineStore((state) => state.preferences);
  const hydrated = useRoutineStore((state) => state.hydrated);
  const savePreferences = useRoutineStore((state) => state.savePreferences);
  const clearAll = useRoutineStore((state) => state.clearAll);
  const [draftOverrides, setDraftOverrides] = useState<Partial<Preferences>>({});
  const draft = { ...preferences, ...draftOverrides };
  const [permission, setPermission] = useState('Consultando…');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { void getNotificationPermissionLabel().then(setPermission); }, [preferences.notificationsEnabled]);
  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => { setDraftOverrides((current) => ({ ...current, [key]: value })); setSaved(false); };
  const save = async () => {
    if (!isValidTime(draft.dayStartTime) || (draft.quietHoursEnabled && (!isValidTime(draft.quietStart) || !isValidTime(draft.quietEnd)))) {
      Alert.alert('Confira os horários', 'Use o formato HH:MM, por exemplo 08:30.');
      return;
    }
    if (![draft.defaultReminderMinutes, draft.defaultTravelBufferMinutes].every((value) => Number.isFinite(value) && value >= 0 && value <= 1440)) {
      Alert.alert('Confira os minutos', 'Os valores devem ficar entre 0 e 1.440 minutos.');
      return;
    }
    setSaving(true);
    try {
    const allowed = await savePreferences(draft);
    setDraftOverrides({});
      setSaved(true);
      await getNotificationPermissionLabel().then(setPermission);
      if (draft.notificationsEnabled && !allowed) Alert.alert('Permissão não concedida', 'Ative as notificações nas configurações do aparelho para receber lembretes.');
    } catch {
      Alert.alert('Não foi possível salvar', 'Confira o espaço disponível no aparelho e tente novamente.');
    } finally { setSaving(false); }
  };
  const testNotification = async () => {
    try {
      await sendTestNotification();
      Alert.alert('Teste programado', 'Você deve receber uma notificação local em alguns segundos.');
    } catch (error) {
      Alert.alert('Não foi possível programar', error instanceof Error ? error.message : 'Confira a permissão de notificações.');
    } finally { await getNotificationPermissionLabel().then(setPermission); }
  };
  const confirmClear = () => Alert.alert('Apagar todos os dados?', 'Compromissos, tarefas e preferências salvos neste aparelho serão removidos. Esta ação não pode ser desfeita.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Apagar dados', style: 'destructive', onPress: () => { void clearAll().then(() => { setDraftOverrides({}); Alert.alert('Dados apagados', 'O aplicativo está pronto para começar novamente.'); }).catch(() => Alert.alert('Não foi possível apagar os dados', 'Tente novamente.')); } },
  ]);

  if (!hydrated) return <Screen><View style={styles.loading}><ActivityIndicator color={colors.mossDark} /><Text style={styles.body}>Carregando ajustes…</Text></View></Screen>;

  return (
    <Screen>
      <PageHeading title="Ajustes" subtitle="Deixe os lembretes no seu ritmo." />
      <Card>
        <Text style={styles.groupTitle}>Preferências pessoais</Text>
        <Field label="Como podemos chamar você? (opcional)" value={draft.displayName} onChangeText={(value) => update('displayName', value)} placeholder="Seu nome" />
        <Field label="Início preferido do dia" value={draft.dayStartTime} onChangeText={(value) => update('dayStartTime', value)} placeholder="08:00" />
        <View style={styles.twoColumns}><Field label="Antecedência padrão (min)" value={String(draft.defaultReminderMinutes)} onChangeText={(value) => update('defaultReminderMinutes', Math.max(0, Number(value) || 0))} placeholder="15" keyboardType="numeric" /><Field label="Margem de saída (min)" value={String(draft.defaultTravelBufferMinutes)} onChangeText={(value) => update('defaultTravelBufferMinutes', Math.max(0, Number(value) || 0))} placeholder="10" keyboardType="numeric" /></View>
        <Text style={styles.body}>A antecedência é aplicada a novas tarefas e lembretes. Itens com prazo sem horário usam o início preferido do dia.</Text>
      </Card>
      <Card>
        <Text style={styles.groupTitle}>Notificações</Text>
        <ToggleRow title="Lembretes locais" subtitle="Os avisos ficam programados neste aparelho." value={draft.notificationsEnabled} onValueChange={(value) => update('notificationsEnabled', value)} />
        <ToggleRow title="Horário de silêncio" subtitle="Os avisos comuns não são programados durante esse período." value={draft.quietHoursEnabled} onValueChange={(value) => update('quietHoursEnabled', value)} />
        {draft.quietHoursEnabled ? <View style={styles.twoColumns}><Field label="Silêncio começa" value={draft.quietStart} onChangeText={(value) => update('quietStart', value)} placeholder="22:00" /><Field label="Silêncio termina" value={draft.quietEnd} onChangeText={(value) => update('quietEnd', value)} placeholder="07:00" /></View> : null}
        <Text style={styles.permission}>Permissão no aparelho: <Text style={styles.permissionValue}>{permission}</Text></Text>
        <SecondaryButton title="Testar notificação" onPress={() => void testNotification()} />
      </Card>
      <PrimaryButton title={saving ? 'Salvando…' : saved ? 'Preferências salvas' : 'Salvar preferências'} onPress={() => void save()} loading={saving} />
      <Card>
        <Text style={styles.groupTitle}>Privacidade</Text>
        <Text style={styles.body}>Compromissos, tarefas e preferências ficam armazenados localmente neste aparelho. O aplicativo não usa conta, banco de dados remoto ou serviços externos para as funções principais.</Text>
        <Text style={styles.body}>Ao abrir uma rota, o endereço é enviado ao aplicativo de mapas escolhido no aparelho.</Text>
        <SecondaryButton title="Apagar todos os dados locais" danger onPress={confirmClear} />
      </Card>
      <Card>
        <Text style={styles.groupTitle}>Sobre o aplicativo</Text>
        <Text style={styles.body}>Assistente de Rotina · versão 0.1.0</Text>
        <Text style={styles.body}>Disponível: agenda, tarefas, resumo diário, conflitos e notificações locais.</Text>
        <Text style={styles.body}>Trânsito em tempo real, sincronização e integrações com calendários ainda não estão disponíveis.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  groupTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 240 },
  twoColumns: { flexDirection: 'row', gap: spacing.md },
  permission: { color: colors.muted, fontSize: 12, marginVertical: 4 },
  permissionValue: { color: colors.text, fontWeight: '600' },
  body: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 5 },
});
