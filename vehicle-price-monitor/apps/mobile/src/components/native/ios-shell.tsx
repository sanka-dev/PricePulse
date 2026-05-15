import { Platform, StyleSheet } from 'react-native';
import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export function IosTabBarIcon({
  outline,
  filled,
  color,
  focused,
  size = 24,
}: {
  outline: IoniconName;
  filled: IoniconName;
  color: string;
  focused: boolean;
  size?: number;
}) {
  return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
}

/** Bottom nav frosted glass (iOS system material; Android dark blur). */
export function IosTabBarBackground() {
  return (
    <BlurView
      tint={Platform.OS === 'ios' ? 'systemUltraThinMaterialDark' : 'dark'}
      intensity={Platform.OS === 'ios' ? 100 : 82}
      style={StyleSheet.absoluteFill}
    />
  );
}
