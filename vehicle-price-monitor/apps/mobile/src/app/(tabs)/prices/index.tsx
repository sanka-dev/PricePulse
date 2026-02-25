import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PricesScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard title="Vehicles Tracked" value="0" icon="🚗" />
          <StatCard title="Price Drops" value="0" icon="📉" />
          <StatCard title="Avg Change" value="0%" icon="📊" />
          <StatCard title="Biggest Drop" value="-" icon="🎯" />
        </View>

        {/* Price History Placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price History</Text>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.placeholderIcon}>📈</Text>
            <Text style={styles.placeholderText}>
              Price history chart will appear here
            </Text>
            <Text style={styles.placeholderSubtext}>
              Add vehicles to start tracking
            </Text>
          </View>
        </View>

        {/* Recent Changes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Price Changes</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No price changes recorded yet</Text>
          </View>
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
    backgroundColor: '#f9fafb',
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
    color: '#6b7280',
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  chartPlaceholder: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
