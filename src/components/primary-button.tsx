import { Pressable, StyleSheet, Text } from 'react-native';

import { useThemeTokens } from '@/src/theme/colors';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'danger';
};

export function PrimaryButton({ label, onPress, tone = 'primary' }: PrimaryButtonProps) {
  const tokens = useThemeTokens();
  const toneStyle = {
    primary: {
      button: { backgroundColor: tokens.primary },
      label: { color: tokens.mode === 'light' ? '#ffffff' : '#04111f' },
    },
    secondary: {
      button: { backgroundColor: tokens.surfaceMuted, borderColor: tokens.border, borderWidth: 1 },
      label: { color: tokens.text },
    },
    danger: {
      button: { backgroundColor: tokens.mode === 'light' ? '#fee2e2' : '#3a1118' },
      label: { color: tokens.danger },
    },
  }[tone];
  return (
    <Pressable style={[styles.button, toneStyle.button]} onPress={onPress}>
      <Text style={[styles.label, toneStyle.label]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
});
