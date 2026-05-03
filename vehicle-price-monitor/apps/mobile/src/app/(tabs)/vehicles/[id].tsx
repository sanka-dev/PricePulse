import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { VehicleResponseDto } from '@vehicle-price-monitor/types';
import { apiClient } from '@/lib/api-client';
import { theme } from '@/lib/mobile-theme';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<VehicleResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiClient.vehicles
      .get(id)
      .then((response) => {
        setVehicle(response.data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load vehicle');
      });
  }, [id]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {!vehicle && !error && <Text style={styles.muted}>Loading vehicle...</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
        {vehicle && (
          <View style={styles.card}>
            {vehicle.imageUrl ? (
              <Image source={{ uri: vehicle.imageUrl }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>🚗</Text>
              </View>
            )}
            <Text style={styles.title}>{vehicle.title}</Text>
            <Text style={styles.price}>
              {vehicle.currency} {vehicle.currentPrice.toLocaleString()}
            </Text>
            <Text style={styles.muted}>
              {vehicle.year} • {vehicle.mileage?.toLocaleString() ?? 'N/A'} km
            </Text>
            <Text style={styles.muted}>
              {vehicle.make} {vehicle.model} • {vehicle.sourceName}
            </Text>
            {vehicle.location ? <Text style={styles.muted}>{vehicle.location}</Text> : null}
            {vehicle.description ? (
              <Text style={styles.description}>{vehicle.description}</Text>
            ) : null}
          </View>
        )}
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
  },
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 8,
  },
  placeholder: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: theme.colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 56,
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  price: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  muted: {
    color: theme.colors.textMuted,
  },
  description: {
    color: theme.colors.text,
    marginTop: 8,
    lineHeight: 20,
  },
  error: {
    color: theme.colors.danger,
  },
});
