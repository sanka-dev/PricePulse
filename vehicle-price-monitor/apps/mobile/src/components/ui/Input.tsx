import { StyleProp, StyleSheet, TextInput, TextInputProps, ViewStyle } from 'react-native';
import { theme } from '@/lib/mobile-theme';

interface InputProps extends TextInputProps {
  style?: StyleProp<ViewStyle>;
}

export function Input({ style, ...props }: InputProps) {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor={theme.colors.textMuted}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    color: theme.colors.text,
    backgroundColor: theme.colors.cardMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
