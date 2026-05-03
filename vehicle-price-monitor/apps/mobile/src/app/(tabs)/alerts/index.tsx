import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  apiClient,
  type MobileAlert,
  type NlpParseResult,
} from '@/lib/api-client';
import { theme } from '@/lib/mobile-theme';
import { Button, Card, CardContent, Input, SectionHeader } from '@/components/ui';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<MobileAlert[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isNlpCreating, setIsNlpCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualKeyword, setManualKeyword] = useState('');
  const [manualYear, setManualYear] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualMileage, setManualMileage] = useState('');
  const [nlpText, setNlpText] = useState('');
  const [nlpPreview, setNlpPreview] = useState<NlpParseResult | null>(null);

  const loadAlerts = async () => {
    try {
      setError(null);
      const data = await apiClient.alerts.list();
      setAlerts(data.filter((item) => item.isActive));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadAlerts();
  };

  const createManualAlert = async () => {
    setIsCreating(true);
    try {
      const payload: {
        keyword?: string;
        minYear?: number;
        maxPrice?: number;
        maxMileage?: number;
      } = {};
      if (manualKeyword.trim()) payload.keyword = manualKeyword.trim();
      if (manualYear.trim()) payload.minYear = Number(manualYear);
      if (manualPrice.trim()) payload.maxPrice = Number(manualPrice);
      if (manualMileage.trim()) payload.maxMileage = Number(manualMileage);

      if (Object.keys(payload).length === 0) {
        Alert.alert('Error', 'Please enter at least one filter.');
        return;
      }

      await apiClient.alerts.create(payload);
      await loadAlerts();
      setManualKeyword('');
      setManualYear('');
      setManualPrice('');
      setManualMileage('');
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create alert',
      );
    } finally {
      setIsCreating(false);
    }
  };

  const parseNlp = async () => {
    if (!nlpText.trim()) return;
    try {
      const result = await apiClient.alerts.parseNlp(nlpText.trim());
      setNlpPreview(result);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'NLP parse failed');
    }
  };

  const createFromNlp = async () => {
    if (!nlpText.trim()) return;
    setIsNlpCreating(true);
    try {
      await apiClient.alerts.createFromDescription(nlpText.trim());
      setNlpText('');
      setNlpPreview(null);
      await loadAlerts();
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create NLP alert',
      );
    } finally {
      setIsNlpCreating(false);
    }
  };

  const removeAlert = async (id: string) => {
    try {
      await apiClient.alerts.deactivate(id);
      await loadAlerts();
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to delete alert',
      );
    }
  };

  const renderAlert = ({ item }: { item: MobileAlert }) => (
    <Pressable style={styles.alertCard} onLongPress={() => removeAlert(item.id)}>
      <View style={styles.alertIcon}>
        <Text style={styles.alertIconText}>🔔</Text>
      </View>
      <View style={styles.alertContent}>
        <Text style={styles.alertName}>{item.keyword || 'Any listing'}</Text>
        <Text style={styles.alertType}>
          {item.minYear ? `From ${item.minYear}` : 'All years'}
          {item.maxPrice && ` • LKR ${item.maxPrice.toLocaleString()}`}
          {item.maxMileage && ` • ${item.maxMileage.toLocaleString()} km`}
        </Text>
      </View>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>ACTIVE</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.headerWrap}>
        <SectionHeader
          title="Alerts"
          subtitle="Create smart price alerts and monitor matches"
        />
      </View>

      <Card style={styles.formCard}>
        <CardContent style={styles.formContent}>
        <Text style={styles.formTitle}>Manual alert</Text>
        <Input
          style={styles.input}
          value={manualKeyword}
          onChangeText={setManualKeyword}
          placeholder="Keyword (Toyota Aqua)"
        />
        <View style={styles.inputRow}>
          <Input
            style={[styles.input, styles.inputHalf]}
            value={manualYear}
            onChangeText={setManualYear}
            placeholder="Min year"
            keyboardType="numeric"
          />
          <Input
            style={[styles.input, styles.inputHalf]}
            value={manualPrice}
            onChangeText={setManualPrice}
            placeholder="Max price"
            keyboardType="numeric"
          />
        </View>
        <Input
          style={styles.input}
          value={manualMileage}
          onChangeText={setManualMileage}
          placeholder="Max mileage"
          keyboardType="numeric"
        />
        <Button
          label={isCreating ? 'Creating...' : 'Create alert'}
          onPress={createManualAlert}
        />
        </CardContent>
      </Card>

      <Card style={styles.formCard}>
        <CardContent style={styles.formContent}>
        <Text style={styles.formTitle}>NLP alert</Text>
        <Input
          style={[styles.input, styles.inputMulti]}
          value={nlpText}
          onChangeText={setNlpText}
          placeholder="Describe your alert in plain English"
          multiline
        />
        <View style={styles.inputRow}>
          <Button label="Preview parse" variant="outline" onPress={parseNlp} style={styles.inputHalf} />
          <Button
            label={isNlpCreating ? 'Creating...' : 'Create from NLP'}
            onPress={createFromNlp}
            style={styles.inputHalf}
          />
        </View>
        {nlpPreview ? (
          <Text style={styles.previewText}>
            Parsed: {nlpPreview.keyword || 'no keyword'} · minYear:{' '}
            {nlpPreview.minYear ?? '-'} · maxPrice: {nlpPreview.maxPrice ?? '-'} ·
            maxMileage: {nlpPreview.maxMileage ?? '-'}
          </Text>
        ) : null}
        </CardContent>
      </Card>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{alerts.length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>∞</Text>
          <Text style={styles.statLabel}>Live checks</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{alerts.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No active alerts yet</Text>
            <Text style={styles.emptySubtitle}>
              Create one using manual or NLP mode above.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.text}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  formCard: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  formContent: {
    gap: 8,
  },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  formTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  input: {
    backgroundColor: theme.colors.cardMuted,
  },
  inputMulti: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputHalf: {
    flex: 1,
  },
  previewText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    paddingVertical: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  listContent: {
    padding: 16,
    gap: 10,
    flexGrow: 1,
  },
  alertCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    boxShadow: '0px 1px 2px rgba(0,0,0,0.2)',
    elevation: 2,
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.cardMuted,
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
    color: theme.colors.text,
    marginBottom: 2,
  },
  alertType: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  statusBadge: {
    backgroundColor: '#14532d',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#86efac',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    color: theme.colors.danger,
    marginHorizontal: 16,
    marginTop: 12,
  },
});
