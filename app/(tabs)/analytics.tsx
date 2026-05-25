import { Ionicons } from '@expo/vector-icons';
import { eachDayOfInterval, format, parseISO, startOfDay, subDays } from 'date-fns';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { EmptyState } from '@/src/components/empty-state';
import { ScreenShell } from '@/src/components/screen-shell';
import {
  calculateCompletionRate,
  calculateStreak,
  getHabitLogForDate,
  isHabitScheduledForDate,
} from '@/src/domain/habits';
import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';
import { Habit, HabitLog } from '@/src/types/habits';

type DayTrend = {
  dateKey: string;
  label: string;
  completedCount: number;
  scheduledCount: number;
  percentage: number;
};

type RingTick = {
  angle: number;
  active: boolean;
  left: number;
  top: number;
};

const RING_TICK_COUNT = 56;
const CHART_HEIGHT = 188;
const CHART_SIDE_LABEL_WIDTH = 42;
const CHART_BOTTOM_LABEL_HEIGHT = 30;
const CHART_TOP_PADDING = 10;
const CHART_RIGHT_PADDING = 14;
const CHART_DOT_SIZE = 12;

export default function AnalyticsScreen() {
  const tokens = useThemeTokens();
  const { width } = useWindowDimensions();
  const [selectedEndDateKey, setSelectedEndDateKey] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isRangePickerOpen, setRangePickerOpen] = useState(false);
  const isCompact = width < 420;
  const ringSize = isCompact ? 150 : 194;
  const ringRadius = isCompact ? 58 : 76;
  const ringTickHeight = isCompact ? 20 : 26;
  const ringInnerInset = isCompact ? 28 : 34;
  const habits = useAppStore(useShallow((state) => state.habits.filter((habit) => !habit.archivedAt)));
  const logs = useAppStore((state) => state.logs);

  if (!habits.length) {
    return (
      <ScreenShell title="Analytics" subtitle="See your habit trends and progress.">
        <EmptyState
          title="Analytics will build itself"
          subtitle="Create a few habits and start logging them. This screen will turn into a live dashboard from your real progress."
        />
      </ScreenShell>
    );
  }

  const last7Days = getDayKeysEndingOn(selectedEndDateKey, 7);
  const previous7Days = getDayKeysEndingOn(format(subDays(parseISO(selectedEndDateKey), 7), 'yyyy-MM-dd'), 7);
  const selectableEndDates = getSelectableEndDateKeys(30);
  const weeklyTrend = last7Days.map((dateKey) => buildDayTrend(dateKey, habits, logs));
  const previousTrend = previous7Days.map((dateKey) => buildDayTrend(dateKey, habits, logs));

  const weekScheduled = sum(weeklyTrend.map((day) => day.scheduledCount));
  const weekCompleted = sum(weeklyTrend.map((day) => day.completedCount));
  const weeklyCompletionRate = weekScheduled ? Math.round((weekCompleted / weekScheduled) * 100) : 0;

  const previousScheduled = sum(previousTrend.map((day) => day.scheduledCount));
  const previousCompleted = sum(previousTrend.map((day) => day.completedCount));
  const previousWeeklyRate = previousScheduled ? Math.round((previousCompleted / previousScheduled) * 100) : 0;
  const weeklyDelta = weeklyCompletionRate - previousWeeklyRate;

  const habitPerformance = habits.map((habit) => {
    const streak = calculateStreak(habit, logs);
    const rate = calculateCompletionRate(habit, logs);
    return { habit, streak, rate };
  });

  const currentStreak = habitPerformance.reduce((best, item) => Math.max(best, item.streak.current), 0);
  const bestStreak = habitPerformance.reduce((best, item) => Math.max(best, item.streak.best), 0);
  const averageHabitRate = habitPerformance.length ? Math.round(sum(habitPerformance.map((item) => item.rate)) / habitPerformance.length) : 0;
  const streakBalance = habits.length ? Math.min(100, Math.round((currentStreak / habits.length) * 18)) : 0;
  const consistencyScore = clamp(Math.round(weeklyCompletionRate * 0.65 + averageHabitRate * 0.25 + streakBalance * 0.1), 0, 100);

  const chartWidth = Math.max(width - 40 - 24 - CHART_SIDE_LABEL_WIDTH - CHART_RIGHT_PADDING, 220);
  const chartPoints = buildChartPoints(weeklyTrend, chartWidth, CHART_HEIGHT);
  const ringTicks = buildRingTicks(weeklyCompletionRate, ringSize, ringRadius, ringTickHeight);
  const scoreTone = getScoreTone(consistencyScore);
  const completionTone = getCompletionTone(weeklyCompletionRate);
  const deltaPrefix = weeklyDelta > 0 ? '+' : '';
  const rangeLabel = `${format(parseISO(last7Days[0]), 'MMM d')} - ${format(parseISO(last7Days[last7Days.length - 1]), 'MMM d')}`;
  const selectedEndDateLabel = getRelativeDateLabel(selectedEndDateKey);

  return (
    <ScreenShell
      title="Analytics"
      subtitle="See your habit trends and progress."
    >
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: '#0c1729',
            borderColor: '#1f3658',
            shadowColor: '#000000',
          },
        ]}
      >
        <View style={styles.heroContent}>
          <View style={[styles.heroTextBlock, isCompact && styles.heroTextBlockCompact]}>
            <Text style={[styles.eyebrow, { color: tokens.text }]}>Completion rate</Text>
            <Text style={[styles.heroRate, isCompact && styles.heroRateCompact, { color: '#f8fbff' }]}>{weeklyCompletionRate}%</Text>
            <Text style={[styles.heroMessage, isCompact && styles.heroMessageCompact, { color: '#a8bbd4' }]}>{completionTone}</Text>
          </View>

          <View style={[styles.ringWrap, { width: ringSize, height: ringSize }]}>
            <View style={[styles.ring, { width: ringSize, height: ringSize }]}>
              {ringTicks.map((tick, index) => (
                <View
                  key={`tick-${index}`}
                  style={[
                    styles.ringTick,
                    {
                      left: tick.left,
                      top: tick.top,
                      height: ringTickHeight,
                      backgroundColor: tick.active ? '#4f83ff' : '#314663',
                      transform: [{ rotate: `${tick.angle + 90}deg` }],
                    },
                  ]}
                />
              ))}

              <View
                style={[
                  styles.ringInner,
                  {
                    left: ringInnerInset,
                    top: ringInnerInset,
                    width: ringSize - ringInnerInset * 2,
                    height: ringSize - ringInnerInset * 2,
                    backgroundColor: '#09101b',
                  },
                ]}
              >
                <View style={styles.deltaRow}>
                  <Ionicons name={weeklyDelta >= 0 ? 'trending-up' : 'trending-down'} size={18} color="#6ea2ff" />
                  <Text style={styles.deltaValue}>{deltaPrefix}{weeklyDelta}%</Text>
                </View>
                <Text style={styles.deltaLabel}>vs last week</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.metricGroup}>
        <View style={styles.metricRow}>
          <MetricTile
            title="Current streak"
            icon={<Text style={styles.metricEmoji}>🔥</Text>}
            value={String(currentStreak)}
            suffix="days"
            detail={`Best: ${bestStreak} days`}
            compact={isCompact}
          />
          <MetricTile
            title="Completed this week"
            icon={<Ionicons name="checkmark-circle" size={28} color="#68d26b" />}
            value={String(weekCompleted)}
            suffix={`of ${weekScheduled || 0}`}
            detail={`${weeklyCompletionRate}% of habits`}
            compact={isCompact}
          />
        </View>

        <MetricTile
          title="Consistency score"
          icon={<Ionicons name="shield-checkmark" size={28} color="#6ea2ff" />}
          value={String(consistencyScore)}
          suffix={scoreTone.title}
          detail={scoreTone.detail}
          fullWidth
        />
      </View>

      <View
        style={[
          styles.chartCard,
          {
            backgroundColor: '#0c1729',
            borderColor: '#1f3658',
          },
        ]}
      >
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, { color: '#f8fbff' }]}>Weekly trend</Text>
          <Pressable
            accessibilityRole="button"
            style={[styles.rangeChip, { borderColor: tokens.border, backgroundColor: 'rgba(18, 32, 55, 0.94)' }]}
            onPress={() => setRangePickerOpen(true)}
          >
            <View style={styles.rangeChipTextWrap}>
              <Text style={[styles.rangeChipEyebrow, { color: '#8ea3bf' }]}>Last 7 days</Text>
              <Text style={[styles.rangeChipText, { color: '#f8fbff' }]}>{rangeLabel}</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#c9d7eb" />
          </Pressable>
        </View>

        <View style={styles.chartFrame}>
          <View style={styles.yAxis}>
            {[100, 75, 50, 25, 0].map((label) => (
              <Text key={label} style={[styles.axisLabel, { color: '#8ea3bf' }]}>
                {label}%
              </Text>
            ))}
          </View>

          <View style={[styles.chartArea, { width: chartWidth, height: CHART_HEIGHT }]}>
            <View style={styles.chartPlot}>
              {[100, 75, 50, 25, 0].map((label) => {
                const top = getChartTop(label, CHART_HEIGHT);
                return (
                  <View
                    key={`grid-${label}`}
                    style={[
                      styles.gridLine,
                      {
                        top,
                        borderColor: label === 0 ? 'rgba(105, 131, 164, 0.38)' : 'rgba(105, 131, 164, 0.22)',
                      },
                    ]}
                  />
                );
              })}

              {chartPoints.map((point) => (
                <View key={`vertical-${point.label}`} style={[styles.verticalLine, { left: point.x, height: CHART_HEIGHT - CHART_BOTTOM_LABEL_HEIGHT }]} />
              ))}

              {chartPoints.slice(0, -1).map((point, index) => {
                const next = chartPoints[index + 1];
                const left = point.x;
                const top = point.y;
                const dx = next.x - point.x;
                const dy = next.y - point.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

                return (
                  <View
                    key={`segment-${point.label}`}
                    style={[styles.chartSegment, { left: left + dx / 2 - length / 2, top: top + dy / 2 - 2, width: length, transform: [{ rotate: `${angle}deg` }] }]}
                  />
                );
              })}

              {chartPoints.map((point) => (
                <View key={`fill-${point.label}`} style={[styles.areaFill, point.fillStyle]} />
              ))}

              {chartPoints.map((point, index) => (
                <View key={`point-${point.label}`}>
                  <Text
                    style={[
                      styles.pointValue,
                      {
                        left: point.x - 18,
                        top: point.y - 32,
                        color: '#f8fbff',
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
                      },
                    ]}
                  >
                    <View style={styles.pointInner} />
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.chartFooter}>
              {weeklyTrend.map((day, index) => {
                const isRangeEnd = index === weeklyTrend.length - 1;
                return (
                  <View
                    key={`footer-${day.dateKey}`}
                    style={[
                      styles.footerDayItem,
                      isRangeEnd && styles.footerDayItemActive,
                    ]}
                  >
                    <Text style={[styles.footerDayLabel, { color: isRangeEnd ? '#f8fbff' : '#8ea3bf' }]}>{day.label}</Text>
                    <Text style={[styles.footerDayDate, { color: isRangeEnd ? '#f8fbff' : '#dbe7f8' }]}>
                      {format(parseISO(day.dateKey), 'd')}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      <Modal transparent animationType="fade" visible={isRangePickerOpen} onRequestClose={() => setRangePickerOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setRangePickerOpen(false)} />
          <View style={[styles.modalSheet, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={[styles.modalTitle, { color: tokens.text }]}>Choose end date</Text>
                <Text style={[styles.modalSubtitle, { color: tokens.textMuted }]}>
                  Move the 7-day trend window anywhere within the last month.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                style={[styles.modalCloseButton, { backgroundColor: tokens.surfaceMuted }]}
                onPress={() => setRangePickerOpen(false)}
              >
                <Ionicons name="close" size={20} color={tokens.text} />
              </Pressable>
            </View>

            <View style={[styles.selectedRangeBanner, { backgroundColor: tokens.primarySoft }]}>
              <Text style={[styles.selectedRangeLabel, { color: tokens.primary }]}>Selected</Text>
              <Text style={[styles.selectedRangeValue, { color: tokens.text }]}>
                {selectedEndDateLabel} · {rangeLabel}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.optionList}>
              {selectableEndDates.map((dateKey) => {
                const isSelected = dateKey === selectedEndDateKey;
                const optionRange = getDayKeysEndingOn(dateKey, 7);

                return (
                  <Pressable
                    key={dateKey}
                    accessibilityRole="button"
                    style={[
                      styles.optionRow,
                      {
                        backgroundColor: isSelected ? tokens.primarySoft : tokens.mode === 'light' ? '#ffffff' : tokens.surfaceMuted,
                        borderColor: isSelected ? tokens.primary : tokens.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedEndDateKey(dateKey);
                      setRangePickerOpen(false);
                    }}
                  >
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, { color: tokens.text }]}>{getRelativeDateLabel(dateKey)}</Text>
                      <Text style={[styles.optionSubtitle, { color: tokens.textMuted }]}>
                        {format(parseISO(optionRange[0]), 'MMM d')} - {format(parseISO(optionRange[optionRange.length - 1]), 'MMM d')}
                      </Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={22} color={tokens.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

function MetricTile({
  title,
  icon,
  value,
  suffix,
  detail,
  compact,
  fullWidth,
}: {
  title: string;
  icon: ReactNode;
  value: string;
  suffix: string;
  detail: string;
  compact?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <View style={[styles.metricTile, compact && styles.metricTileCompact, fullWidth && styles.metricTileFullWidth]}>
      <View style={styles.metricIconWrap}>{icon}</View>
      <Text style={[styles.metricTitle, compact && styles.metricTitleCompact]}>{title}</Text>
      <Text style={[styles.metricValue, compact && styles.metricValueCompact]}>{value}</Text>
      <Text style={[styles.metricSuffix, compact && styles.metricSuffixCompact]}>{suffix}</Text>
      <Text style={[styles.metricDetail, compact && styles.metricDetailCompact]}>{detail}</Text>
    </View>
  );
}

function getDayKeysEndingOn(endDateKey: string, days: number) {
  const end = startOfDay(parseISO(endDateKey));
  const start = subDays(end, days - 1);

  return eachDayOfInterval({ start, end }).map((date) => format(date, 'yyyy-MM-dd'));
}

function getSelectableEndDateKeys(days: number) {
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, index) => format(subDays(today, index), 'yyyy-MM-dd'));
}

function buildDayTrend(dateKey: string, habits: Habit[], logs: HabitLog[]): DayTrend {
  const scheduledHabits = habits.filter((habit) => isHabitScheduledForDate(habit, dateKey, logs));
  const completedCount = scheduledHabits.filter((habit) => {
    const log = getHabitLogForDate(logs, habit.id, dateKey);
    return log?.status === 'completed';
  }).length;
  const scheduledCount = scheduledHabits.length;
  const percentage = scheduledCount ? Math.round((completedCount / scheduledCount) * 100) : 0;

  return {
    dateKey,
    label: format(parseISO(dateKey), 'EEE').toUpperCase().slice(0, 3),
    completedCount,
    scheduledCount,
    percentage,
  };
}

function buildRingTicks(percentage: number, ringSize: number, ringRadius: number, ringTickHeight: number): RingTick[] {
  const activeTicks = Math.round((clamp(percentage, 0, 100) / 100) * RING_TICK_COUNT);
  const center = ringSize / 2;
  const tickWidth = 8;

  return Array.from({ length: RING_TICK_COUNT }, (_, index) => {
    const angle = (index / RING_TICK_COUNT) * 360 - 90;
    const radians = (angle * Math.PI) / 180;
    const left = center + Math.cos(radians) * ringRadius - tickWidth / 2;
    const top = center + Math.sin(radians) * ringRadius - ringTickHeight / 2;

    return {
      angle,
      active: index < activeTicks,
      left,
      top,
    };
  });
}

function buildChartPoints(days: DayTrend[], chartWidth: number, chartHeight: number) {
  const innerHeight = chartHeight - CHART_BOTTOM_LABEL_HEIGHT - CHART_TOP_PADDING;
  const horizontalInset = 12;
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

function getCompletionTone(rate: number) {
  if (rate >= 85) {
    return "You're on a roll this week.";
  }
  if (rate >= 70) {
    return "You're doing great this week.";
  }
  if (rate >= 50) {
    return 'Momentum is building this week.';
  }
  return 'Keep going, your next few check-ins matter.';
}

function getScoreTone(score: number) {
  if (score >= 85) {
    return { title: 'Excellent', detail: 'Locked in all week' };
  }
  if (score >= 70) {
    return { title: 'Great', detail: 'Keep it up!' };
  }
  if (score >= 55) {
    return { title: 'Good', detail: 'A little more consistency' };
  }
  return { title: 'Building', detail: 'Your rhythm is forming' };
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

function getRelativeDateLabel(dateKey: string) {
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const yesterdayKey = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  if (dateKey === todayKey) {
    return 'Today';
  }
  if (dateKey === yesterdayKey) {
    return 'Yesterday';
  }

  return format(parseISO(dateKey), 'EEEE, MMM d');
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroTextBlock: {
    flex: 1,
    gap: 12,
    paddingVertical: 8,
    minWidth: 0,
  },
  heroTextBlockCompact: {
    maxWidth: 134,
  },
  eyebrow: {
    fontSize: 15,
    fontWeight: '600',
  },
  heroRate: {
    fontSize: 54,
    lineHeight: 58,
    fontWeight: '800',
  },
  heroRateCompact: {
    fontSize: 48,
    lineHeight: 52,
  },
  heroMessage: {
    maxWidth: 176,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  heroMessageCompact: {
    maxWidth: 130,
    fontSize: 15,
    lineHeight: 22,
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'relative',
  },
  ringTick: {
    position: 'absolute',
    width: 8,
    borderRadius: 999,
  },
  ringInner: {
    position: 'absolute',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deltaValue: {
    color: '#66a0ff',
    fontSize: 18,
    fontWeight: '800',
  },
  deltaLabel: {
    color: '#9cb2cf',
    fontSize: 13,
    fontWeight: '500',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricGroup: {
    gap: 12,
  },
  metricTile: {
    flexGrow: 1,
    flexBasis: 0,
    backgroundColor: '#0c1729',
    borderWidth: 1,
    borderColor: '#1f3658',
    borderRadius: 26,
    padding: 18,
    gap: 10,
    position: 'relative',
  },
  metricTileCompact: {
    minWidth: 0,
    padding: 14,
  },
  metricTileFullWidth: {
    width: '100%',
    flexBasis: '100%',
    flexGrow: 0,
  },
  metricIconWrap: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  metricTitle: {
    color: '#d8e5f6',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    paddingRight: 40,
  },
  metricTitleCompact: {
    fontSize: 14,
    lineHeight: 18,
    paddingRight: 34,
  },
  metricEmoji: {
    fontSize: 28,
  },
  metricValue: {
    color: '#f8fbff',
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '800',
  },
  metricValueCompact: {
    fontSize: 34,
    lineHeight: 38,
  },
  metricSuffix: {
    color: '#dbe7f8',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500',
    marginTop: -8,
  },
  metricSuffixCompact: {
    fontSize: 16,
    lineHeight: 22,
  },
  metricDetail: {
    color: '#8ea3bf',
    fontSize: 14,
    lineHeight: 20,
  },
  metricDetailCompact: {
    fontSize: 12,
    lineHeight: 18,
  },
  chartCard: {
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 14,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  rangeChip: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rangeChipTextWrap: {
    minWidth: 104,
  },
  rangeChipEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rangeChipText: {
    fontSize: 15,
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
    backgroundColor: 'rgba(105, 131, 164, 0.14)',
  },
  chartSegment: {
    position: 'absolute',
    height: 4,
    borderRadius: 999,
    backgroundColor: '#5a8dff',
  },
  areaFill: {
    position: 'absolute',
    marginLeft: -2,
    backgroundColor: 'rgba(58, 116, 255, 0.12)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  pointOuter: {
    position: 'absolute',
    width: CHART_DOT_SIZE,
    height: CHART_DOT_SIZE,
    borderRadius: 999,
    backgroundColor: '#8db2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#4e83ff',
  },
  pointValue: {
    position: 'absolute',
    width: 40,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
  chartFooter: {
    minHeight: CHART_BOTTOM_LABEL_HEIGHT,
    paddingTop: 8,
    paddingHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  footerDayItem: {
    minWidth: 34,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 14,
    alignItems: 'center',
    gap: 2,
  },
  footerDayItemActive: {
    backgroundColor: 'rgba(78, 131, 255, 0.18)',
  },
  footerDayLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  footerDayDate: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '76%',
    gap: 14,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.45)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalHeaderText: {
    flex: 1,
    gap: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRangeBanner: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  selectedRangeLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  selectedRangeValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  optionList: {
    gap: 10,
    paddingBottom: 12,
  },
  optionRow: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    flex: 1,
    gap: 3,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  optionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
