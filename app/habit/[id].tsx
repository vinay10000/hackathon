import { Ionicons } from '@expo/vector-icons';
import { addMonths, eachDayOfInterval, format, isAfter, isSameMonth, isToday, parseISO, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/empty-state';
import { buildMonthGrid, formatScheduleLabel, getHabitLogForDate, getLogStatusForHabitOnDate, isHabitScheduledForDate } from '@/src/domain/habits';
import { useAppStore, useHabitInsights } from '@/src/store/app-store';
import { ThemeTokens, useThemeTokens } from '@/src/theme/colors';
import { Habit, HabitLog, HabitLogStatus } from '@/src/types/habits';

type TimelineStatus = 'completed' | 'partial' | 'skipped' | 'missed' | 'started';

type TimelineEvent = {
  id: string;
  date: string;
  status: TimelineStatus;
  title: string;
  badgeLabel: string;
  badgeTone: 'success' | 'primary' | 'warning' | 'danger' | 'muted';
  note?: string;
  valueLabel?: string;
  milestoneLabel?: string;
};

type HabitDayTrend = {
  dateKey: string;
  label: string;
  completedCount: number;
  scheduledCount: number;
  percentage: number;
};

const CHART_HEIGHT = 188;
const CHART_SIDE_LABEL_WIDTH = 42;
const CHART_BOTTOM_LABEL_HEIGHT = 54;
const CHART_TOP_PADDING = 10;
const CHART_RIGHT_PADDING = 14;
const CHART_DOT_SIZE = 12;
const CHART_POINT_LABEL_WIDTH = 40;
const CHART_HORIZONTAL_INSET = 18;

export default function HabitDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const habit = useAppStore((state) => state.habits.find((item) => item.id === params.id));
  const archiveHabit = useAppStore((state) => state.archiveHabit);
  const restoreHabit = useAppStore((state) => state.restoreHabit);
  const deleteHabit = useAppStore((state) => state.deleteHabit);
  const toggleHabitComplete = useAppStore((state) => state.toggleHabitComplete);
  const insight = useHabitInsights(params.id);
  const tokens = useThemeTokens();
  const isLight = tokens.mode === 'light';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));

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
  const timelineEvents = buildTimelineEvents(habit, insight.logs);
  const monthSections = groupTimelineEventsByMonth(timelineEvents);
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const weeklyTrend = getDayKeysEndingOn(todayKey, 7).map((dateKey) => buildHabitDayTrend(dateKey, habit, insight.logs));
  const weeklyScheduled = sum(weeklyTrend.map((day) => day.scheduledCount));
  const weeklyCompleted = sum(weeklyTrend.map((day) => day.completedCount));
  const weeklyCompletionRate = weeklyScheduled ? Math.round((weeklyCompleted / weeklyScheduled) * 100) : 0;
  const isNarrowChart = width < 390;
  const chartWidth = Math.max(width - 28 - 36 - CHART_SIDE_LABEL_WIDTH - CHART_RIGHT_PADDING, 212);
  const footerItemWidth = Math.max(Math.floor((chartWidth - 8) / weeklyTrend.length), isNarrowChart ? 36 : 40);
  const chartPoints = buildChartPoints(weeklyTrend, chartWidth, CHART_HEIGHT);
  const calendarDays = buildMonthGrid(calendarMonth);
  const currentMonthStart = startOfMonth(today);
  const canGoToNextMonth = !isSameMonth(calendarMonth, currentMonthStart) && !isAfter(addMonths(calendarMonth, 1), currentMonthStart);
  const completionMessage =
    insight.completionRate >= 85 ? 'Locked in this cycle' : insight.completionRate >= 60 ? 'Momentum is building' : 'Still setting the pace';
  const nextWinLabel = insight.streak.current > 0 ? `Day ${insight.streak.current + 1} is next` : 'First streak starts today';

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
            styles.trendCard,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
            },
          ]}
        >
          <View style={[styles.trendHeader, isNarrowChart && styles.trendHeaderStacked]}>
            <View style={styles.trendHeaderCopy}>
              <Text style={[styles.sectionTitle, { color: tokens.text }]}>Weekly trend</Text>
              <Text style={[styles.trendSubtitle, { color: tokens.textMuted }]}>
                {weeklyCompleted}/{weeklyScheduled || 0} real check-ins this week
              </Text>
            </View>
          </View>

          <View style={styles.trendScoreRow}>
            <Text style={[styles.trendScoreValue, { color: tokens.text }]}>{weeklyCompletionRate}%</Text>
            <Text style={[styles.trendScoreCaption, { color: tokens.textMuted }]}>completion for {habit.name}</Text>
          </View>

          <View style={styles.chartFrame}>
            <View style={styles.yAxis}>
              {[100, 75, 50, 25, 0].map((label) => (
                <Text key={label} style={[styles.axisLabel, { color: tokens.textMuted }]}>
                  {label}%
                </Text>
              ))}
            </View>

            <View style={[styles.chartArea, { width: chartWidth, height: CHART_HEIGHT }]}>
              <View style={styles.chartPlot}>
                {[100, 75, 50, 25, 0].map((label) => (
                  <View
                    key={`grid-${label}`}
                    style={[
                      styles.gridLine,
                      {
                        top: getChartTop(label, CHART_HEIGHT),
                        borderColor: label === 0 ? (isLight ? 'rgba(148, 163, 184, 0.36)' : 'rgba(105, 131, 164, 0.38)') : (isLight ? 'rgba(148, 163, 184, 0.2)' : 'rgba(105, 131, 164, 0.22)'),
                      },
                    ]}
                  />
                ))}

                {chartPoints.map((point) => (
                  <View
                    key={`vertical-${point.label}`}
                    style={[
                      styles.verticalLine,
                      {
                        left: point.x,
                        height: CHART_HEIGHT - CHART_BOTTOM_LABEL_HEIGHT,
                        backgroundColor: isLight ? 'rgba(148, 163, 184, 0.18)' : 'rgba(105, 131, 164, 0.14)',
                      },
                    ]}
                  />
                ))}

                {chartPoints.slice(0, -1).map((point, index) => {
                  const next = chartPoints[index + 1];
                  const dx = next.x - point.x;
                  const dy = next.y - point.y;
                  const length = Math.sqrt(dx * dx + dy * dy);
                  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

                  return (
                    <View
                      key={`segment-${point.label}`}
                      style={[
                        styles.chartSegment,
                        {
                          left: point.x + dx / 2 - length / 2,
                          top: point.y + dy / 2 - 2,
                          width: length,
                          backgroundColor: habit.color,
                          transform: [{ rotate: `${angle}deg` }],
                        },
                      ]}
                    />
                  );
                })}

                {chartPoints.map((point) => (
                  <View key={`fill-${point.label}`} style={[styles.areaFill, point.fillStyle, { backgroundColor: `${habit.color}18` }]} />
                ))}

                {chartPoints.map((point, index) => (
                  <View key={`point-${point.label}`}>
                    <Text
                      style={[
                        styles.pointValue,
                        {
                          left: clamp(point.x - CHART_POINT_LABEL_WIDTH / 2, 0, chartWidth - CHART_POINT_LABEL_WIDTH),
                          top: point.y - 32,
                          color: tokens.text,
                        },
                      ]}
                    >
                      {weeklyTrend[index]?.percentage ?? 0}%
                    </Text>
                    <View
                      style={[
                        styles.pointOuter,
                        {
                          left: point.x - CHART_DOT_SIZE / 2,
                          top: point.y - CHART_DOT_SIZE / 2,
                          backgroundColor: `${habit.color}66`,
                        },
                      ]}
                    >
                      <View style={[styles.pointInner, { backgroundColor: habit.color }]} />
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.chartFooter}>
                {weeklyTrend.map((day, index) => {
                  const isTodayItem = index === weeklyTrend.length - 1;
                  return (
                    <View
                      key={`footer-${day.dateKey}`}
                      style={[
                        styles.footerDayItem,
                        { width: footerItemWidth },
                        isNarrowChart && styles.footerDayItemCompact,
                        isTodayItem && { backgroundColor: `${habit.color}18` },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.footerDayLabel,
                          isNarrowChart && styles.footerDayLabelCompact,
                          { color: isTodayItem ? habit.color : tokens.textMuted },
                        ]}
                      >
                        {day.label}
                      </Text>
                      <Text style={[styles.footerDayDate, isNarrowChart && styles.footerDayDateCompact, { color: isTodayItem ? habit.color : tokens.text }]}>
                        {format(parseISO(day.dateKey), 'd')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
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
          <View style={styles.heroGlowRow}>
            <View style={[styles.heroGlow, { backgroundColor: `${habit.color}1b` }]} />
            <View style={[styles.heroGlowSecondary, { backgroundColor: isLight ? 'rgba(59, 130, 246, 0.08)' : 'rgba(56, 189, 248, 0.12)' }]} />
          </View>

          <View style={styles.heroTopRow}>
            <View style={[styles.heroIconWrap, { backgroundColor: `${habit.color}22`, borderColor: `${habit.color}55` }]}>
              <Ionicons name={habit.icon as React.ComponentProps<typeof Ionicons>['name']} size={32} color={habit.color} />
            </View>

            <View style={styles.heroCopy}>
              <View style={styles.heroTitleRow}>
                <View style={[styles.heroPill, { backgroundColor: `${habit.color}18`, borderColor: `${habit.color}38` }]}>
                  <Text style={[styles.heroPillText, { color: habit.color }]}>{habit.category}</Text>
                </View>
                <View
                  style={[
                    styles.heroPill,
                    {
                      backgroundColor: isLight ? '#edf4ff' : 'rgba(15,23,42,0.42)',
                      borderColor: isLight ? '#d6e4ff' : 'rgba(148,163,184,0.18)',
                    },
                  ]}
                >
                  <Text style={[styles.heroPillText, { color: isLight ? '#355070' : '#cbd5e1' }]}>{nextWinLabel}</Text>
                </View>
              </View>
              <Text style={[styles.heroTitle, { color: isLight ? '#10243e' : '#ffffff' }]}>{habit.name}</Text>
              <Text style={[styles.heroSubtitle, { color: isLight ? '#355070' : '#cbd5e1' }]}>{completionMessage}</Text>
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

          <View
            style={[
              styles.heroProgressCard,
              {
                backgroundColor: isLight ? '#f4f8ff' : 'rgba(10, 19, 35, 0.82)',
                borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.12)',
              },
            ]}
          >
            <View style={styles.heroProgressHeader}>
              <Text style={[styles.heroProgressEyebrow, { color: isLight ? '#64748b' : '#93a4bd' }]}>Completion rate</Text>
              <View style={[styles.heroCompletionBadge, { backgroundColor: `${habit.color}18`, borderColor: `${habit.color}38` }]}>
                <Ionicons name="sparkles-outline" size={12} color={habit.color} />
                <Text style={[styles.heroCompletionBadgeText, { color: habit.color }]}>{completionMessage}</Text>
              </View>
            </View>
            <View style={styles.heroProgressValueRow}>
              <Text style={[styles.heroProgressValue, { color: isLight ? '#10243e' : '#ffffff' }]}>{insight.completionRate}%</Text>
              <Text style={[styles.heroProgressCaption, { color: isLight ? '#64748b' : '#8ca0bc' }]}>
                {insight.streak.current > 0 ? `${insight.streak.current} day streak` : 'Start your streak today'}
              </Text>
            </View>
            <View style={[styles.heroProgressTrack, { backgroundColor: isLight ? '#dbeafe' : 'rgba(37, 99, 235, 0.16)' }]}>
              <View style={[styles.heroProgressFill, { width: `${Math.max(8, insight.completionRate)}%`, backgroundColor: habit.color }]} />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.metricGrid}
          >
            <MetricTile label="Current" value={String(insight.streak.current)} tint="#22c55e" mode={tokens.mode} accent="streak" />
            <MetricTile label="Best" value={String(insight.streak.best)} tint="#38bdf8" mode={tokens.mode} accent="record" />
            <MetricTile label="Reminder" value={reminderLabel} tint={habit.color} mode={tokens.mode} accent="active" />
          </ScrollView>
        </View>

        <View
          style={[
            styles.sectionCard,
            styles.calendarSectionCard,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
            },
          ]}
        >
          <View style={styles.calendarHeader}>
            <Text style={[styles.sectionTitle, { color: tokens.text }]}>Calendar</Text>
            <Text style={[styles.calendarHint, { color: tokens.textMuted }]}>Tap any past or current day to mark or undo it.</Text>
          </View>

          <View style={styles.calendarMonthHeader}>
            <CalendarNavButton direction="left" tokens={tokens} onPress={() => setCalendarMonth((value) => subMonths(value, 1))} />
            <Text style={[styles.calendarMonthTitle, { color: tokens.text }]}>{format(calendarMonth, 'MMMM yyyy')}</Text>
            <CalendarNavButton
              direction="right"
              tokens={tokens}
              disabled={!canGoToNextMonth}
              onPress={() => {
                if (canGoToNextMonth) {
                  setCalendarMonth((value) => addMonths(value, 1));
                }
              }}
            />
          </View>

          <View style={styles.calendarWeekHeader}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
              <Text key={label} style={[styles.calendarWeekday, { color: tokens.textMuted }]}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const inMonth = isSameMonth(day, calendarMonth);
              const isFuture = dateKey > todayKey;
              const isScheduled = inMonth && isCalendarDayCompletable(habit, dateKey, todayKey, insight.logs);
              const status = getLogStatusForHabitOnDate(habit, insight.logs, dateKey);
              const cellColors = getHabitCalendarDayColors({
                tokens,
                status,
                inMonth,
                isFuture,
                isCurrentDay: dateKey === todayKey,
                isScheduled,
              });
              const isPressable = inMonth && isScheduled && !isFuture;

              return (
                <Pressable
                  key={dateKey}
                  accessibilityRole="button"
                  accessibilityLabel={`Mark ${format(day, 'MMMM d, yyyy')} as complete`}
                  disabled={!isPressable}
                  onPress={() => toggleHabitComplete(habit.id, dateKey)}
                  style={[
                    styles.calendarDayCell,
                    {
                      backgroundColor: cellColors.backgroundColor,
                      borderColor: cellColors.borderColor,
                      opacity: inMonth ? 1 : 0,
                    },
                    isPressable && styles.calendarDayCellActive,
                  ]}
                >
                  <Text style={[styles.calendarDayLabel, { color: cellColors.textColor }]}>{format(day, 'd')}</Text>
                  {status === 'completed' ? <Ionicons name="checkmark" size={12} color={cellColors.accentColor} style={styles.calendarDayIcon} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            styles.timelineSectionCard,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
            },
          ]}
        >
          <View style={styles.timelineHeader}>
            <View style={styles.timelineHeaderCopy}>
              <Ionicons name="git-branch-outline" size={18} color={tokens.success} />
              <Text style={[styles.sectionTitle, { color: tokens.text }]}>Timeline</Text>
            </View>
          </View>
          {monthSections.length ? (
            monthSections.map((section) => (
              <View key={section.monthKey} style={styles.timelineSection}>
                <View style={styles.timelineMonthRow}>
                  <Text style={[styles.timelineMonthLabel, { color: tokens.textMuted }]}>{section.monthLabel}</Text>
                  <View style={[styles.timelineMonthDivider, { backgroundColor: tokens.border }]} />
                </View>

                {section.events.map((event, index) => {
                  const statusTone = getTimelineTone(event.badgeTone, tokens);
                  const eventDate = parseISO(event.date);
                  const showLine = index < section.events.length - 1;

                  return (
                    <View key={event.id} style={styles.timelineItem}>
                      <View style={[styles.timelineCard, { backgroundColor: tokens.surfaceMuted, borderColor: tokens.border }]}>
                        <View style={styles.timelineCardTopRow}>
                          <View
                            style={[
                              styles.timelineIconBlock,
                              {
                                backgroundColor: statusTone.soft,
                                borderColor: statusTone.border,
                                shadowColor: statusTone.glow,
                              },
                            ]}
                          >
                            <Ionicons name={getTimelineIcon(event.status)} size={14} color={statusTone.icon} />
                          </View>

                          <View style={[styles.timelineDateBlock, { backgroundColor: tokens.mode === 'light' ? '#ffffff' : '#101a2b', borderColor: tokens.border }]}>
                            <Text style={[styles.timelineDateDay, { color: tokens.text }]}>{format(eventDate, 'd')}</Text>
                            <Text style={[styles.timelineDateMonth, { color: tokens.textMuted }]}>{format(eventDate, 'MMM')}</Text>
                          </View>

                          <View style={styles.timelineContent}>
                            <View style={styles.timelineMetaRow}>
                              <Text style={[styles.timelineWeekday, { color: tokens.textMuted }]}>{format(eventDate, 'EEE')}</Text>
                              {isToday(eventDate) ? (
                                <View style={[styles.timelineTodayBadge, { backgroundColor: tokens.primarySoft, borderColor: tokens.primary }]}>
                                  <Text style={[styles.timelineTodayText, { color: tokens.primary }]}>Today</Text>
                                </View>
                              ) : null}
                              <View style={[styles.timelineStatusBadge, { backgroundColor: statusTone.soft, borderColor: statusTone.border }]}>
                                <Text style={[styles.timelineStatusText, { color: statusTone.text }]}>{event.badgeLabel}</Text>
                              </View>
                            </View>

                            <Text style={[styles.timelineTitle, { color: tokens.text }]}>{event.title}</Text>
                            {event.milestoneLabel ? <Text style={[styles.timelineMilestone, { color: statusTone.text }]}>{event.milestoneLabel}</Text> : null}
                            {event.valueLabel || event.note ? (
                              <Text style={[styles.timelineBody, { color: tokens.textMuted }]}>
                                {[event.valueLabel, event.note].filter(Boolean).join(' • ')}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </View>

                      {showLine ? <View style={[styles.timelineDivider, { backgroundColor: tokens.border }]} /> : null}
                    </View>
                  );
                })}
              </View>
            ))
          ) : (
            <Text style={[styles.emptyHint, { color: tokens.textMuted }]}>No timeline entries yet. Once this habit has real check-ins, they will appear here.</Text>
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

function MetricTile({
  label,
  value,
  tint,
  mode,
  accent,
}: {
  label: string;
  value: string;
  tint: string;
  mode: 'light' | 'dark' | 'amoled';
  accent: string;
}) {
  return (
    <View style={[styles.metricTile, { borderColor: `${tint}33`, backgroundColor: `${tint}14` }]}>
      <View style={styles.metricTileHeader}>
        <View style={[styles.metricAccentDot, { backgroundColor: tint }]} />
        <Text style={[styles.metricLabel, { color: tint }]}>{label}</Text>
      </View>
      <Text style={[styles.metricValue, { color: mode === 'light' ? '#10243e' : '#ffffff' }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.metricAccentText, { color: mode === 'light' ? '#4b5563' : '#94a3b8' }]}>{accent}</Text>
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

function CalendarNavButton({
  direction,
  disabled,
  onPress,
  tokens,
}: {
  direction: 'left' | 'right';
  disabled?: boolean;
  onPress: () => void;
  tokens: ThemeTokens;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.calendarNavButton,
        {
          backgroundColor: disabled ? tokens.surfaceMuted : tokens.surface,
          borderColor: tokens.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Ionicons name={direction === 'left' ? 'chevron-back' : 'chevron-forward'} size={20} color={tokens.text} />
    </Pressable>
  );
}

function isCalendarDayCompletable(habit: Habit, dateKey: string, todayKey: string, logs: HabitLog[]) {
  if (dateKey > todayKey) {
    return false;
  }

  const currentDate = parseISO(dateKey);
  if (habit.endDate && currentDate > parseISO(habit.endDate)) {
    return false;
  }

  return true;
}

function getDayKeysEndingOn(endDateKey: string, days: number) {
  const end = startOfDay(parseISO(endDateKey));
  const start = subDays(end, days - 1);

  return eachDayOfInterval({ start, end }).map((date) => format(date, 'yyyy-MM-dd'));
}

function buildHabitDayTrend(dateKey: string, habit: Habit, logs: HabitLog[]): HabitDayTrend {
  const log = getHabitLogForDate(logs, habit.id, dateKey);
  const isScheduled = Boolean(log) || isHabitScheduledForDate(habit, dateKey, logs);
  const completedCount = log?.status === 'completed' ? 1 : 0;
  const scheduledCount = isScheduled ? 1 : 0;

  return {
    dateKey,
    label: format(parseISO(dateKey), 'EEE').toUpperCase().slice(0, 3),
    completedCount,
    scheduledCount,
    percentage: scheduledCount ? Math.round((completedCount / scheduledCount) * 100) : 0,
  };
}

function buildChartPoints(days: HabitDayTrend[], chartWidth: number, chartHeight: number) {
  const innerHeight = chartHeight - CHART_BOTTOM_LABEL_HEIGHT - CHART_TOP_PADDING;
  const horizontalInset = Math.min(CHART_HORIZONTAL_INSET, Math.max(12, chartWidth * 0.06));
  const usableWidth = Math.max(chartWidth - horizontalInset * 2, 0);
  const step = days.length > 1 ? usableWidth / (days.length - 1) : 0;

  return days.map((day, index) => {
    const x = horizontalInset + step * index;
    const y = CHART_TOP_PADDING + ((100 - day.percentage) / 100) * innerHeight;
    const fillHeight = chartHeight - CHART_BOTTOM_LABEL_HEIGHT - y;

    return {
      label: day.label,
      x,
      y,
      fillStyle: {
        left: x - step / 2,
        width: Math.max(18, step),
        top: y,
        height: Math.max(0, fillHeight),
      },
    };
  });
}

function getChartTop(value: number, chartHeight: number) {
  const innerHeight = chartHeight - CHART_BOTTOM_LABEL_HEIGHT - CHART_TOP_PADDING;
  return CHART_TOP_PADDING + ((100 - value) / 100) * innerHeight;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getHabitCalendarDayColors({
  tokens,
  status,
  inMonth,
  isFuture,
  isCurrentDay,
  isScheduled,
}: {
  tokens: ThemeTokens;
  status: HabitLogStatus;
  inMonth: boolean;
  isFuture: boolean;
  isCurrentDay: boolean;
  isScheduled: boolean;
}) {
  if (!inMonth) {
    return {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: 'transparent',
      accentColor: 'transparent',
    };
  }

  if (isFuture) {
    return {
      backgroundColor: tokens.surface,
      borderColor: tokens.border,
      textColor: tokens.textMuted,
      accentColor: tokens.textMuted,
    };
  }

  if (status === 'completed') {
    return {
      backgroundColor: tokens.mode === 'light' ? '#16a34a' : '#22c55e',
      borderColor: tokens.mode === 'light' ? '#15803d' : '#22c55e',
      textColor: '#ffffff',
      accentColor: '#ffffff',
    };
  }

  if (status === 'partial') {
    return {
      backgroundColor: tokens.primarySoft,
      borderColor: tokens.primary,
      textColor: tokens.primary,
      accentColor: tokens.primary,
    };
  }

  if (status === 'skipped') {
    return {
      backgroundColor: `${tokens.warning}15`,
      borderColor: `${tokens.warning}66`,
      textColor: tokens.warning,
      accentColor: tokens.warning,
    };
  }

  if (status === 'missed') {
    return {
      backgroundColor: `${tokens.danger}14`,
      borderColor: `${tokens.danger}55`,
      textColor: tokens.danger,
      accentColor: tokens.danger,
    };
  }

  if (isCurrentDay) {
    return {
      backgroundColor: tokens.primarySoft,
      borderColor: tokens.primary,
      textColor: tokens.primary,
      accentColor: tokens.primary,
    };
  }

  if (isScheduled) {
    return {
      backgroundColor: tokens.surface,
      borderColor: tokens.border,
      textColor: tokens.text,
      accentColor: tokens.text,
    };
  }

  return {
    backgroundColor: tokens.surfaceMuted,
    borderColor: tokens.border,
    textColor: tokens.textMuted,
    accentColor: tokens.textMuted,
  };
}

function buildTimelineEvents(habit: Habit, logs: HabitLog[]) {
  const completionMilestones = new Set([7, 14, 21, 30]);
  let completionRun = 0;

  const logEvents = [...logs]
    .filter((log): log is HabitLog & { status: Exclude<HabitLog['status'], 'pending'> } => log.status !== 'pending')
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((log) => {
      completionRun = log.status === 'completed' ? completionRun + 1 : 0;
      const valueLabel = formatLogValue(log.value, habit.unit);
      const title = getTimelineTitle(log.status);
      const tone = getBadgeTone(log.status);
      const milestoneLabel = completionMilestones.has(completionRun) ? `${completionRun}-day streak` : undefined;

      const event: TimelineEvent = {
        id: log.id,
        date: log.date,
        status: log.status,
        title,
        badgeLabel: toTitleCase(log.status),
        badgeTone: tone,
        note: log.note?.trim() || undefined,
        valueLabel,
      };

      if (!milestoneLabel) {
        return [event];
      }

      return [
        event,
        {
          id: `${log.id}-milestone`,
          date: log.date,
          status: 'completed',
          title: milestoneLabel,
          badgeLabel: 'Milestone',
          badgeTone: 'success',
          milestoneLabel: `${completionRun} real completed days reached`,
        } satisfies TimelineEvent,
      ];
    });

  return [
    {
      id: `${habit.id}-started`,
      date: habit.startDate,
      status: 'started' as const,
      title: 'Habit started',
      badgeLabel: 'Started',
      badgeTone: 'primary' as const,
      note: habit.description || undefined,
    },
    ...logEvents,
  ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

function groupTimelineEventsByMonth(events: TimelineEvent[]) {
  const grouped = new Map<string, TimelineEvent[]>();

  for (const event of events) {
    const monthKey = event.date.slice(0, 7);
    const existing = grouped.get(monthKey) ?? [];
    existing.push(event);
    grouped.set(monthKey, existing);
  }

  return Array.from(grouped.entries()).map(([monthKey, monthEvents]) => ({
    monthKey,
    monthLabel: format(parseISO(`${monthKey}-01`), 'MMMM yyyy'),
    events: monthEvents,
  }));
}

function getTimelineTone(tone: TimelineEvent['badgeTone'], tokens: ThemeTokens) {
  switch (tone) {
    case 'success':
      return {
        soft: `${tokens.success}20`,
        border: `${tokens.success}55`,
        text: tokens.success,
        icon: tokens.success,
        glow: tokens.success,
      };
    case 'primary':
      return {
        soft: `${tokens.primary}20`,
        border: `${tokens.primary}55`,
        text: tokens.primary,
        icon: tokens.primary,
        glow: tokens.primary,
      };
    case 'warning':
      return {
        soft: `${tokens.warning}20`,
        border: `${tokens.warning}55`,
        text: tokens.warning,
        icon: tokens.warning,
        glow: tokens.warning,
      };
    case 'danger':
      return {
        soft: `${tokens.danger}20`,
        border: `${tokens.danger}55`,
        text: tokens.danger,
        icon: tokens.danger,
        glow: tokens.danger,
      };
    default:
      return {
        soft: `${tokens.textMuted}18`,
        border: `${tokens.textMuted}40`,
        text: tokens.textMuted,
        icon: tokens.textMuted,
        glow: tokens.textMuted,
      };
  }
}

function getTimelineIcon(status: TimelineStatus) {
  switch (status) {
    case 'completed':
      return 'checkmark';
    case 'partial':
      return 'pause';
    case 'skipped':
      return 'play-skip-forward';
    case 'missed':
      return 'close';
    case 'started':
      return 'flag';
  }
}

function getTimelineTitle(status: TimelineStatus) {
  switch (status) {
    case 'completed':
      return 'Completed check-in';
    case 'partial':
      return 'Partial progress logged';
    case 'skipped':
      return 'Skipped for the day';
    case 'missed':
      return 'Missed scheduled day';
    case 'started':
      return 'Habit started';
  }
}

function getBadgeTone(status: TimelineStatus): TimelineEvent['badgeTone'] {
  switch (status) {
    case 'completed':
      return 'success';
    case 'partial':
      return 'primary';
    case 'skipped':
      return 'warning';
    case 'missed':
      return 'danger';
    default:
      return 'muted';
  }
}

function formatLogValue(value?: number, unit?: string) {
  if (value === undefined) {
    return undefined;
  }

  return unit ? `${value} ${unit}` : `Value ${value}`;
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
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    overflow: 'hidden',
  },
  heroGlowRow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  heroGlow: {
    position: 'absolute',
    top: -72,
    right: -26,
    width: 188,
    height: 188,
    borderRadius: 999,
  },
  heroGlowSecondary: {
    position: 'absolute',
    bottom: -56,
    left: -34,
    width: 148,
    height: 148,
    borderRadius: 999,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  heroIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  heroTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroPill: {
    minHeight: 26,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPillText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  heroChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  heroChip: {
    minHeight: 30,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroProgressCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  heroProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroProgressEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroProgressValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroProgressValue: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  heroCompletionBadge: {
    minHeight: 26,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroCompletionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroProgressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  heroProgressCaption: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    lineHeight: 16,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 6,
  },
  metricTile: {
    width: 108,
    minHeight: 74,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    justifyContent: 'space-between',
  },
  metricAccentDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  metricTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricAccentText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  sectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  timelineSectionCard: {
    padding: 14,
    gap: 12,
  },
  calendarSectionCard: {
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  trendCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 14,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  trendHeaderStacked: {
    flexDirection: 'column',
    gap: 10,
  },
  trendHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  trendSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  trendScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  trendScoreValue: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
  },
  trendScoreCaption: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  chartFrame: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  yAxis: {
    width: CHART_SIDE_LABEL_WIDTH,
    height: CHART_HEIGHT - CHART_BOTTOM_LABEL_HEIGHT,
    justifyContent: 'space-between',
    paddingTop: CHART_TOP_PADDING - 6,
    paddingBottom: 2,
  },
  axisLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  chartArea: {
    position: 'relative',
  },
  chartPlot: {
    height: CHART_HEIGHT - CHART_BOTTOM_LABEL_HEIGHT,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  verticalLine: {
    position: 'absolute',
    top: CHART_TOP_PADDING,
    width: 1,
  },
  chartSegment: {
    position: 'absolute',
    height: 4,
    borderRadius: 999,
  },
  areaFill: {
    position: 'absolute',
    marginLeft: -2,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  pointOuter: {
    position: 'absolute',
    width: CHART_DOT_SIZE,
    height: CHART_DOT_SIZE,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  pointValue: {
    position: 'absolute',
    width: CHART_POINT_LABEL_WIDTH,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
  chartFooter: {
    minHeight: CHART_BOTTOM_LABEL_HEIGHT,
    paddingTop: 6,
    paddingHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  footerDayItem: {
    minHeight: CHART_BOTTOM_LABEL_HEIGHT - 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  footerDayItemCompact: {
    minHeight: CHART_BOTTOM_LABEL_HEIGHT - 10,
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  footerDayLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  footerDayLabelCompact: {
    fontSize: 9,
    letterSpacing: 0.3,
  },
  footerDayDate: {
    fontSize: 12,
    fontWeight: '700',
  },
  footerDayDateCompact: {
    fontSize: 11,
  },
  calendarHeader: {
    gap: 2,
  },
  calendarHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  calendarMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  calendarMonthTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  calendarNavButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarWeekHeader: {
    flexDirection: 'row',
  },
  calendarWeekday: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 5,
  },
  calendarDayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  calendarDayCellActive: {
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  calendarDayLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  calendarDayIcon: {
    position: 'absolute',
    bottom: 4,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineHeaderCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineSection: {
    gap: 10,
  },
  timelineMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timelineMonthLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timelineMonthDivider: {
    flex: 1,
    height: 1,
  },
  timelineItem: {
    gap: 10,
  },
  timelineCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  timelineIconBlock: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  timelineDateBlock: {
    width: 48,
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 1,
  },
  timelineDateDay: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  timelineDateMonth: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timelineContent: {
    flex: 1,
    gap: 4,
    flexShrink: 1,
  },
  timelineMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  timelineWeekday: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timelineTodayBadge: {
    minHeight: 22,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineTodayText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  timelineStatusBadge: {
    minHeight: 22,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timelineCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timelineDivider: {
    height: 1,
    marginLeft: 40,
    borderRadius: 999,
    opacity: 0.7,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  timelineMilestone: {
    fontSize: 12,
    fontWeight: '700',
  },
  timelineBody: {
    fontSize: 12,
    lineHeight: 17,
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
