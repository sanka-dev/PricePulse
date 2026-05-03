import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PriceStatsDto } from '@vehicle-price-monitor/types';
import { apiClient, type MobileNotification } from '@/lib/api-client';
import { theme } from '@/lib/mobile-theme';

export default function PricesScreen() {
  const [stats, setStats] = useState<PriceStatsDto | null>(null);
  const [notifications, setNotifications] = useState<MobileNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const [statsResponse, notificationResponse] = await Promise.all([
        apiClient.prices.stats(),
        apiClient.alerts.notifications(8),
      ]);
      setStats(statsResponse.data);
      setNotifications(notificationResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prices');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={theme.colors.text}
          />
        }
      >
        {error && <Text style={styles.errorText}>{error}</Text>}
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Vehicles Tracked"
            value={String(stats?.totalVehiclesTracked ?? 0)}
            icon="🚗"
          />
          <StatCard
            title="Price Drops"
            value={String(stats?.priceDropsToday ?? 0)}
            icon="📉"
          />
          <StatCard
            title="Avg Change"
            value={`${(stats?.averagePriceChange ?? 0).toFixed(1)}%`}
            icon="📊"
          />
          <StatCard
            title="Biggest Drop"
            value={
              stats?.biggestPriceDrop
                ? `${stats.biggestPriceDrop.priceChangePercent.toFixed(1)}%`
                : '-'
            }
            icon="🎯"
          />
        </View>

        {/* Price History Placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price History</Text>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.placeholderIcon}>📈</Text>
            <Text style={styles.placeholderText}>
              Biggest drop vehicle
            </Text>
            <Text style={styles.placeholderSubtext}>
              {stats?.biggestPriceDrop?.vehicleTitle ?? 'No drop detected yet'}
            </Text>
          </View>
        </View>

        {/* Recent Changes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Price Changes</Text>
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No price changes recorded yet</Text>
            </View>
          ) : (
            notifications.map((item) => (
              <View key={item.id} style={styles.changeItem}>
                <Text style={styles.changeTitle}>{item.title}</Text>
                <Text style={styles.changeMessage} numberOfLines={2}>
                  {item.message}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 16,
    width: '48%',
    boxShadow: '0px 1px 2px rgba(0,0,0,0.2)',
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  chartPlaceholder: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    boxShadow: '0px 1px 2px rgba(0,0,0,0.2)',
    elevation: 2,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: theme.colors.text,
  },
  emptyState: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    boxShadow: '0px 1px 2px rgba(0,0,0,0.2)',
    elevation: 2,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  changeItem: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  changeTitle: {
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  changeMessage: {
    color: theme.colors.textMuted,
  },
  errorText: {
    color: theme.colors.danger,
    marginBottom: 12,
  },
});
