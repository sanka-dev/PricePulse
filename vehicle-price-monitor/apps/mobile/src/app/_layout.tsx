import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { theme } from '@/lib/mobile-theme';
import { getAccessToken } from '@/lib/session';

export default function RootLayout() {
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let isMounted = true;

    const bootstrap = async () => {
      try {
        if (Platform.OS === 'web') return;

        const token = await getAccessToken();
        if (!token || !isMounted) return;

        const { notifyForNewAlertEvents, registerForPushNotifications } = await import(
          '@/lib/notifications'
        );

        await registerForPushNotifications();
        await notifyForNewAlertEvents();

        intervalId = setInterval(() => {
          notifyForNewAlertEvents().catch(() => {
            // Ignore polling errors to keep app responsive.
          });
        }, 60_000);
      } catch {
        // Notification setup should not block app startup.
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
