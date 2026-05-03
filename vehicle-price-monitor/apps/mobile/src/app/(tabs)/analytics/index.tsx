import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  apiClient,
  type AlertDemandAnalyticsResponse,
  type AlertDemandPoint,
} from '@/lib/api-client';
import { theme } from '@/lib/mobile-theme';
import { Button, Card, CardContent, SectionHeader } from '@/components/ui';

export default function AnalyticsScreen() {
  const [data, setData] = useState<AlertDemandAnalyticsResponse | null>(null);
  const [month, setMonth] = useState(currentMonthLabel());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (selectedMonth: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.analytics.alertDemand(selectedMonth);
      const payload = 'data' in response ? response.data : response;
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load(month);
  }, [month]);

  const monthChoices = useMemo(() => {
    const now = new Date();
    const labels: string[] = [];
    for (let index = 0; index < 12; index += 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
      labels.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
    }
    return labels;
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <SectionHeader
            title="Analytics"
            subtitle="Demand trends for your alert-driven listings"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.monthRow}>
            {monthChoices.map((option) => (
              <Button
                key={option}
                style={styles.monthButton}
                variant={option === month ? 'default' : 'outline'}
                label={option}
                onPress={() => setMonth(option)}
              />
            ))}
          </View>
        </ScrollView>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {isLoading ? <Text style={styles.muted}>Loading analytics...</Text> : null}

        {data ? (
          <>
            <View style={styles.metricsGrid}>
              <MetricCard label="Active alerts" value={data.combined.activeAlerts} />
              <MetricCard label="Listed today" value={data.combined.today.listed} />
              <MetricCard label="Sold today" value={data.combined.today.sold} />
              <MetricCard label="New today" value={data.combined.today.newListings} />
            </View>

            <Card style={styles.chartCard}>
              <CardContent>
              <Text style={styles.chartTitle}>Monthly demand trend</Text>
              <MiniBarChart points={data.combined.series} />
              </CardContent>
            </Card>

            <Text style={styles.sectionTitle}>Per-alert breakdown</Text>
            <FlatList
              data={data.alerts}
              keyExtractor={(item) => item.alertId}
              scrollEnabled={false}
              contentContainerStyle={styles.alertList}
              renderItem={({ item }) => (
                <Card style={styles.alertCard}>
                  <CardContent>
                  <Text style={styles.alertName}>{item.keyword || 'Any listing'}</Text>
                  <Text style={styles.alertSubtitle}>
                    Sold: {item.monthTotals.sold} · New: {item.monthTotals.newListings}
                  </Text>
                  <Text style={styles.alertSubtitle}>
                    Avg listed: {item.monthTotals.averageListed} · Avg left:{' '}
                    {item.monthTotals.averageLeft}
                  </Text>
                  </CardContent>
                </Card>
              )}
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value.toLocaleString()}</Text>
    </View>
  );
}

function MiniBarChart({ points }: { points: AlertDemandPoint[] }) {
  const top = Math.max(
    1,
    ...points.map((point) => point.listed + point.sold + point.newListings),
  );
  const sampled = points.slice(-14);

  return (
    <View style={styles.chartBarsRow}>
      {sampled.map((point) => {
        const total = point.listed + point.sold + point.newListings;
        const height = Math.max(8, Math.round((total / top) * 84));
        return (
          <View key={point.date} style={styles.chartBarWrap}>
            <View style={[styles.chartBar, { height }]} />
            <Text style={styles.chartLabel}>{point.date.slice(8)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function currentMonthLabel(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 12,
  },
  monthRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  monthButton: {
    borderRadius: 999,
  },
  error: {
    color: theme.colors.danger,
    marginBottom: 8,
  },
  muted: {
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
  },
  metricLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  chartCard: {
    marginBottom: 12,
  },
  chartTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: 10,
  },
  chartBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
  },
  chartBarWrap: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: '100%',
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  chartLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 17,
    marginBottom: 8,
  },
  alertList: {
    gap: 8,
  },
  alertCard: {
    borderRadius: 12,
  },
  alertName: {
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  alertSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
});
