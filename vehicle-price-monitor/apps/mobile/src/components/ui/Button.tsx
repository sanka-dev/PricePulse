import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { theme } from '@/lib/mobile-theme';

type Variant = 'default' | 'outline' | 'destructive' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  disabled = false,
  variant = 'default',
  style,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        variant === 'default' && styles.default,
        variant === 'outline' && styles.outline,
        variant === 'destructive' && styles.destructive,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === 'default' && styles.defaultText,
          variant === 'outline' && styles.outlineText,
          variant === 'destructive' && styles.destructiveText,
          variant === 'ghost' && styles.ghostText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  default: {
    backgroundColor: theme.colors.primary,
  },
  outline: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  destructive: {
    backgroundColor: '#450a0a',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    fontWeight: '700',
    fontSize: 14,
  },
  defaultText: {
    color: theme.colors.primaryText,
  },
  outlineText: {
    color: theme.colors.text,
  },
  destructiveText: {
    color: '#fca5a5',
  },
  ghostText: {
    color: theme.colors.text,
  },
});
