import { StyleSheet, Text, View } from 'react-native';

import { palette, useThemeTokens } from '@/src/theme/colors';

type StatCardProps = {
  label: string;
  value: string;
  accent?: string;
};

export function StatCard({ label, value, accent = palette.primary }: StatCardProps) {
  const tokens = useThemeTokens();
  return (
    <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <Text style={[styles.value, { color: tokens.text }]}>{value}</Text>
      <Text style={[styles.label, { color: tokens.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 110,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
  },
  label: {
    fontSize: 13,
  },
});
