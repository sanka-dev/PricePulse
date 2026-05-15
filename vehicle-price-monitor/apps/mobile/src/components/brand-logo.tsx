import { View, Text, StyleSheet, Platform } from 'react-native';
import { theme } from '@/lib/mobile-theme';

type BrandLogoProps = {
  size?: number;
  color?: string;
};

/**
 * Same wordmark as web `BrandLogo`: semibold "Price" + italic serif "Pulse".
 */
export function BrandLogo({ size = 30, color = theme.colors.text }: BrandLogoProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.price, { fontSize: size, color }]}>Price</Text>
      <Text style={[styles.pulse, { fontSize: size, color }]}>Pulse</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontWeight: '600',
    letterSpacing: -0.8,
  },
  pulse: {
    marginLeft: 2,
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
  },
});
