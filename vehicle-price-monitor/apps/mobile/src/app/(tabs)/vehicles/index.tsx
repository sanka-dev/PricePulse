import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Image,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { VehicleResponseDto } from '@vehicle-price-monitor/types';
import { apiClient } from '@/lib/api-client';
import { theme } from '@/lib/mobile-theme';

export default function VehiclesScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setError(null);
      const response = await apiClient.vehicles.list();
      setVehicles(response.data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch vehicles';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchVehicles();
  };

  const renderVehicle = ({ item }: { item: VehicleResponseDto }) => (
    <Pressable
      style={styles.vehicleCard}
      onPress={() => router.push(`/(tabs)/vehicles/${item.id}`)}
    >
      <View style={styles.imageContainer}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>🚗</Text>
          </View>
        )}
        {item.priceChangePercent && item.priceChangePercent < 0 && (
          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>
              {item.priceChangePercent.toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.vehicleDetails}>
          {item.year} • {item.mileage ? `${item.mileage.toLocaleString()} km` : 'Mileage N/A'}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.vehiclePrice}>
            {item.currency} {item.currentPrice.toLocaleString()}
          </Text>
          <Text style={styles.vehicleSource}>{item.sourceName}</Text>
        </View>
      </View>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🚗</Text>
      <Text style={styles.emptyTitle}>No vehicles yet</Text>
      <Text style={styles.emptySubtitle}>
        Start tracking by adding your first vehicle
      </Text>
      <Pressable style={styles.addButton} onPress={() => {}}>
        <Text style={styles.addButtonText}>Add Vehicle</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={vehicles}
        renderItem={renderVehicle}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          error ? <Text style={styles.errorText}>{error}</Text> : null
        }
        ListEmptyComponent={!isLoading ? renderEmpty : null}
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
  listContent: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  vehicleCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0px 1px 2px rgba(0,0,0,0.2)',
    elevation: 2,
  },
  imageContainer: {
    height: 160,
    backgroundColor: theme.colors.cardMuted,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 48,
  },
  priceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  vehicleInfo: {
    padding: 16,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehiclePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  vehicleSource: {
    fontSize: 12,
    color: theme.colors.textMuted,
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
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: theme.colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: theme.colors.danger,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
});
