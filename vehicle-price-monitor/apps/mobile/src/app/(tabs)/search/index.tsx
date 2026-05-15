import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient, type MarketplaceListing } from '@/lib/api-client';
import { theme } from '@/lib/mobile-theme';
import { Badge, Button, Card, CardContent, Input, SectionHeader } from '@/components/ui';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MarketplaceListing[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [sourceCounts, setSourceCounts] = useState({ ikman: 0, riyasewana: 0 });

  const handleSearch = async () => {
    if (query.trim().length < 2) return;

    setIsLoading(true);
    setErrors([]);
    try {
      const response = await apiClient.listings.searchMarketplaces(query.trim(), 24);
      const payload = response.data;
      setResults(payload.data);
      setSourceCounts(payload.bySource);
      setErrors(payload.errors || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      setErrors([message]);
      setResults([]);
      setSourceCounts({ ikman: 0, riyasewana: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const renderListing = ({ item }: { item: MarketplaceListing }) => (
    <Pressable
      onPress={() => {
        Linking.openURL(item.url).catch(() => {
          
        });
      }}
    >
      <Card style={styles.card}>
      <View style={styles.imageBox}>
        {item.imageUrls?.[0] ? (
          <Image source={{ uri: item.imageUrls[0] }} style={styles.image} />
        ) : (
          <Text style={styles.imageFallback}>No image</Text>
        )}
      </View>
      <CardContent style={styles.cardBody}>
        <Text style={styles.source}>{item.source.toUpperCase()}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {item.price !== null ? (
          <Text style={styles.price}>LKR {item.price.toLocaleString()}</Text>
        ) : (
          <Text style={styles.muted}>Price unavailable</Text>
        )}
        <Text style={styles.muted} numberOfLines={1}>
          {item.location || 'Unknown location'}
        </Text>
        <View style={styles.metaRow}>
          {item.year ? <Badge>{item.year}</Badge> : null}
          {item.mileage ? (
            <Badge>{item.mileage.toLocaleString()} km</Badge>
          ) : null}
        </View>
      </CardContent>
      </Card>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <SectionHeader
          title="Vehicle Search"
          subtitle="Search live across Ikman and Riyasewana"
        />
      </View>

      <View style={styles.searchBox}>
        <Input
          style={styles.input as any}
          value={query}
          onChangeText={setQuery}
          placeholder="Search: Toyota Aqua, Prado..."
          autoCapitalize="none"
          onSubmitEditing={handleSearch}
        />
        <Button
          label={isLoading ? 'Searching...' : 'Search'}
          onPress={handleSearch}
          disabled={query.trim().length < 2 || isLoading}
          style={styles.searchButton}
        />
      </View>

      <Text style={styles.summary}>
        {results.length} results (Ikman: {sourceCounts.ikman}, Riyasewana:{' '}
        {sourceCounts.riyasewana})
      </Text>

      {errors.length > 0 ? (
        <View style={styles.errorBox}>
          {errors.map((errorItem) => (
            <Text key={errorItem} style={styles.errorText}>
              {errorItem}
            </Text>
          ))}
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.text} />
          <Text style={styles.muted}>Searching listings...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.source}-${item.sourceListingId}`}
          renderItem={renderListing}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            query.trim().length > 0 ? (
              <Text style={styles.mutedCenter}>No results found.</Text>
            ) : (
              <Text style={styles.mutedCenter}>Search to see listings.</Text>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  input: {
    flex: 1,
  },
  searchButton: {
    minWidth: 100,
  },
  summary: {
    color: theme.colors.textMuted,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  errorBox: {
    marginHorizontal: 16,
    backgroundColor: '#450a0a',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 12,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  imageBox: {
    height: 160,
    backgroundColor: theme.colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    color: theme.colors.textMuted,
  },
  cardBody: {
    padding: 12,
    gap: 4,
  },
  source: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  price: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  muted: {
    color: theme.colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  mutedCenter: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 32,
  },
});
