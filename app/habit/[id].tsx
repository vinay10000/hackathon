import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/empty-state';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { StatCard } from '@/src/components/stat-card';
import { formatScheduleLabel } from '@/src/domain/habits';
import { useAppStore, useHabitInsights } from '@/src/store/app-store';
import { palette, useThemeTokens } from '@/src/theme/colors';

export default function HabitDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const habit = useAppStore((state) => state.habits.find((item) => item.id === params.id));
  const archiveHabit = useAppStore((state) => state.archiveHabit);
  const restoreHabit = useAppStore((state) => state.restoreHabit);
  const deleteHabit = useAppStore((state) => state.deleteHabit);
  const insight = useHabitInsights(params.id);
  const tokens = useThemeTokens();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!habit || !insight) {
    return (
      <ScreenShell title="Habit details">
        <EmptyState title="Habit not found" subtitle="This habit may have been deleted or archived outside this screen." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={habit.name} subtitle={`${habit.category} · ${formatScheduleLabel(habit.schedule)}`} action={<PrimaryButton label="Edit" tone="secondary" onPress={() => router.push(`/habit/edit/${habit.id}`)} />}>
      <View style={styles.stats}>
        <StatCard label="Current streak" value={String(insight.streak.current)} accent={palette.success} />
        <StatCard label="Best streak" value={String(insight.streak.best)} accent={palette.primary} />
        <StatCard label="Completion rate" value={`${insight.completionRate}%`} accent={palette.warning} />
      </View>

      <View style={[styles.card, { backgroundColor: tokens.mode === 'light' ? '#10243e' : tokens.surface, borderColor: tokens.border }]}>
        <Text style={[styles.cardTitle, { color: tokens.mode === 'light' ? '#ffffff' : tokens.text }]}>Details</Text>
        <Text style={[styles.cardBody, { color: tokens.mode === 'light' ? '#dbeafe' : tokens.textMuted }]}>{habit.description || 'No description yet.'}</Text>
        <Text style={[styles.cardMeta, { color: tokens.mode === 'light' ? '#bfdbfe' : tokens.textMuted }]}>Motivational note: {habit.motivationalNote || 'None yet'}</Text>
        <Text style={[styles.cardMeta, { color: tokens.mode === 'light' ? '#bfdbfe' : tokens.textMuted }]}>Reminders: {habit.reminders[0]?.enabled ? habit.reminders[0].time : 'Off'}</Text>
      </View>

      <View style={[styles.cardLight, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <Text style={[styles.cardTitleDark, { color: tokens.text }]}>Recent log history</Text>
        {insight.logs.slice(0, 7).map((log) => (
          <View key={log.id} style={styles.logRow}>
            <Text style={[styles.logDate, { color: tokens.text }]}>{log.date}</Text>
            <Text style={[styles.logMeta, { color: tokens.textMuted }]}>
              {log.status}
              {log.value ? ` · ${log.value}` : ''}
              {log.note ? ` · ${log.note}` : ''}
            </Text>
          </View>
        ))}
      </View>

      {habit.archivedAt ? <PrimaryButton label="Restore habit" onPress={() => restoreHabit(habit.id)} /> : <PrimaryButton label="Archive habit" tone="secondary" onPress={() => archiveHabit(habit.id)} />}
      {confirmingDelete ? (
        <View style={[styles.deleteCard, { backgroundColor: tokens.surface, borderColor: tokens.danger }]}>
          <Text style={[styles.cardTitleDark, { color: tokens.text }]}>Delete permanently?</Text>
          <Text style={[styles.cardBody, { color: tokens.textMuted }]}>This removes the habit and its logs. Archive keeps history, so deletion requires this extra confirmation.</Text>
          <PrimaryButton
            label="Yes, delete habit"
            tone="danger"
            onPress={async () => {
              await deleteHabit(habit.id);
              router.replace('/(tabs)/today');
            }}
          />
          <PrimaryButton label="Cancel" tone="secondary" onPress={() => setConfirmingDelete(false)} />
        </View>
      ) : (
        <PrimaryButton label="Delete habit" tone="danger" onPress={() => setConfirmingDelete(true)} />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: '#10243e',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 8,
  },
  cardLight: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  deleteCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  cardTitleDark: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.text,
  },
  cardBody: {
    color: '#dbeafe',
    lineHeight: 21,
  },
  cardMeta: {
    color: '#bfdbfe',
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  logDate: {
    fontWeight: '700',
    color: palette.text,
  },
  logMeta: {
    flex: 1,
    textAlign: 'right',
    color: palette.textMuted,
  },
});
