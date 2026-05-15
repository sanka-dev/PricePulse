import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { apiClient, type LiveAlertUpdate, type LiveAlertMatch, type MobileAlert } from '@/lib/api-client';
import { theme } from '@/lib/mobile-theme';
import { Button, Card, CardContent, SectionHeader } from '@/components/ui';

const REFRESH_INTERVAL_MS = 30_000;

function formatLKR(value: number | null): string {
  if (value === null) return 'Price unavailable';
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatDateTime(value: string | null): string {
  if (!value) return 'No matches yet';
  return new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function describeAlert(alert: MobileAlert): string {
  const parts = [
    alert.keyword ? `"${alert.keyword}"` : 'Any keyword',
    alert.minYear !== null ? `from ${alert.minYear}` : null,
    alert.maxPrice !== null ? `under ${formatLKR(alert.maxPrice)}` : null,
    alert.maxMileage !== null ? `below ${formatNumber(alert.maxMileage)} km` : null,
    alert.location ? `in ${alert.location}` : null,
  ].filter(Boolean) as string[];

  return parts.join(' · ');
}

export default function LiveAlertsScreen() {
  const router = useRouter();
  const [updates, setUpdates] = useState<LiveAlertUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await apiClient.alerts.liveUpdates();
      const sorted = [...data].sort(
        (a, b) => new Date(b.alert.createdAt).getTime() - new Date(a.alert.createdAt).getTime(),
      );
      setUpdates(sorted);
      setLastLoadedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live alert updates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      load(true);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const totalMatches = useMemo(
    () => updates.reduce((sum, u) => sum + u.totalMatches, 0),
    [updates],
  );
  const alertsWithMatches = useMemo(
    () => updates.filter((u) => u.totalMatches > 0).length,
    [updates],
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={theme.colors.text}
          />
        }
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <SectionHeader
              title="Live alert updates"
              subtitle="Latest Ikman and Riyasewana listings matching your active alerts."
            />
          </View>
          <Pressable
            onPress={() => load(true)}
            style={({ pressed }) => [styles.refreshBtn, pressed && styles.refreshBtnPressed]}
            disabled={refreshing}
          >
            <Text style={styles.refreshBtnText}>{refreshing ? '…' : 'Refresh'}</Text>
          </Pressable>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard label="Active alerts" value={updates.length} />
          <MetricCard label="With matches" value={alertsWithMatches} />
          <MetricCard label="Total listings" value={totalMatches} />
        </View>

        {lastLoadedAt ? (
          <Text style={styles.lastLoaded}>
            Last updated {formatDateTime(lastLoadedAt.toISOString())}. Auto-refreshes every 30s.
          </Text>
        ) : null}

        {loading && updates.length === 0 ? (
          <Text style={styles.centerMuted}>Loading live alert updates…</Text>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loading && !error && updates.length === 0 ? (
          <Card style={styles.emptyCard}>
            <CardContent>
              <Text style={styles.emptyTitle}>No active alerts yet</Text>
              <Text style={styles.emptyBody}>
                Create an alert first. The scraper will use those filters to search Ikman and Riyasewana.
              </Text>
              <Button label="Create alert" onPress={() => router.push('/alerts' as any)} />
            </CardContent>
          </Card>
        ) : null}

        {updates.map((update) => (
          <AlertUpdateCard key={update.alert.id} update={update} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{formatNumber(value)}</Text>
    </View>
  );
}

function AlertUpdateCard({ update }: { update: LiveAlertUpdate }) {
  return (
    <Card style={styles.updateCard}>
      <CardContent>
        <View style={styles.updateHeader}>
          <View style={styles.updateHeaderLeft}>
            <Text style={styles.updateKeyword}>{update.alert.keyword || 'Any listing'}</Text>
            <Text style={styles.updateDesc}>{describeAlert(update.alert)}</Text>
          </View>
          <View style={styles.updateHeaderRight}>
            <Text style={styles.updateMeta}>
              {formatNumber(update.totalMatches)} matching
            </Text>
            <Text style={styles.updateMeta}>Latest: {formatDateTime(update.latestMatchAt)}</Text>
          </View>
        </View>

        {update.matches.length === 0 ? (
          <Text style={styles.noMatches}>No scraped listings match this alert yet.</Text>
        ) : (
          <View style={styles.matches}>
            {update.matches.map((match) => (
              <ListingMatchRow key={`${update.alert.id}-${match.id}`} match={match} />
            ))}
          </View>
        )}
      </CardContent>
    </Card>
  );
}

function ListingMatchRow({ match }: { match: LiveAlertMatch }) {
  const imageUrl = match.imageUrls?.[0];
  return (
    <Pressable
      style={({ pressed }) => [styles.matchRow, pressed && styles.matchRowPressed]}
      onPress={() => Linking.openURL(match.url)}
    >
      <View style={styles.thumbWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholderWrap}>
            <Text style={styles.thumbPlaceholder}>No image</Text>
          </View>
        )}
      </View>
      <View style={styles.matchBody}>
        <Text style={styles.matchTitle} numberOfLines={2}>
          {match.title}
        </Text>
        <Text style={styles.matchPrice}>{formatLKR(match.price)}</Text>
        <Text style={styles.matchMeta}>
          {[match.source, match.year, match.mileage != null ? `${formatNumber(match.mileage)} km` : null, match.location]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <Text style={styles.matchUpdated}>Updated {formatDateTime(match.updatedAt)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  refreshBtn: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  refreshBtnPressed: {
    opacity: 0.85,
  },
  refreshBtnText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  metricCard: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  metricValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  lastLoaded: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  centerMuted: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    paddingVertical: 24,
  },
  errorText: {
    color: theme.colors.danger,
    marginBottom: 12,
  },
  emptyCard: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 16,
    lineHeight: 20,
  },
  updateCard: {
    marginBottom: 14,
  },
  updateHeader: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 12,
  },
  updateHeaderLeft: {
    flex: 1,
  },
  updateKeyword: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  updateDesc: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  updateHeaderRight: {
    alignSelf: 'flex-start',
  },
  updateMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  noMatches: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
  },
  matches: {
    gap: 10,
  },
  matchRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardMuted,
  },
  matchRowPressed: {
    opacity: 0.9,
  },
  thumbWrap: {
    width: 88,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbPlaceholder: {
    fontSize: 11,
    color: theme.colors.textMuted,
    padding: 4,
  },
  matchBody: {
    flex: 1,
    minWidth: 0,
  },
  matchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  matchPrice: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  matchMeta: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  matchUpdated: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
});
