import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RoutineTask } from '@/types/routine';
import { colors, spacing } from '@/theme/colors';

export function TaskRow({ task, onToggle, onEdit }: { task: RoutineTask; onToggle: () => void; onEdit: () => void }) {
  const priority = task.priority === 'high' ? 'Alta prioridade' : task.priority === 'low' ? 'Baixa prioridade' : task.category;
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: task.completed }} accessibilityLabel={`${task.completed ? 'Reabrir' : 'Concluir'}: ${task.title}`} onPress={onToggle} style={({ pressed }) => [styles.check, task.completed && styles.checkDone, pressed && { opacity: 0.65 }]}>
        {task.completed ? <Text style={styles.checkMark}>✓</Text> : null}
      </Pressable>
      <Pressable onPress={onEdit} style={styles.copy} accessibilityRole="button" accessibilityLabel={`Editar ${task.title}`}>
        <Text style={[styles.title, task.completed && styles.titleDone]} numberOfLines={1}>{task.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>{task.dueDate ? `${task.dueDate}${task.dueTime ? ` · ${task.dueTime}` : ''}` : priority}</Text>
      </Pressable>
      {task.priority === 'high' && !task.completed ? <View style={styles.priorityMark} accessibilityLabel="Alta prioridade" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 7 },
  check: { height: 25, width: 25, borderRadius: 13, borderWidth: 1.5, borderColor: '#B5B8AA', justifyContent: 'center', alignItems: 'center' },
  checkDone: { backgroundColor: colors.mossDark, borderColor: colors.mossDark },
  checkMark: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  copy: { flex: 1, gap: 3, justifyContent: 'center', minHeight: 42 },
  title: { color: colors.text, fontSize: 14, fontWeight: '600' },
  titleDone: { color: colors.muted, textDecorationLine: 'line-through' },
  meta: { color: colors.muted, fontSize: 11 },
  priorityMark: { height: 8, width: 8, borderRadius: 4, backgroundColor: '#B4792B' },
});
