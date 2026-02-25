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

export default function VehiclesScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      // TODO: Implement actual API call
      // const response = await apiClient.vehicles.list();
      // setVehicles(response.data);
      setVehicles([]);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
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
          {item.year} • {item.mileage?.toLocaleString()} km
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
        ListEmptyComponent={!isLoading ? renderEmpty : null}
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
  listContent: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  vehicleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  imageContainer: {
    height: 160,
    backgroundColor: '#f3f4f6',
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
    backgroundColor: '#22c55e',
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
    color: '#1f2937',
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#6b7280',
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
    color: '#2563eb',
  },
  vehicleSource: {
    fontSize: 12,
    color: '#9ca3af',
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
