import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/theme/colors';

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {scroll
        ? <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
        : <View style={styles.screenContent}>{children}</View>}
    </SafeAreaView>
  );
}

export function PageHeading({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.heading}>
      <View style={styles.headingText}>
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{title}</Text>{action}</View>;
}

export function PrimaryButton({ title, onPress, disabled = false, loading = false, accessibilityLabel }: {
  title: string; onPress: () => void; disabled?: boolean; loading?: boolean; accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.primaryButton, (disabled || loading) && styles.disabledButton, pressed && !disabled && styles.pressed]}
    >
      {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>{title}</Text>}
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress, danger = false }: { title: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
      <Text style={[styles.secondaryText, danger && { color: colors.danger }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, placeholder, multiline, keyboardType, onPress, editable = true, error, accessory }: {
  label: string; value: string; onChangeText?: (value: string) => void; placeholder?: string; multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'numbers-and-punctuation'; onPress?: () => void; editable?: boolean; error?: string; accessory?: ReactNode;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputShell, error && styles.inputError, multiline && styles.multilineShell]}>
        {onPress ? (
          <Pressable onPress={onPress} style={styles.inputPress} accessibilityRole="button">
            <Text style={[styles.inputText, !value && styles.placeholder]}>{value || placeholder}</Text>
          </Pressable>
        ) : (
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#999B92"
            keyboardType={keyboardType ?? 'default'}
            editable={editable}
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
            style={[styles.input, multiline && styles.multilineInput]}
            accessibilityLabel={label}
          />
        )}
        {accessory}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <View style={styles.empty}><View style={styles.emptyMark}><Text style={styles.emptyGlyph}>✦</Text></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text>{action}</View>;
}

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'moss' | 'amber' }) {
  const toneStyle = tone === 'moss' ? styles.mossPill : tone === 'amber' ? styles.amberPill : styles.neutralPill;
  const textStyle = tone === 'moss' ? styles.mossPillText : tone === 'amber' ? styles.amberPillText : styles.neutralPillText;
  return <View style={[styles.pill, toneStyle]}><Text style={[styles.pillText, textStyle]}>{label}</Text></View>;
}

export function ToggleRow({ title, subtitle, value, onValueChange }: { title: string; subtitle?: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onValueChange(!value)} style={styles.toggleRow}>
      <View style={styles.toggleCopy}><Text style={styles.toggleTitle}>{title}</Text>{subtitle ? <Text style={styles.toggleSubtitle}>{subtitle}</Text> : null}</View>
      <View style={[styles.switch, value && styles.switchOn]}><View style={[styles.switchKnob, value && styles.switchKnobOn]} /></View>
    </Pressable>
  );
}

export const sharedStyles = StyleSheet.create({
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  screenContent: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  headingText: { flex: 1, gap: 5 },
  pageTitle: { color: colors.text, fontSize: 27, fontWeight: '700', letterSpacing: -0.6 },
  pageSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  primaryButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.button, backgroundColor: colors.mossDark },
  primaryText: { color: colors.surface, fontWeight: '600', fontSize: 16 },
  disabledButton: { opacity: 0.55 },
  secondaryButton: { minHeight: 48, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.button, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  fieldWrap: { gap: 7 },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  inputShell: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13 },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 12 },
  inputPress: { flex: 1, minHeight: 48, justifyContent: 'center' },
  inputText: { color: colors.text, fontSize: 15 },
  placeholder: { color: '#999B92' },
  multilineShell: { minHeight: 100, alignItems: 'flex-start' },
  multilineInput: { minHeight: 84, width: '100%' },
  errorText: { color: colors.danger, fontSize: 12 },
  empty: { alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xl, gap: spacing.sm },
  emptyMark: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.softGreen, justifyContent: 'center', alignItems: 'center', marginBottom: 3 },
  emptyGlyph: { color: colors.mossDark, fontSize: 24 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  emptyBody: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 280 },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontSize: 12, fontWeight: '600' },
  neutralPill: { backgroundColor: '#F0F0EC' },
  neutralPillText: { color: colors.muted },
  mossPill: { backgroundColor: colors.softGreen },
  mossPillText: { color: colors.mossDark },
  amberPill: { backgroundColor: colors.amber },
  amberPillText: { color: colors.amberText },
  toggleRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  toggleCopy: { flex: 1, gap: 3 },
  toggleTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  toggleSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  switch: { width: 48, height: 28, borderRadius: 14, padding: 3, backgroundColor: '#D9DAD4', justifyContent: 'center' },
  switchOn: { backgroundColor: colors.mossDark },
  switchKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface },
  switchKnobOn: { alignSelf: 'flex-end' },
});
