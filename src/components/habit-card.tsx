import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getHabitLogForDate } from '@/src/domain/habits';
import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';
import { Habit } from '@/src/types/habits';

type HabitCardProps = {
  habit: Habit;
  dateKey: string;
  onOpen: () => void;
};

export function HabitCard({ habit, dateKey, onOpen }: HabitCardProps) {
  const tokens = useThemeTokens();
  const log = useAppStore((state) => getHabitLogForDate(state.logs, habit.id, dateKey));
  const toggleComplete = useAppStore((state) => state.toggleHabitComplete);
  const skipHabit = useAppStore((state) => state.skipHabit);
  const updateHabitValue = useAppStore((state) => state.updateHabitValue);
  const updateHabitNote = useAppStore((state) => state.updateHabitNote);

  const value = log?.value ?? 0;
  const target = habit.targetValue ?? 1;
  const progressText =
    habit.kind === 'count' || habit.kind === 'duration' ? `${value}/${target} ${habit.unit ?? ''}`.trim() : log?.status ?? 'pending';

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${habit.name}, ${progressText}`} style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]} onPress={onOpen}>
      <View style={styles.row}>
        <View style={styles.titleWrap}>
          <View style={[styles.iconChip, { backgroundColor: `${habit.color}22` }]}>
            <Ionicons name={habit.icon as React.ComponentProps<typeof Ionicons>['name']} size={22} color={habit.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: tokens.text }]}>{habit.name}</Text>
            <Text style={[styles.meta, { color: habit.color }]}>{habit.category}</Text>
          </View>
        </View>
        <View style={styles.trailingMeta}>
          <Text style={[styles.progressTop, { color: log?.status === 'completed' ? habit.color : tokens.text }]}>{progressText}</Text>
          <Text style={[styles.progressBottom, { color: tokens.textMuted }]}>{habit.unit ?? (habit.kind === 'yesNo' ? 'done' : 'today')}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={log?.status === 'completed' ? `Undo ${habit.name}` : `Complete ${habit.name}`} style={[styles.doneButton, { backgroundColor: `${habit.color}22`, borderColor: `${habit.color}44` }, log?.status === 'completed' && { backgroundColor: habit.color }]} onPress={() => toggleComplete(habit.id, dateKey)}>
          <Ionicons name={log?.status === 'completed' ? 'checkmark' : 'add'} size={18} color={log?.status === 'completed' ? '#ffffff' : habit.color} />
        </Pressable>
      </View>

      {(habit.kind === 'count' || habit.kind === 'duration') && (
        <View style={styles.metricRow}>
          <Pressable style={[styles.stepButton, { backgroundColor: tokens.surfaceMuted }]} onPress={() => updateHabitValue(habit.id, dateKey, Math.max(0, value - 1))}>
            <Ionicons name="remove" size={16} color={tokens.text} />
          </Pressable>
          <Text style={[styles.metricValue, { color: tokens.text }]}>{value}</Text>
          <Pressable style={[styles.stepButton, { backgroundColor: tokens.surfaceMuted }]} onPress={() => updateHabitValue(habit.id, dateKey, value + 1)}>
            <Ionicons name="add" size={16} color={tokens.text} />
          </Pressable>
          <Pressable style={[styles.skipButton, { backgroundColor: tokens.mode === 'light' ? '#fff7ed' : tokens.surfaceMuted }]} onPress={() => skipHabit(habit.id, dateKey)}>
            <Text style={[styles.skipLabel, { color: tokens.warning }]}>Skip</Text>
          </Pressable>
        </View>
      )}

      <TextInput
        value={log?.note ?? ''}
        onChangeText={(nextValue) => updateHabitNote(habit.id, dateKey, nextValue)}
        placeholder="Quick note for today"
        placeholderTextColor={tokens.textMuted}
        style={[styles.noteInput, { backgroundColor: tokens.surfaceMuted, color: tokens.text }]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  iconChip: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  meta: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  trailingMeta: {
    alignItems: 'flex-end',
    marginLeft: 'auto',
  },
  progressTop: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressBottom: {
    fontSize: 12,
    marginTop: 2,
  },
  doneButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    minWidth: 42,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  skipButton: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  skipLabel: {
    fontWeight: '700',
  },
  noteInput: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
