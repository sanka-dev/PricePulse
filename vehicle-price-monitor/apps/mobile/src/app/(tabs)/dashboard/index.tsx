import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { apiClient, type AlertDemandAnalyticsResponse } from '@/lib/api-client';
import { theme } from '@/lib/mobile-theme';
import { Button, Card, CardContent, SectionHeader } from '@/components/ui';

type DashboardStats = {
  activeAlerts: number;
  notifications: number;
  soldToday: number;
  listedToday: number;
};

export default function DashboardScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeAlerts: 0,
    notifications: 0,
    soldToday: 0,
    listedToday: 0,
  });

  const load = async () => {
    setIsLoading(true);
    const [alertsRes, notificationsRes, analyticsRes] = await Promise.allSettled([
      apiClient.alerts.list(),
      apiClient.alerts.notifications(100),
      apiClient.analytics.alertDemand(),
    ]);

    const alerts = alertsRes.status === 'fulfilled' ? alertsRes.value : [];
    const notifications = notificationsRes.status === 'fulfilled' ? notificationsRes.value : [];
    const analytics: AlertDemandAnalyticsResponse | null =
      analyticsRes.status === 'fulfilled' ? analyticsRes.value : null;

    setStats({
      activeAlerts: alerts.filter((row) => row?.isActive).length,
      notifications: notifications.length,
      soldToday: analytics?.combined?.today?.sold ?? 0,
      listedToday: analytics?.combined?.today?.listed ?? 0,
    });
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const cards = useMemo(
    () => [
      { title: 'Active Alerts', value: stats.activeAlerts },
      { title: 'Notifications', value: stats.notifications },
      { title: 'Sold Today', value: stats.soldToday },
      { title: 'Listed Today', value: stats.listedToday },
    ],
    [stats],
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader
          title="Dashboard"
          subtitle="Overview of your alerts, demand and listing activity"
        />

        <View style={styles.grid}>
          {cards.map((card) => (
            <Card key={card.title} style={styles.statCard}>
              <CardContent>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardValue}>{card.value.toLocaleString()}</Text>
              </CardContent>
            </Card>
          ))}
        </View>

        <Card>
          <CardContent>
            <Text style={styles.activityTitle}>Recent activity</Text>
            <Text style={styles.activityText}>
              {isLoading
                ? 'Loading dashboard data...'
                : 'Dashboard is synced. Open Search, Alerts, Live updates, or Notifications for details.'}
            </Text>
          </CardContent>
        </Card>

        <View style={styles.actions}>
          <Button label="Search Listings" onPress={() => router.push('/search' as any)} />
          <Button label="Open Alerts" variant="outline" onPress={() => router.push('/alerts' as any)} />
          <Button
            label="View Notifications"
            variant="outline"
            onPress={() => router.push('/notifications' as any)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  grid: {
    gap: 10,
  },
  statCard: {
    borderRadius: theme.radius.md,
  },
  cardTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  cardValue: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '700',
    marginTop: 4,
  },
  activityTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  activityText: {
    color: theme.colors.textMuted,
  },
  actions: {
    gap: 8,
  },
});
