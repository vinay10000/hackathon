import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/empty-state';
import { ScreenShell } from '@/src/components/screen-shell';
import { useAppStore, useArchivedHabits } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';

export default function ArchiveScreen() {
  const tokens = useThemeTokens();
  const isLight = tokens.mode === 'light';
  const archived = useArchivedHabits();
  const restoreHabit = useAppStore((state) => state.restoreHabit);

  return (
    <ScreenShell
      title="Archived habits"
      subtitle="Paused habits stay out of your daily flow, but their history is still safe here."
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={[
            styles.backButton,
            {
              backgroundColor: isLight ? '#ffffff' : '#09111d',
              borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.12)',
            },
          ]}
        >
          <Ionicons name="chevron-back" size={18} color={isLight ? '#10243e' : '#e2e8f0'} />
        </Pressable>
      }
    >
      {archived.length ? (
        <>
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: isLight ? '#ffffff' : '#08111f',
                borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.14)',
              },
            ]}
          >
            <View style={[styles.summaryIconWrap, { backgroundColor: isLight ? '#eef4ff' : 'rgba(37,99,235,0.16)', borderColor: isLight ? '#d7e6ff' : 'rgba(96,165,250,0.24)' }]}>
              <Ionicons name="archive-outline" size={22} color={isLight ? '#2563eb' : '#93c5fd'} />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={[styles.summaryCount, { color: isLight ? '#10243e' : '#ffffff' }]}>{archived.length}</Text>
              <Text style={[styles.summaryTitle, { color: isLight ? '#355070' : 'rgba(226,232,240,0.84)' }]}>
                {archived.length === 1 ? 'Habit archived right now' : 'Habits archived right now'}
              </Text>
              <Text style={[styles.summaryBody, { color: isLight ? '#5c6b82' : 'rgba(148,163,184,0.9)' }]}>
                Restore any habit when you want it back in Today, Calendar, and active progress tracking.
              </Text>
            </View>
          </View>

          <View style={styles.list}>
            {archived.map((habit) => (
              <View
                key={habit.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: isLight ? '#ffffff' : '#09111d',
                    borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.12)',
                  },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.iconWrap, { backgroundColor: `${habit.color}22`, borderColor: `${habit.color}55` }]}>
                    <Ionicons name={habit.icon as React.ComponentProps<typeof Ionicons>['name']} size={24} color={habit.color} />
                  </View>

                  <View style={styles.cardCopy}>
                    <Text style={[styles.habitName, { color: isLight ? '#10243e' : '#ffffff' }]}>{habit.name}</Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.metaChip, { backgroundColor: isLight ? '#f2f7ff' : 'rgba(15,23,42,0.32)', borderColor: isLight ? '#d9e6f3' : 'rgba(148,163,184,0.16)' }]}>
                        <Text style={[styles.metaChipText, { color: isLight ? '#355070' : '#dbeafe' }]}>{habit.category || 'Uncategorized'}</Text>
                      </View>
                      <View style={[styles.metaChip, { backgroundColor: isLight ? '#f7fafc' : 'rgba(15,23,42,0.32)', borderColor: isLight ? '#d9e6f3' : 'rgba(148,163,184,0.16)' }]}>
                        <Ionicons name="time-outline" size={12} color={isLight ? '#64748b' : '#a5b4fc'} />
                        <Text style={[styles.metaChipText, { color: isLight ? '#5c6b82' : 'rgba(226,232,240,0.84)' }]}>
                          Archived {formatArchivedDate(habit.archivedAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {habit.description ? (
                  <Text style={[styles.description, { color: isLight ? '#5c6b82' : 'rgba(226,232,240,0.82)' }]}>{habit.description}</Text>
                ) : null}

                <View style={styles.actionsRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Restore ${habit.name}`}
                    onPress={() => restoreHabit(habit.id)}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: isLight ? '#e9f9ef' : '#12321e',
                        borderColor: isLight ? '#bde6c9' : 'rgba(74, 222, 128, 0.3)',
                      },
                    ]}
                  >
                    <Ionicons name="refresh-outline" size={16} color={isLight ? '#166534' : '#86efac'} />
                    <Text style={[styles.actionText, { color: isLight ? '#166534' : '#f0fdf4' }]}>Restore</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${habit.name}`}
                    onPress={() => router.push(`/habit/${habit.id}`)}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: isLight ? '#eef4ff' : '#172554',
                        borderColor: isLight ? '#c9daf8' : 'rgba(96, 165, 250, 0.3)',
                      },
                    ]}
                  >
                    <Ionicons name="arrow-forward-outline" size={16} color={isLight ? '#1d4ed8' : '#bfdbfe'} />
                    <Text style={[styles.actionText, { color: isLight ? '#1d4ed8' : '#eff6ff' }]}>Open</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : (
        <EmptyState
          title="Nothing archived"
          subtitle="Archived habits will appear here with their details intact, ready to restore whenever you need them again."
        />
      )}
    </ScreenShell>
  );
}

function formatArchivedDate(value?: string) {
  if (!value) {
    return 'recently';
  }

  return format(parseISO(value), 'MMM d, yyyy');
}

const styles = StyleSheet.create({
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    gap: 16,
  },
  summaryIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: {
    flex: 1,
    gap: 4,
  },
  summaryCount: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 34,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: 14,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    gap: 8,
  },
  habitName: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    minHeight: 32,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
