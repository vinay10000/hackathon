import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { getHabitLogForDate } from '@/src/domain/habits';
import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';
import { Habit } from '@/src/types/habits';

type HabitCardProps = {
  habit: Habit;
  dateKey: string;
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => Promise<void>;
};

export function HabitCard({ habit, dateKey, onOpen, onEdit, onArchive, onDelete }: HabitCardProps) {
  const tokens = useThemeTokens();
  const swipeableRef = useRef<Swipeable | null>(null);
  const log = useAppStore((state) => getHabitLogForDate(state.logs, habit.id, dateKey));
  const toggleComplete = useAppStore((state) => state.toggleHabitComplete);
  const updateHabitValue = useAppStore((state) => state.updateHabitValue);
  const value = log?.value ?? 0;
  const target = habit.targetValue ?? 1;
  const progressText =
    habit.kind === 'count' || habit.kind === 'duration' ? `${value}/${target} ${habit.unit ?? ''}`.trim() : log?.status ?? 'pending';

  function closeActions() {
    swipeableRef.current?.close();
  }

  function handleDelete() {
    closeActions();
    Alert.alert('Delete habit?', 'This permanently removes the habit and all of its logs.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void onDelete();
        },
      },
    ]);
  }

  return (
    <Swipeable
      ref={swipeableRef}
      containerStyle={styles.swipeWrap}
      leftThreshold={42}
      rightThreshold={92}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={() => (
        <View style={styles.leftActions}>
          <SwipeActionButton
            label="Archive"
            icon="archive-outline"
            backgroundColor="#14532d"
            borderColor="rgba(74, 222, 128, 0.32)"
            onPress={() => {
              closeActions();
              onArchive();
            }}
          />
        </View>
      )}
      renderRightActions={() => (
        <View style={styles.rightActions}>
          <SwipeActionButton
            label="Edit"
            icon="create-outline"
            backgroundColor="#172554"
            borderColor="rgba(96, 165, 250, 0.32)"
            onPress={() => {
              closeActions();
              onEdit();
            }}
          />
          <SwipeActionButton
            label="Delete"
            icon="trash-outline"
            backgroundColor="#4c0519"
            borderColor="rgba(248, 113, 113, 0.34)"
            onPress={handleDelete}
          />
        </View>
      )}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${habit.name}, ${progressText}`}
        style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
        onPress={() => {
          closeActions();
          onOpen();
        }}
      >
        <View style={styles.row}>
          <View style={styles.titleWrap}>
            <View style={[styles.iconChip, { backgroundColor: `${habit.color}22` }]}>
              <Ionicons name={habit.icon as React.ComponentProps<typeof Ionicons>['name']} size={22} color={habit.color} />
            </View>
            <View style={styles.titleCopy}>
              <Text style={[styles.title, { color: tokens.text }]}>{habit.name}</Text>
              <Text style={[styles.meta, { color: habit.color }]}>{habit.category}</Text>
            </View>
          </View>
          <View style={styles.trailingMeta}>
            <Text style={[styles.progressTop, { color: log?.status === 'completed' ? habit.color : tokens.text }]}>{progressText}</Text>
            <Text style={[styles.progressBottom, { color: tokens.textMuted }]}>{habit.unit ?? (habit.kind === 'yesNo' ? 'done' : 'today')}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={log?.status === 'completed' ? `Undo ${habit.name}` : `Complete ${habit.name}`}
            style={[styles.doneButton, { backgroundColor: `${habit.color}22`, borderColor: `${habit.color}44` }, log?.status === 'completed' && { backgroundColor: habit.color }]}
            onPress={() => toggleComplete(habit.id, dateKey)}
          >
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
          </View>
        )}
      </Pressable>
    </Swipeable>
  );
}

function SwipeActionButton({
  label,
  icon,
  backgroundColor,
  borderColor,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  backgroundColor: string;
  borderColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.actionButton, { backgroundColor, borderColor }]}>
      <Ionicons name={icon} size={18} color="#ffffff" />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  swipeWrap: {
    borderRadius: 24,
    overflow: 'hidden',
  },
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
  titleCopy: {
    flex: 1,
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
  leftActions: {
    width: 124,
    paddingRight: 8,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    width: 208,
    paddingLeft: 8,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flex: 1,
    alignSelf: 'stretch',
    minHeight: 108,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  actionLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
