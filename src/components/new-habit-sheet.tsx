import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReminderTimePopup } from '@/src/components/reminder-time-popup';
import { createDefaultDraft, HABIT_COLORS, HABIT_ICONS } from '@/src/domain/habits';
import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';
import { HabitFormDraft, HabitKind } from '@/src/types/habits';

type NewHabitSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const weekdayOptions = [
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
  { label: 'S', value: 0 },
];

const kindOptions: { label: string; value: HabitKind; icon: IconName; hint: string }[] = [
  { label: 'Done', value: 'yesNo', icon: 'checkmark-circle-outline', hint: 'Simple completion' },
  { label: 'Count', value: 'count', icon: 'add-circle-outline', hint: 'Glasses, pages, reps' },
  { label: 'Time', value: 'duration', icon: 'time-outline', hint: 'Minutes or hours' },
  { label: 'Avoid', value: 'negative', icon: 'shield-outline', hint: 'Break a pattern' },
];

const categoryOptions = ['Wellness', 'Focus', 'Fitness', 'Learning', 'Sleep', 'Home'];
const canUseNativeDriver = Platform.OS !== 'web';

export function NewHabitSheet({ visible, onClose }: NewHabitSheetProps) {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const isLight = tokens.mode === 'light';
  const saveHabit = useAppStore((state) => state.saveHabit);
  const translateY = useRef(new Animated.Value(0)).current;
  const customDaysMotion = useRef(new Animated.Value(0)).current;
  const scrollOffset = useRef(0);
  const [draft, setDraft] = useState(() => createDefaultDraft(format(new Date(), 'yyyy-MM-dd')));
  const [reminderOpen, setReminderOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const repeatMode = getRepeatMode(draft);
  const sheetHeight = Math.min(height * (repeatMode === 'custom' ? 0.66 : 0.56), 540);
  const sheetWidth = Math.min(width, 560);
  const inputSurface = isLight ? '#f7fbff' : tokens.surface;
  const sectionSurface = isLight ? '#ffffff' : tokens.mode === 'amoled' ? '#050505' : '#08111f';
  const sectionBorder = isLight ? '#d9e6f3' : tokens.border;
  const selectedSoft = isLight ? '#e7f0ff' : tokens.primarySoft;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => {
          // Only capture downward swipes when at the top of the scroll
          return scrollOffset.current <= 0 && gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
        },
        onPanResponderMove: (_, gesture) => {
          // Only allow downward movement
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 120 || gesture.vy > 1.1) {
            closeSheet();
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: canUseNativeDriver,
            tension: 85,
            friction: 12,
          }).start();
        },
      }),
    [translateY],
  );

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      customDaysMotion.setValue(0);
      setDraft(createDefaultDraft(format(new Date(), 'yyyy-MM-dd')));
      return;
    }
    setReminderOpen(false);
    setAdvancedOpen(false);
  }, [customDaysMotion, translateY, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (repeatMode === 'custom') {
      customDaysMotion.setValue(0);
      Animated.spring(customDaysMotion, {
        toValue: 1,
        tension: 90,
        friction: 14,
        useNativeDriver: canUseNativeDriver,
      }).start();
    }
  }, [customDaysMotion, repeatMode, visible]);

  function closeSheet() {
    Keyboard.dismiss();
    Animated.timing(translateY, {
      toValue: sheetHeight,
      duration: 180,
      useNativeDriver: canUseNativeDriver,
    }).start(() => onClose());
  }

  async function handleSave() {
    if (!draft.name.trim()) {
      Alert.alert('Habit name needed', 'Add a short habit name before saving.');
      return;
    }

    setSaving(true);
    try {
      await saveHabit(draft);
      closeSheet();
    } finally {
      setSaving(false);
    }
  }

  function handleRepeatModePress(mode: 'daily' | 'weekdays' | 'custom') {
    Keyboard.dismiss();
    setDraft((currentDraft) => applyRepeatMode(currentDraft, mode));
  }

  const customDaysTranslateY = customDaysMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const customDaysScale = customDaysMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={closeSheet}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityLabel="Close new habit sheet" style={[styles.backdrop, { backgroundColor: isLight ? 'rgba(16,24,40,0.42)' : 'rgba(0,0,0,0.68)' }]} onPress={closeSheet} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 18}
          pointerEvents="box-none"
          style={styles.keyboardLayer}
        >
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.sheet,
              {
                width: sheetWidth,
                height: sheetHeight,
                paddingBottom: Math.max(insets.bottom, 12),
                backgroundColor: isLight ? '#fbf7f2' : tokens.background,
                borderColor: isLight ? '#f2e9df' : tokens.border,
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={styles.grabberZone}>
              <View style={[styles.grabber, { backgroundColor: isLight ? '#d6d0c8' : tokens.border }]} />
            </View>

            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleBlock}>
                <Text style={[styles.sheetTitle, { color: tokens.text }]}>New Habit</Text>
                <Text style={[styles.sheetSubtitle, { color: tokens.textMuted }]}>Choose one small routine worth repeating and make it visible.</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open reminder settings"
                onPress={() => setReminderOpen(true)}
                style={[
                  draft.reminderEnabled ? styles.reminderChip : styles.reminderIconButton,
                  { backgroundColor: isLight ? (draft.reminderEnabled ? '#f6e8d3' : '#e4e7eb') : tokens.surfaceMuted },
                ]}
              >
                <Ionicons name={draft.reminderEnabled ? 'notifications' : 'notifications-outline'} size={18} color={tokens.text} />
                {draft.reminderEnabled ? <Text style={[styles.reminderChipText, { color: tokens.text }]}>{draft.reminderTime || '08:00'}</Text> : null}
                {draft.reminderEnabled ? <Ionicons name="close" size={19} color={tokens.text} /> : null}
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(event) => {
                scrollOffset.current = event.nativeEvent.contentOffset.y;
              }}
            >
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: tokens.text }]}>Habit name</Text>
                <TextInput
                  autoFocus
                  value={draft.name}
                  onChangeText={(name) => setDraft({ ...draft, name })}
                  placeholder="Drink water, stretch, read..."
                  placeholderTextColor={tokens.textMuted}
                  returnKeyType="done"
                  style={[styles.nameInput, { backgroundColor: inputSurface, borderColor: isLight ? '#eef2f7' : tokens.border, color: tokens.text }]}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: tokens.text }]}>Repeat</Text>
                <View style={[styles.segmented, { backgroundColor: inputSurface, borderColor: isLight ? '#eef2f7' : tokens.border }]}>
                  {(['daily', 'weekdays', 'custom'] as const).map((mode) => {
                    const selected = repeatMode === mode;
                    return (
                      <Pressable
                        key={mode}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        hitSlop={6}
                        onPress={() => handleRepeatModePress(mode)}
                        style={[styles.segment, selected && { backgroundColor: isLight ? '#10243e' : tokens.primary }]}
                      >
                        <Text style={[styles.segmentText, { color: selected ? '#ffffff' : tokens.textMuted }]}>{mode === 'daily' ? 'Daily' : mode === 'weekdays' ? 'Weekdays' : 'Custom'}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {repeatMode === 'custom' ? (
                <Animated.View
                  style={[
                    styles.field,
                    styles.customDaysField,
                    {
                      opacity: customDaysMotion,
                      transform: [{ translateY: customDaysTranslateY }, { scale: customDaysScale }],
                    },
                  ]}
                >
                  <Text style={[styles.fieldLabel, { color: tokens.text }]}>Pick your days</Text>
                  <View style={styles.weekdayRow}>
                    {weekdayOptions.map((day) => {
                      const selected = draft.weekdays.includes(day.value);
                      return (
                        <Pressable
                          key={`${day.label}-${day.value}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() =>
                            setDraft((currentDraft) => {
                              const daySelected = currentDraft.weekdays.includes(day.value);

                              return {
                                ...currentDraft,
                                scheduleKind: 'weekdays',
                                weekdays: daySelected
                                  ? currentDraft.weekdays.filter((item) => item !== day.value)
                                  : [...currentDraft.weekdays, day.value].sort(),
                              };
                            })
                          }
                          style={[
                            styles.weekdayButton,
                            { backgroundColor: selected ? (isLight ? '#10243e' : tokens.primary) : inputSurface, borderColor: selected ? 'transparent' : sectionBorder },
                          ]}
                        >
                          <Text style={[styles.weekdayLabel, { color: selected ? '#ffffff' : tokens.text }]}>{day.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Animated.View>
              ) : null}

            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open habit options"
                onPress={() => setAdvancedOpen(true)}
                style={[styles.optionsButton, { backgroundColor: inputSurface, borderColor: isLight ? '#eef2f7' : tokens.border }]}
              >
                <Ionicons name="options-outline" size={24} color={tokens.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save habit"
                disabled={saving}
                onPress={handleSave}
                style={[styles.saveButton, { backgroundColor: isLight ? '#10243e' : tokens.primary, opacity: saving ? 0.72 : 1 }]}
              >
                <Text style={[styles.saveButtonText, { color: isLight ? '#ffffff' : tokens.mode === 'amoled' ? '#001b18' : '#07111f' }]}>
                  {saving ? 'Saving...' : 'Save Habit'}
                </Text>
              </Pressable>
            </View>

            {reminderOpen ? (
              <ReminderTimePopup
                initialTime={draft.reminderTime || '08:00'}
                inputSurface={inputSurface}
                onCancel={() => setReminderOpen(false)}
                onConfirm={(time) => {
                  setDraft((currentDraft) => ({ ...currentDraft, reminderEnabled: true, reminderTime: time }));
                  setReminderOpen(false);
                }}
              />
            ) : null}

            {advancedOpen ? (
              <HabitOptionsPopup
                draft={draft}
                inputSurface={inputSurface}
                sectionBorder={sectionBorder}
                selectedSoft={selectedSoft}
                onCancel={() => setAdvancedOpen(false)}
                onChange={setDraft}
              />
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function HabitOptionsPopup({
  draft,
  inputSurface,
  sectionBorder,
  selectedSoft,
  onCancel,
  onChange,
}: {
  draft: HabitFormDraft;
  inputSurface: string;
  sectionBorder: string;
  selectedSoft: string;
  onCancel: () => void;
  onChange: (nextDraft: HabitFormDraft) => void;
}) {
  const tokens = useThemeTokens();
  const isLight = tokens.mode === 'light';

  return (
    <View style={styles.popupLayer}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: isLight ? 'rgba(16,24,40,0.28)' : 'rgba(0,0,0,0.58)' }]} onPress={onCancel} />
      <View style={[styles.optionsCard, { backgroundColor: isLight ? '#ffffff' : tokens.surface, borderColor: isLight ? '#e1e7f0' : tokens.border }]}>
        <View style={styles.optionsHeader}>
          <View>
            <Text style={[styles.popupTitle, { color: tokens.text }]}>Habit options</Text>
            <Text style={[styles.optionsSubtitle, { color: tokens.textMuted }]}>Type, category, color, and icon.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close habit options" onPress={onCancel} style={styles.optionsCloseButton}>
            <Ionicons name="close" size={22} color={tokens.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.optionsContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.compactSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="options-outline" size={18} color={tokens.primary} />
              <Text style={[styles.sectionTitle, { color: tokens.text }]}>Type</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScrollView} contentContainerStyle={styles.compactTypeGrid}>
              {kindOptions.map((option) => {
                const selected = draft.kind === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => onChange({ ...draft, kind: option.value })}
                    style={[
                      styles.compactTypeTile,
                      { backgroundColor: selected ? selectedSoft : inputSurface, borderColor: selected ? tokens.primary : sectionBorder },
                    ]}
                  >
                    <Ionicons name={option.icon} size={17} color={selected ? tokens.primary : tokens.textMuted} />
                    <View style={styles.compactTypeCopy}>
                      <Text style={[styles.compactTypeLabel, { color: tokens.text }]}>{option.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {draft.kind === 'count' || draft.kind === 'duration' ? (
            <View style={styles.targetRow}>
              <View style={styles.targetField}>
                <Text style={[styles.smallLabel, { color: tokens.textMuted }]}>Target</Text>
                <TextInput
                  keyboardType="numeric"
                  value={draft.targetValue}
                  onChangeText={(targetValue) => onChange({ ...draft, targetValue })}
                  placeholder={draft.kind === 'duration' ? '20' : '8'}
                  placeholderTextColor={tokens.textMuted}
                  style={[styles.smallInput, { backgroundColor: inputSurface, borderColor: sectionBorder, color: tokens.text }]}
                />
              </View>
              <View style={styles.targetField}>
                <Text style={[styles.smallLabel, { color: tokens.textMuted }]}>Unit</Text>
                <TextInput
                  value={draft.unit}
                  onChangeText={(unit) => onChange({ ...draft, unit })}
                  placeholder={draft.kind === 'duration' ? 'minutes' : 'glasses'}
                  placeholderTextColor={tokens.textMuted}
                  style={[styles.smallInput, { backgroundColor: inputSurface, borderColor: sectionBorder, color: tokens.text }]}
                />
              </View>
            </View>
          ) : null}

          <View style={styles.compactSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="albums-outline" size={18} color={tokens.primary} />
              <Text style={[styles.sectionTitle, { color: tokens.text }]}>Category</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScrollView} contentContainerStyle={styles.pillRow}>
              {categoryOptions.map((category) => {
                const selected = draft.category === category;
                return (
                  <Pressable
                    key={category}
                    onPress={() => onChange({ ...draft, category })}
                    style={[styles.pill, { backgroundColor: selected ? selectedSoft : inputSurface, borderColor: selected ? tokens.primary : sectionBorder }]}
                  >
                    <Text style={[styles.pillText, { color: selected ? tokens.primary : tokens.text }]}>{category}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.compactSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="color-palette-outline" size={18} color={tokens.primary} />
              <Text style={[styles.sectionTitle, { color: tokens.text }]}>Color and icon</Text>
            </View>
            <View style={styles.swatchRow}>
              {HABIT_COLORS.map((color) => (
                <Pressable
                  key={color}
                  accessibilityRole="button"
                  accessibilityState={{ selected: draft.color === color }}
                  onPress={() => onChange({ ...draft, color })}
                  style={[styles.swatch, { backgroundColor: color }, draft.color === color && { borderColor: tokens.text, borderWidth: 3 }]}
                />
              ))}
            </View>
            <View style={styles.iconRow}>
              {HABIT_ICONS.map((icon) => {
                const selected = draft.icon === icon;
                return (
                  <Pressable
                    key={icon}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => onChange({ ...draft, icon })}
                    style={[styles.iconButton, { backgroundColor: selected ? `${draft.color}22` : inputSurface, borderColor: selected ? draft.color : sectionBorder }]}
                  >
                    <Ionicons name={icon as IconName} size={20} color={selected ? draft.color : tokens.textMuted} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.optionsActions}>
          <Pressable onPress={onCancel} style={[styles.doneButton, { backgroundColor: isLight ? '#10243e' : tokens.primary }]}>
            <Text style={[styles.doneButtonText, { color: isLight ? '#ffffff' : tokens.mode === 'amoled' ? '#001b18' : '#07111f' }]}>Done</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function getRepeatMode(draft: HabitFormDraft) {
  if (draft.scheduleKind === 'daily') {
    return 'daily';
  }
  if (draft.scheduleKind === 'weekdays' && draft.weekdays.join(',') === '1,2,3,4,5') {
    return 'weekdays';
  }
  return 'custom';
}

function applyRepeatMode(draft: HabitFormDraft, mode: 'daily' | 'weekdays' | 'custom'): HabitFormDraft {
  if (mode === 'daily') {
    return { ...draft, scheduleKind: 'daily' };
  }
  if (mode === 'weekdays') {
    return { ...draft, scheduleKind: 'weekdays', weekdays: [1, 2, 3, 4, 5] };
  }

  const currentMode = getRepeatMode(draft);
  return {
    ...draft,
    scheduleKind: 'weekdays',
    weekdays: currentMode === 'custom' && draft.weekdays.length ? draft.weekdays : [1, 3, 5],
  };
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  keyboardLayer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 1,
    overflow: 'visible',
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -12 },
    elevation: 30,
  },
  grabberZone: {
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grabber: {
    width: 74,
    height: 6,
    borderRadius: 999,
  },
  sheetHeader: {
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 18,
  },
  sheetTitleBlock: {
    flex: 1,
    gap: 10,
  },
  sheetTitle: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 38,
  },
  sheetSubtitle: {
    fontSize: 18,
    lineHeight: 27,
    maxWidth: 360,
  },
  reminderChip: {
    minWidth: 144,
    height: 58,
    paddingHorizontal: 18,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  reminderIconButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderChipText: {
    fontSize: 17,
    fontWeight: '700',
  },
  sheetContent: {
    paddingHorizontal: 28,
    paddingBottom: 10,
    gap: 14,
  },
  field: {
    gap: 10,
  },
  customDaysField: {
    paddingTop: 2,
  },
  fieldLabel: {
    fontSize: 17,
    fontWeight: '800',
  },
  nameInput: {
    minHeight: 60,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    fontSize: 21,
    fontWeight: '500',
  },
  segmented: {
    minHeight: 62,
    borderRadius: 24,
    borderWidth: 1,
    padding: 4,
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '800',
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: 6,
  },
  weekdayButton: {
    flex: 1,
    minWidth: 0,
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayLabel: {
    fontSize: 16,
    fontWeight: '900',
  },
  section: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeTile: {
    width: '48%',
    minHeight: 92,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '900',
  },
  typeHint: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  targetRow: {
    flexDirection: 'row',
    gap: 12,
  },
  targetField: {
    flex: 1,
    gap: 6,
  },
  smallLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  smallInput: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '800',
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 28,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionsButton: {
    width: 56,
    height: 56,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '900',
  },
  popupLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -260,
    bottom: -12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  reminderCard: {
    width: '100%',
    maxWidth: 446,
    borderRadius: 32,
    borderWidth: 1,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 20,
    gap: 28,
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 32,
  },
  optionsCard: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '92%',
    borderRadius: 26,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 32,
  },
  optionsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  optionsSubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  optionsCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsContent: {
    gap: 14,
  },
  compactSection: {
    gap: 12,
  },
  compactTypeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  compactTypeTile: {
    minWidth: 90,
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  compactTypeCopy: {
    alignItems: 'center',
    minWidth: 0,
  },
  compactTypeLabel: {
    fontSize: 12,
    fontWeight: '900',
  },
  typeScrollView: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  categoryScrollView: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  optionsActions: {
    paddingTop: 2,
  },
  doneButton: {
    minHeight: 54,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '900',
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: '500',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 10,
  },
  timeBox: {
    width: 132,
    height: 86,
    borderRadius: 12,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 42,
    fontWeight: '500',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  activeTimeBox: {
    borderWidth: 2,
  },
  timeSeparator: {
    fontSize: 64,
    fontWeight: '600',
    marginTop: 6,
  },
  timeHint: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 6,
  },
  popupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  popupActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  popupTextAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  popupActionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
