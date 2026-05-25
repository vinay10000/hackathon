import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/empty-state';
import { formatScheduleLabel } from '@/src/domain/habits';
import { useAppStore, useHabitInsights } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';

export default function HabitDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const habit = useAppStore((state) => state.habits.find((item) => item.id === params.id));
  const archiveHabit = useAppStore((state) => state.archiveHabit);
  const restoreHabit = useAppStore((state) => state.restoreHabit);
  const deleteHabit = useAppStore((state) => state.deleteHabit);
  const insight = useHabitInsights(params.id);
  const tokens = useThemeTokens();
  const isLight = tokens.mode === 'light';
  const insets = useSafeAreaInsets();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!habit || !insight) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: tokens.background }]}>
        <View style={styles.missingWrap}>
          <EmptyState title="Habit not found" subtitle="This habit may have been deleted or archived outside this screen." />
        </View>
      </SafeAreaView>
    );
  }

  const scheduleLabel = formatScheduleLabel(habit.schedule);
  const reminderLabel = habit.reminders[0]?.enabled ? habit.reminders[0].time : 'Off';
  const recentLogs = insight.logs.slice(0, 7);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: tokens.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 156 + Math.max(insets.bottom, 12) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[
              styles.headerButton,
              {
                backgroundColor: isLight ? '#ffffff' : '#09111d',
                borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.12)',
              },
            ]}
          >
            <Ionicons name="chevron-back" size={18} color={isLight ? '#10243e' : '#e2e8f0'} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit habit"
            onPress={() => router.push(`/habit/edit/${habit.id}`)}
            style={[
              styles.headerButtonWide,
              {
                backgroundColor: isLight ? '#e7f0ff' : 'rgba(124,58,237,0.16)',
                borderColor: isLight ? '#b8cff8' : 'rgba(167,139,250,0.92)',
              },
            ]}
          >
            <Ionicons name="create-outline" size={16} color={isLight ? '#2563eb' : '#c4b5fd'} />
            <Text style={[styles.headerButtonText, { color: isLight ? '#2563eb' : '#f8fafc' }]}>Edit</Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isLight ? '#ffffff' : '#08111f',
              borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.14)',
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={[styles.heroIconWrap, { backgroundColor: `${habit.color}22`, borderColor: `${habit.color}55` }]}>
              <Ionicons name={habit.icon as React.ComponentProps<typeof Ionicons>['name']} size={34} color={habit.color} />
            </View>

            <View style={styles.heroCopy}>
              <Text style={[styles.heroTitle, { color: isLight ? '#10243e' : '#ffffff' }]}>{habit.name}</Text>
              <Text style={[styles.heroSubtitle, { color: isLight ? habit.color : '#4ade80' }]}>{habit.category}</Text>

              <View style={styles.heroChipRow}>
                <View style={[styles.heroChip, { backgroundColor: isLight ? '#eef4ff' : 'rgba(15,23,42,0.24)', borderColor: isLight ? '#d9e6f3' : 'rgba(148,163,184,0.18)' }]}>
                  <Ionicons name="repeat-outline" size={13} color={isLight ? '#2563eb' : '#93c5fd'} />
                  <Text style={[styles.heroChipText, { color: isLight ? '#355070' : '#dbeafe' }]}>{scheduleLabel}</Text>
                </View>
                <View style={[styles.heroChip, { backgroundColor: isLight ? '#eefcf4' : 'rgba(15,23,42,0.24)', borderColor: isLight ? '#d9e6f3' : 'rgba(148,163,184,0.18)' }]}>
                  <Ionicons name="notifications-outline" size={13} color={isLight ? '#16a34a' : '#4ade80'} />
                  <Text style={[styles.heroChipText, { color: isLight ? '#355070' : '#dbeafe' }]}>Reminder {reminderLabel}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.metricRow}>
            <MetricTile label="Current streak" value={String(insight.streak.current)} tint="#22c55e" mode={tokens.mode} />
            <MetricTile label="Best streak" value={String(insight.streak.best)} tint="#38bdf8" mode={tokens.mode} />
            <MetricTile label="Completion" value={`${insight.completionRate}%`} tint={habit.color} mode={tokens.mode} />
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: isLight ? '#ffffff' : '#09111d',
              borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.12)',
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: tokens.text }]}>About this habit</Text>
          <View style={styles.detailGrid}>
            <DetailBlock label="Description" value={habit.description || 'No description yet.'} />
            <DetailBlock label="Status" value={habit.archivedAt ? 'Archived' : 'Active'} />
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: isLight ? '#ffffff' : '#09111d',
              borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.12)',
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: tokens.text }]}>Recent history</Text>
          {recentLogs.length ? (
            recentLogs.map((log) => (
              <View key={log.id} style={[styles.logRow, { borderColor: isLight ? '#e4ebf4' : 'rgba(148,163,184,0.14)' }]}>
                <View style={styles.logCopy}>
                  <Text style={[styles.logDate, { color: tokens.text }]}>{format(parseISO(log.date), 'MMM d, yyyy')}</Text>
                  <Text style={[styles.logMeta, { color: tokens.textMuted }]}>
                    {log.value !== undefined ? `Value ${log.value}` : 'Quick check-in'}
                    {log.note ? ` • ${log.note}` : ''}
                  </Text>
                </View>
                <View style={[styles.statusBadge, getStatusBadgeStyle(log.status)]}>
                  <Text style={styles.statusText}>{toTitleCase(log.status)}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyHint, { color: tokens.textMuted }]}>No logs yet. Your recent check-ins will show up here.</Text>
          )}
        </View>

        <View
          style={[
            styles.actionCard,
            {
              backgroundColor: isLight ? '#ffffff' : '#09111d',
              borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.12)',
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: tokens.text }]}>Actions</Text>

          {habit.archivedAt ? (
            <ActionButton
              label="Restore habit"
              icon="refresh-outline"
              backgroundColor={isLight ? '#e9f9ef' : '#14532d'}
              borderColor={isLight ? '#bde6c9' : 'rgba(74, 222, 128, 0.3)'}
              textColor={isLight ? '#166534' : '#ffffff'}
              onPress={() => restoreHabit(habit.id)}
            />
          ) : (
            <ActionButton
              label="Archive habit"
              icon="archive-outline"
              backgroundColor={isLight ? '#eef4ff' : '#172554'}
              borderColor={isLight ? '#c9daf8' : 'rgba(96, 165, 250, 0.3)'}
              textColor={isLight ? '#1d4ed8' : '#ffffff'}
              onPress={() => {
                archiveHabit(habit.id);
                router.replace('/today');
              }}
            />
          )}

          {confirmingDelete ? (
            <View style={[styles.deleteCard, { backgroundColor: isLight ? '#fff1f2' : '#3f0d14', borderColor: isLight ? '#fecdd3' : 'rgba(248,113,113,0.34)' }]}>
              <Text style={[styles.deleteTitle, { color: isLight ? '#9f1239' : '#ffffff' }]}>Delete permanently?</Text>
              <Text style={[styles.deleteBody, { color: isLight ? '#9f1239' : 'rgba(254,226,226,0.9)' }]}>This removes the habit and every log tied to it. Archive is safer if you want to keep the history.</Text>
              <View style={styles.deleteActions}>
                <ActionButton
                  label="Cancel"
                  icon="close-outline"
                  backgroundColor={isLight ? '#ffffff' : '#172033'}
                  borderColor={isLight ? '#d9e6f3' : 'rgba(148,163,184,0.22)'}
                  textColor={isLight ? '#10243e' : '#ffffff'}
                  onPress={() => setConfirmingDelete(false)}
                />
                <ActionButton
                  label="Delete habit"
                  icon="trash-outline"
                  backgroundColor={isLight ? '#ffe4e6' : '#7f1d1d'}
                  borderColor={isLight ? '#fda4af' : 'rgba(248,113,113,0.34)'}
                  textColor={isLight ? '#be123c' : '#ffffff'}
                  onPress={async () => {
                    await deleteHabit(habit.id);
                    router.replace('/today');
                  }}
                />
              </View>
            </View>
          ) : (
            <ActionButton
              label="Delete habit"
              icon="trash-outline"
              backgroundColor={isLight ? '#fff1f2' : '#4c0519'}
              borderColor={isLight ? '#fecdd3' : 'rgba(248,113,113,0.34)'}
              textColor={isLight ? '#be123c' : '#ffffff'}
              onPress={() => setConfirmingDelete(true)}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricTile({ label, value, tint, mode }: { label: string; value: string; tint: string; mode: 'light' | 'dark' | 'amoled' }) {
  return (
    <View style={[styles.metricTile, { borderColor: `${tint}33`, backgroundColor: `${tint}14` }]}>
      <Text style={[styles.metricValue, { color: mode === 'light' ? '#10243e' : '#ffffff' }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: tint }]}>{label}</Text>
    </View>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  backgroundColor,
  borderColor,
  textColor,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable onPress={() => void onPress()} style={[styles.actionButton, { backgroundColor, borderColor }]}>
      <Ionicons name={icon} size={18} color={textColor} />
      <Text style={[styles.actionText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'completed':
      return { backgroundColor: 'rgba(34,197,94,0.18)', borderColor: 'rgba(74,222,128,0.3)' };
    case 'partial':
      return { backgroundColor: 'rgba(59,130,246,0.18)', borderColor: 'rgba(96,165,250,0.3)' };
    case 'skipped':
      return { backgroundColor: 'rgba(245,158,11,0.18)', borderColor: 'rgba(251,191,36,0.3)' };
    case 'missed':
      return { backgroundColor: 'rgba(239,68,68,0.18)', borderColor: 'rgba(248,113,113,0.3)' };
    default:
      return { backgroundColor: 'rgba(148,163,184,0.18)', borderColor: 'rgba(148,163,184,0.24)' };
  }
}

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 14,
  },
  missingWrap: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonWide: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    gap: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: 16,
  },
  heroIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: 8,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  heroChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  heroChip: {
    minHeight: 34,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricTile: {
    flex: 1,
    minHeight: 88,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  detailGrid: {
    gap: 12,
  },
  detailBlock: {
    gap: 5,
  },
  detailLabel: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValue: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  logCopy: {
    flex: 1,
    gap: 3,
  },
  logDate: {
    fontSize: 15,
    fontWeight: '700',
  },
  logMeta: {
    fontSize: 13,
    lineHeight: 19,
  },
  statusBadge: {
    minWidth: 82,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyHint: {
    fontSize: 14,
    lineHeight: 21,
  },
  actionCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  actionButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  deleteCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  deleteBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  deleteActions: {
    gap: 10,
  },
});
