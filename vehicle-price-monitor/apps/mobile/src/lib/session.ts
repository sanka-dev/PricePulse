import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AuthResponseDto } from '@vehicle-price-monitor/types';

const ACCESS_TOKEN_KEY = 'mobile_access_token';
const USER_KEY = 'mobile_user';

export type SessionUser = AuthResponseDto['user'];

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

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveSession(payload: AuthResponseDto): Promise<void> {
  await setItem(ACCESS_TOKEN_KEY, payload.accessToken);
  await setItem(USER_KEY, JSON.stringify(payload.user));
}

export async function getAccessToken(): Promise<string | null> {
  const token = await getItem(ACCESS_TOKEN_KEY);
  if (!token || token === 'null' || token === 'undefined') {
    return null;
  }
  return token;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const raw = await getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await deleteItem(ACCESS_TOKEN_KEY);
  await deleteItem(USER_KEY);
}
