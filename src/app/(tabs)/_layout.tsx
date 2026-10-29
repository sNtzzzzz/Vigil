import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/theme/colors';

const tabGlyphs: Record<string, string> = { index: '◷', agenda: '▦', ajustes: '○' };

export default function TabLayout() {
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.mossDark,
      tabBarInactiveTintColor: '#85877F',
      tabBarStyle: { height: 68, paddingTop: 8, paddingBottom: 9, borderTopColor: colors.border, backgroundColor: colors.surface },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 21, lineHeight: 24 }}>{tabGlyphs[route.name] ?? '·'}</Text>,
    })}>
      <Tabs.Screen name="index" options={{ title: 'Hoje' }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}
