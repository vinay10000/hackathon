import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

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
  const log = useAppStore((state) => getHabitLogForDate(state.logs, habit.id, dateKey));
  const toggleComplete = useAppStore((state) => state.toggleHabitComplete);
  const updateHabitValue = useAppStore((state) => state.updateHabitValue);
  const [menuOpen, setMenuOpen] = useState(false);
  const value = log?.value ?? 0;
  const target = habit.targetValue ?? 1;
  const progressText =
    habit.kind === 'count' || habit.kind === 'duration' ? `${value}/${target} ${habit.unit ?? ''}`.trim() : log?.status ?? 'pending';

  function handleDelete() {
    setMenuOpen(false);
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
    <View
      style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
    >
      <View style={[styles.row, menuOpen && styles.rowMenuOpen]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${habit.name}, ${progressText}`}
          style={styles.openArea}
          onPress={() => {
            setMenuOpen(false);
            onOpen();
          }}
        >
        <View style={styles.titleWrap}>
          <View style={[styles.iconChip, { backgroundColor: `${habit.color}22` }]}>
            <Ionicons name={habit.icon as React.ComponentProps<typeof Ionicons>['name']} size={22} color={habit.color} />
          </View>
          <View style={styles.titleCopy}>
            <Text numberOfLines={2} style={[styles.title, { color: tokens.text }]}>
              {habit.name}
            </Text>
            <Text numberOfLines={1} style={[styles.meta, { color: habit.color }]}>
              {habit.category}
            </Text>
          </View>
        </View>
        </Pressable>

        <View style={styles.actionButtons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={log?.status === 'completed' ? `Undo ${habit.name}` : `Complete ${habit.name}`}
            style={[styles.doneButton, { backgroundColor: `${habit.color}22`, borderColor: `${habit.color}44` }, log?.status === 'completed' && { backgroundColor: habit.color }]}
            onPress={(event) => {
              event.stopPropagation();
              setMenuOpen(false);
              toggleComplete(habit.id, dateKey);
            }}
          >
            <Ionicons name={log?.status === 'completed' ? 'checkmark' : 'add'} size={18} color={log?.status === 'completed' ? '#ffffff' : habit.color} />
          </Pressable>

          <View style={[styles.menuWrap, menuOpen && styles.menuWrapOpen]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open actions for ${habit.name}`}
              style={[styles.menuButton, { borderColor: tokens.border, backgroundColor: tokens.surfaceMuted }]}
              onPress={(event) => {
                event.stopPropagation();
                setMenuOpen((value) => !value);
              }}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={tokens.textMuted} />
            </Pressable>

            {menuOpen ? (
              <View style={[styles.menuPopup, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                <MenuAction
                  label="Edit"
                  icon="create-outline"
                  tint={tokens.primary}
                  onPress={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                />
                <MenuAction
                  label="Archive"
                  icon="archive-outline"
                  tint={tokens.warning}
                  onPress={() => {
                    setMenuOpen(false);
                    onArchive();
                  }}
                />
                <MenuAction
                  label="Delete"
                  icon="trash-outline"
                  tint={tokens.danger}
                  onPress={handleDelete}
                />
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${habit.name}`}
        style={[styles.progressRow, { backgroundColor: tokens.surfaceMuted }]}
        onPress={() => {
          setMenuOpen(false);
          onOpen();
        }}
      >
        <View style={styles.progressCopy}>
          <Text numberOfLines={1} style={[styles.progressTop, { color: log?.status === 'completed' ? habit.color : tokens.text }]}>
            {progressText}
          </Text>
          <Text numberOfLines={1} style={[styles.progressBottom, { color: tokens.textMuted }]}>
            {habit.kind === 'yesNo' ? 'Completion status' : `Target ${target} ${habit.unit ?? ''}`.trim()}
          </Text>
        </View>
        <View style={[styles.progressBadge, { backgroundColor: `${habit.color}18`, borderColor: `${habit.color}30` }]}>
          <Text numberOfLines={1} style={[styles.progressBadgeText, { color: habit.color }]}>
            {habit.kind === 'duration' ? 'Duration' : habit.kind === 'count' ? 'Count' : 'Today'}
          </Text>
        </View>
      </Pressable>

      {(habit.kind === 'count' || habit.kind === 'duration') && (
        <View style={styles.metricRow}>
          <Pressable
            style={[styles.stepButton, { backgroundColor: tokens.surfaceMuted }]}
            onPress={(event) => {
              event.stopPropagation();
              updateHabitValue(habit.id, dateKey, Math.max(0, value - 1));
            }}
          >
            <Ionicons name="remove" size={16} color={tokens.text} />
          </Pressable>
          <Text style={[styles.metricValue, { color: tokens.text }]}>{value}</Text>
          <Pressable
            style={[styles.stepButton, { backgroundColor: tokens.surfaceMuted }]}
            onPress={(event) => {
              event.stopPropagation();
              updateHabitValue(habit.id, dateKey, value + 1);
            }}
          >
            <Ionicons name="add" size={16} color={tokens.text} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function MenuAction({
  label,
  icon,
  tint,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuItem}>
      <Ionicons name={icon} size={14} color={tint} />
      <Text style={[styles.menuLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    overflow: 'visible',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowMenuOpen: {
    zIndex: 30,
  },
  openArea: {
    flex: 1,
    minWidth: 0,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
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
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  progressRow: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressCopy: {
    flex: 1,
    minWidth: 0,
  },
  progressTop: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressBottom: {
    fontSize: 12,
    marginTop: 2,
  },
  progressBadge: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  progressBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  doneButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  menuWrap: {
    position: 'relative',
  },
  menuWrapOpen: {
    zIndex: 40,
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuPopup: {
    position: 'absolute',
    top: 44,
    right: 0,
    width: 132,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    zIndex: 50,
    elevation: 16,
  },
  menuItem: {
    minHeight: 34,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '700',
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
});
