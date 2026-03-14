import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AlertResponseDto } from '@vehicle-price-monitor/types';
import { AlertType, AlertStatus } from '@vehicle-price-monitor/types';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertResponseDto[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = () => {
    setIsRefreshing(true);
    // TODO: Fetch alerts
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case AlertType.PRICE_DROP:
        return '📉';
      case AlertType.PRICE_THRESHOLD:
        return '🎯';
      case AlertType.NEW_LISTING:
        return '🆕';
      case AlertType.PRICE_CHANGE:
        return '📊';
      default:
        return '🔔';
    }
  };

  const getStatusColor = (status: AlertStatus) => {
    switch (status) {
      case AlertStatus.ACTIVE:
        return { bg: '#dcfce7', text: '#166534' };
      case AlertStatus.PAUSED:
        return { bg: '#fef9c3', text: '#854d0e' };
      case AlertStatus.TRIGGERED:
        return { bg: '#dbeafe', text: '#1e40af' };
      case AlertStatus.EXPIRED:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const renderAlert = ({ item }: { item: AlertResponseDto }) => {
    const statusColor = getStatusColor(item.status);
    return (
      <Pressable style={styles.alertCard}>
        <View style={styles.alertIcon}>
          <Text style={styles.alertIconText}>{getAlertIcon(item.type)}</Text>
        </View>
        <View style={styles.alertContent}>
          <Text style={styles.alertName}>{item.name}</Text>
          <Text style={styles.alertType}>
            {item.type.replace(/_/g, ' ')}
            {item.targetPrice &&
              ` • Target: LKR ${item.targetPrice.toLocaleString()}`}
          </Text>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}
        >
          <Text style={[styles.statusText, { color: statusColor.text }]}>
            {item.status}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={styles.emptyTitle}>No alerts yet</Text>
      <Text style={styles.emptySubtitle}>
        Create an alert to get notified when prices drop
      </Text>
      <Pressable style={styles.addButton} onPress={() => { }}>
        <Text style={styles.addButtonText}>Create Alert</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Triggered</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  listContent: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconText: {
    fontSize: 20,
  },
  alertContent: {
    flex: 1,
  },
  alertName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  alertType: {
    fontSize: 13,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
