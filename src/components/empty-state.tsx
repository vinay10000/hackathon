import { StyleSheet, Text, View } from 'react-native';

import { useThemeTokens } from '@/src/theme/colors';

type EmptyStateProps = {
  title: string;
  subtitle: string;
};

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  const tokens = useThemeTokens();
  return (
    <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <Text style={[styles.title, { color: tokens.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: tokens.textMuted }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
});
