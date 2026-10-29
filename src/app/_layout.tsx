import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useRoutineStore } from '@/store/routineStore';
import { colors } from '@/theme/colors';

export default function RootLayout() {
  const initialize = useRoutineStore((state) => state.initialize);
  const rescheduleAll = useRoutineStore((state) => state.rescheduleAll);
  useEffect(() => {
    void initialize();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void rescheduleAll();
    });
    return () => subscription.remove();
  }, [initialize, rescheduleAll]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'fade_from_bottom' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="formulario" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="compromisso/[id]" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
