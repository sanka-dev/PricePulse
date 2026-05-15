import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { apiClient, type MobileNotification } from '@/lib/api-client';
import { theme } from '@/lib/mobile-theme';
import { Button, Card, CardContent, SectionHeader } from '@/components/ui';

const READ_IDS_KEY = 'mobile_notification_read_ids';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<MobileNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const [rows, storedIds] = await Promise.all([
        apiClient.alerts.notifications(120),
        readStoredReadIds(),
      ]);
      setNotifications(rows);
      setReadIds(storedIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !readIds.has(item.id)).length,
    [notifications, readIds],
  );

  const todayCount = useMemo(() => {
    const today = new Date();
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).getTime();
    return notifications.filter(
      (item) => new Date(item.createdAt).getTime() >= start,
    ).length;
  }, [notifications]);

  const weekCount = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    return notifications.filter((item) => new Date(item.createdAt) >= weekStart).length;
  }, [notifications]);

  const markAsRead = async (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    await writeStoredReadIds(next);
  };

  const markAllAsRead = async () => {
    const next = new Set(notifications.map((item) => item.id));
    setReadIds(next);
    await writeStoredReadIds(next);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <SectionHeader
          title="Notifications"
          subtitle="Stay updated with listing changes"
        />
        <Button label="Refresh" variant="outline" onPress={load} />
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Unread" value={unreadCount} />
        <StatCard label="Today" value={todayCount} />
        <StatCard label="This week" value={weekCount} />
      </View>

      <View style={styles.toolbarRow}>
        <Button label="Mark all read" variant="outline" onPress={markAllAsRead} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {isLoading ? 'Loading notifications...' : 'No notifications yet.'}
          </Text>
        }
        renderItem={({ item }) => {
          const isRead = readIds.has(item.id);
          return (
            <Pressable
              style={isRead ? styles.itemRead : undefined}
              onPress={async () => {
                await markAsRead(item.id);
                if (item.listingUrl) {
                  Linking.openURL(item.listingUrl).catch(() => {
                    
                  });
                }
              }}
            >
              <Card style={styles.item}>
              <CardContent>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemMessage} numberOfLines={2}>
                {item.message}
              </Text>
              <View style={styles.itemMeta}>
                <Text style={styles.metaText}>{formatTime(item.createdAt)}</Text>
                {item.source ? <Text style={styles.metaText}>{item.source}</Text> : null}
              </View>
              </CardContent>
              </Card>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

async function readStoredReadIds(): Promise<Set<string>> {
  const raw = await getStorageItem(READ_IDS_KEY);
  if (!raw) return new Set<string>();

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((item) => typeof item === 'string'));
  } catch {
    return new Set<string>();
  }
}

async function writeStoredReadIds(ids: Set<string>): Promise<void> {
  await setStorageItem(READ_IDS_KEY, JSON.stringify(Array.from(ids)));
}

async function getStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setStorageItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  toolbarRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  error: {
    color: theme.colors.danger,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  item: {
    overflow: 'hidden',
  },
  itemRead: {
    opacity: 0.55,
  },
  itemTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  itemMessage: {
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  empty: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 36,
  },
});
