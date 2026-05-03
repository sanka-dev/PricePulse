import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from './api-client';

const PUSH_TOKEN_KEY = 'mobile_push_token';
const NOTIFIED_IDS_KEY = 'mobile_notified_alert_ids';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResponse.data;

  await setItem(PUSH_TOKEN_KEY, token);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ffffff',
    });
  }

  return token;
}

export async function getStoredPushToken(): Promise<string | null> {
  return getItem(PUSH_TOKEN_KEY);
}

export async function notifyForNewAlertEvents(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  const notifications = await apiClient.alerts.notifications(40);
  const knownIds = await readKnownIds();
  const unseen = notifications.filter((item) => !knownIds.has(item.id));

  if (unseen.length === 0) return;

  for (const item of unseen.slice(0, 3)) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title,
        body: item.message,
        data: {
          listingUrl: item.listingUrl,
          source: item.source,
        },
      },
      trigger: null,
    });
    knownIds.add(item.id);
  }

  await setItem(
    NOTIFIED_IDS_KEY,
    JSON.stringify(Array.from(knownIds)),
  );
}

async function readKnownIds(): Promise<Set<string>> {
  const raw = await getItem(NOTIFIED_IDS_KEY);
  if (!raw) return new Set<string>();

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((item) => typeof item === 'string'));
  } catch {
    return new Set<string>();
  }
}
