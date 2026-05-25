import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { HABIT_COLORS, HABIT_ICONS } from '@/src/domain/habits';
import { useThemeTokens } from '@/src/theme/colors';
import { HabitFormDraft, HabitKind } from '@/src/types/habits';

type HabitFormProps = {
  draft: HabitFormDraft;
  onChange: (nextDraft: HabitFormDraft) => void;
};

const weekdayOptions = [
  { label: 'S', value: 0 },
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
];

const kinds: { label: string; value: HabitKind; icon: React.ComponentProps<typeof Ionicons>['name']; hint: string }[] = [
  { label: 'Yes / No', value: 'yesNo', icon: 'checkmark-circle-outline', hint: 'Complete once' },
  { label: 'Count', value: 'count', icon: 'add-circle-outline', hint: 'Track repeats' },
  { label: 'Duration', value: 'duration', icon: 'time-outline', hint: 'Track time' },
  { label: 'Negative', value: 'negative', icon: 'shield-outline', hint: 'Avoid this habit' },
];

const schedules: { label: string; value: HabitFormDraft['scheduleKind']; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { label: 'Daily', value: 'daily', icon: 'sunny-outline' },
  { label: 'Weekdays', value: 'weekdays', icon: 'calendar-outline' },
  { label: 'Times / Week', value: 'timesPerWeek', icon: 'repeat-outline' },
  { label: 'Times / Month', value: 'timesPerMonth', icon: 'albums-outline' },
  { label: 'Interval', value: 'interval', icon: 'swap-horizontal-outline' },
];

const defaultCategories = ['Health', 'Focus', 'Fitness', 'Learning', 'Sleep', 'Mindfulness'];

export function HabitForm({ draft, onChange }: HabitFormProps) {
  const tokens = useThemeTokens();
  const isLight = tokens.mode === 'light';
  const sectionSurface = isLight ? '#ffffff' : '#09111d';
  const sectionBorder = isLight ? '#d9e6f3' : 'rgba(96,165,250,0.12)';
  const inputSurface = isLight ? '#f7fbff' : tokens.surface;

  return (
    <View style={styles.form}>
      <View style={[styles.heroCard, { backgroundColor: isLight ? '#ffffff' : '#08111f', borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.14)' }]}>
        <View style={styles.heroTopRow}>
          <View style={[styles.heroIconWrap, { backgroundColor: `${draft.color}22`, borderColor: `${draft.color}55` }]}>
            <Ionicons name={draft.icon as React.ComponentProps<typeof Ionicons>['name']} size={34} color={draft.color} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroLabel, { color: isLight ? '#2563eb' : '#93c5fd' }]}>Habit preview</Text>
            <Text style={[styles.heroTitle, { color: isLight ? '#10243e' : '#ffffff' }]}>{draft.name.trim() || 'Your new habit'}</Text>
            <Text style={[styles.heroSubtitle, { color: isLight ? '#5c6b82' : 'rgba(226,232,240,0.82)' }]}>
              {draft.category.trim() || 'Choose a category'} • {getKindSummary(draft)}
            </Text>
          </View>
        </View>

        <View style={styles.previewRow}>
          <PreviewChip icon="repeat-outline" label={getScheduleSummary(draft)} mode={tokens.mode} />
          <PreviewChip icon="notifications-outline" label={draft.reminderEnabled ? `Reminder ${draft.reminderTime || '08:00'}` : 'No reminder'} mode={tokens.mode} />
        </View>
      </View>

      <SectionCard title="Basics" subtitle="Start with the habit name, type, and category." backgroundColor={sectionSurface} borderColor={sectionBorder} titleColor={tokens.text}>
        <Field label="Habit name" textColor={tokens.text}>
          <TextInput
            value={draft.name}
            onChangeText={(name) => onChange({ ...draft, name })}
            placeholder="Drink water"
            placeholderTextColor={tokens.textMuted}
            style={[styles.input, { backgroundColor: inputSurface, color: tokens.text, borderColor: tokens.border }]}
          />
        </Field>

        <View style={styles.typeGrid}>
          {kinds.map((option) => {
            const selected = draft.kind === option.value;
            return (
              <Pressable
                key={option.value}
                style={[
                  styles.typeTile,
                  { backgroundColor: inputSurface, borderColor: tokens.border },
                  selected && { backgroundColor: 'rgba(124,58,237,0.16)', borderColor: 'rgba(167,139,250,0.92)' },
                ]}
                onPress={() => onChange({ ...draft, kind: option.value })}
              >
                  <Ionicons name={option.icon} size={18} color={selected ? (isLight ? '#2563eb' : '#c4b5fd') : isLight ? '#64748b' : '#93c5fd'} />
                <Text style={[styles.typeLabel, { color: tokens.text }]}>{option.label}</Text>
                <Text style={[styles.typeHint, { color: tokens.textMuted }]}>{option.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        <Field label="Category" textColor={tokens.text}>
          <TextInput
            value={draft.category}
            onChangeText={(category) => onChange({ ...draft, category })}
            placeholder="Wellness"
            placeholderTextColor={tokens.textMuted}
            style={[styles.input, { backgroundColor: inputSurface, color: tokens.text, borderColor: tokens.border }]}
          />
          <View style={styles.pillRow}>
            {defaultCategories.map((category) => {
              const selected = draft.category === category;
              return (
                <Pressable
                  key={category}
                  style={[
                    styles.pill,
                    { backgroundColor: inputSurface, borderColor: tokens.border },
                    selected && { backgroundColor: 'rgba(124,58,237,0.16)', borderColor: 'rgba(167,139,250,0.92)' },
                  ]}
                  onPress={() => onChange({ ...draft, category })}
                >
                  <Text style={[styles.pillLabel, { color: selected ? (isLight ? '#1d4ed8' : '#ffffff') : tokens.text }]}>{category}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>
      </SectionCard>

      <SectionCard title="Tracking" subtitle="Keep measurable habits compact and easy to tune." backgroundColor={sectionSurface} borderColor={sectionBorder} titleColor={tokens.text}>
        {(draft.kind === 'count' || draft.kind === 'duration') ? (
          <View style={styles.row}>
            <Field label="Target" textColor={tokens.text}>
              <TextInput
                value={draft.targetValue}
                onChangeText={(targetValue) => onChange({ ...draft, targetValue })}
                keyboardType="numeric"
                placeholder="8"
                placeholderTextColor={tokens.textMuted}
                style={[styles.input, { backgroundColor: inputSurface, color: tokens.text, borderColor: tokens.border }]}
              />
            </Field>
            <Field label="Unit" textColor={tokens.text}>
              <TextInput
                value={draft.unit}
                onChangeText={(unit) => onChange({ ...draft, unit })}
                placeholder={draft.kind === 'duration' ? 'minutes' : 'glasses'}
                placeholderTextColor={tokens.textMuted}
                style={[styles.input, { backgroundColor: inputSurface, color: tokens.text, borderColor: tokens.border }]}
              />
            </Field>
          </View>
        ) : (
          <View style={[styles.helperCard, { backgroundColor: inputSurface, borderColor: tokens.border }]}>
            <Ionicons name="sparkles-outline" size={18} color="#4ade80" />
            <Text style={[styles.helperText, { color: tokens.textMuted }]}>This habit is tracked with simple completion status, so no numeric target is needed.</Text>
          </View>
        )}
      </SectionCard>

      <SectionCard title="Schedule" subtitle="Choose the rhythm first, then fine tune only when needed." backgroundColor={sectionSurface} borderColor={sectionBorder} titleColor={tokens.text}>
        <View style={styles.scheduleGrid}>
          {schedules.map((option) => {
            const selected = draft.scheduleKind === option.value;
            return (
              <Pressable
                key={option.value}
                style={[
                  styles.scheduleTile,
                  { backgroundColor: inputSurface, borderColor: tokens.border },
                  selected && { backgroundColor: 'rgba(59,130,246,0.16)', borderColor: 'rgba(96,165,250,0.92)' },
                ]}
                onPress={() => onChange({ ...draft, scheduleKind: option.value })}
              >
                <Ionicons name={option.icon} size={16} color={selected ? '#93c5fd' : '#64748b'} />
                <Text style={[styles.scheduleLabel, { color: tokens.text }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {draft.scheduleKind === 'weekdays' && (
          <Field label="Days" textColor={tokens.text}>
            <View style={styles.weekdays}>
              {weekdayOptions.map((weekday) => {
                const selected = draft.weekdays.includes(weekday.value);
                return (
                  <Pressable
                    key={weekday.value}
                    style={[
                      styles.weekday,
                      { backgroundColor: inputSurface, borderColor: tokens.border },
                      selected && { backgroundColor: 'rgba(34,197,94,0.18)', borderColor: 'rgba(74,222,128,0.92)' },
                    ]}
                    onPress={() =>
                      onChange({
                        ...draft,
                        weekdays: selected ? draft.weekdays.filter((item) => item !== weekday.value) : [...draft.weekdays, weekday.value].sort(),
                      })
                    }
                  >
                    <Text style={[styles.weekdayLabel, { color: selected ? (isLight ? '#166534' : '#ffffff') : tokens.text }]}>{weekday.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>
        )}

        {(draft.scheduleKind === 'timesPerWeek' || draft.scheduleKind === 'timesPerMonth') && (
          <Field label={draft.scheduleKind === 'timesPerWeek' ? 'Times per week' : 'Times per month'} textColor={tokens.text}>
            <TextInput
              value={draft.cadenceCount}
              onChangeText={(cadenceCount) => onChange({ ...draft, cadenceCount })}
              keyboardType="numeric"
              placeholder="3"
              placeholderTextColor={tokens.textMuted}
              style={[styles.input, { backgroundColor: inputSurface, color: tokens.text, borderColor: tokens.border }]}
            />
          </Field>
        )}

        {draft.scheduleKind === 'interval' && (
          <Field label="Every N days" textColor={tokens.text}>
            <TextInput
              value={draft.intervalDays}
              onChangeText={(intervalDays) => onChange({ ...draft, intervalDays })}
              keyboardType="numeric"
              placeholder="2"
              placeholderTextColor={tokens.textMuted}
              style={[styles.input, { backgroundColor: inputSurface, color: tokens.text, borderColor: tokens.border }]}
            />
          </Field>
        )}

        <View style={styles.row}>
          <Field label="Start date" textColor={tokens.text}>
            <TextInput
              value={draft.startDate}
              onChangeText={(startDate) => onChange({ ...draft, startDate })}
              placeholder="2026-05-24"
              placeholderTextColor={tokens.textMuted}
              style={[styles.input, { backgroundColor: inputSurface, color: tokens.text, borderColor: tokens.border }]}
            />
          </Field>
          <Field label="End date" textColor={tokens.text}>
            <TextInput
              value={draft.endDate}
              onChangeText={(endDate) => onChange({ ...draft, endDate })}
              placeholder="Optional"
              placeholderTextColor={tokens.textMuted}
              style={[styles.input, { backgroundColor: inputSurface, color: tokens.text, borderColor: tokens.border }]}
            />
          </Field>
        </View>
      </SectionCard>

      <SectionCard title="Reminder" subtitle="Keep reminders simple and local." backgroundColor={sectionSurface} borderColor={sectionBorder} titleColor={tokens.text}>
        <View style={[styles.switchRow, { backgroundColor: inputSurface, borderColor: tokens.border }]}>
          <View style={styles.switchCopy}>
            <Text style={[styles.switchLabel, { color: tokens.text }]}>Enable reminder</Text>
            <Text style={[styles.switchHint, { color: tokens.textMuted }]}>You can change the time any time later.</Text>
          </View>
          <Switch value={draft.reminderEnabled} onValueChange={(reminderEnabled) => onChange({ ...draft, reminderEnabled })} />
        </View>
        {draft.reminderEnabled ? (
          <TextInput
            value={draft.reminderTime}
            onChangeText={(reminderTime) => onChange({ ...draft, reminderTime })}
            placeholder="08:00"
            placeholderTextColor={tokens.textMuted}
            style={[styles.input, { backgroundColor: inputSurface, color: tokens.text, borderColor: tokens.border }]}
          />
        ) : null}
      </SectionCard>

      <SectionCard title="Style" subtitle="Pick the look that helps this habit stand out on Today." backgroundColor={sectionSurface} borderColor={sectionBorder} titleColor={tokens.text}>
        <Field label="Color" textColor={tokens.text}>
          <View style={styles.swatchRow}>
            {HABIT_COLORS.map((color) => (
              <Pressable
                key={color}
                style={[styles.swatch, { backgroundColor: color }, draft.color === color && styles.swatchActive]}
                onPress={() => onChange({ ...draft, color })}
              />
            ))}
          </View>
        </Field>

        <Field label="Icon" textColor={tokens.text}>
          <View style={styles.iconGrid}>
            {HABIT_ICONS.map((icon) => {
              const selected = draft.icon === icon;
              return (
                <Pressable
                  key={icon}
                  style={[
                    styles.iconTile,
                    { backgroundColor: inputSurface, borderColor: tokens.border },
                    selected && { backgroundColor: `${draft.color}22`, borderColor: `${draft.color}88` },
                  ]}
                  onPress={() => onChange({ ...draft, icon })}
                >
                  <Ionicons name={icon as React.ComponentProps<typeof Ionicons>['name']} size={18} color={selected ? draft.color : '#94a3b8'} />
                  <Text style={[styles.iconLabel, { color: tokens.textMuted }]}>{icon}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>
      </SectionCard>

      <SectionCard title="Notes" subtitle="Keep context short and useful." backgroundColor={sectionSurface} borderColor={sectionBorder} titleColor={tokens.text}>
        <Field label="Description" textColor={tokens.text}>
          <TextInput
            value={draft.description}
            onChangeText={(description) => onChange({ ...draft, description })}
            placeholder="Why this matters"
            placeholderTextColor={tokens.textMuted}
            style={[styles.input, styles.multiline, { backgroundColor: inputSurface, color: tokens.text, borderColor: tokens.border }]}
            multiline
          />
        </Field>
      </SectionCard>
    </View>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  backgroundColor,
  borderColor,
  titleColor,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  backgroundColor: string;
  borderColor: string;
  titleColor: string;
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor, borderColor }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: titleColor }]}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      {children}
    </View>
  );
}

function Field({ label, children, textColor }: { label: string; children: React.ReactNode; textColor: string }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: textColor }]}>{label}</Text>
      {children}
    </View>
  );
}

function PreviewChip({ icon, label, mode }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; mode: 'light' | 'dark' | 'amoled' }) {
  return (
    <View style={[styles.previewChip, mode === 'light' ? styles.previewChipLight : null]}>
      <Ionicons name={icon} size={13} color={mode === 'light' ? '#2563eb' : '#93c5fd'} />
      <Text style={[styles.previewChipText, { color: mode === 'light' ? '#355070' : '#dbeafe' }]}>{label}</Text>
    </View>
  );
}

function getKindSummary(draft: HabitFormDraft) {
  switch (draft.kind) {
    case 'count':
      return `${draft.targetValue || '1'} ${draft.unit || 'reps'} target`;
    case 'duration':
      return `${draft.targetValue || '15'} ${draft.unit || 'minutes'} target`;
    case 'negative':
      return 'Avoid and keep clear';
    default:
      return 'Simple daily check-in';
  }
}

function getScheduleSummary(draft: HabitFormDraft) {
  switch (draft.scheduleKind) {
    case 'weekdays':
      return 'Weekday cadence';
    case 'timesPerWeek':
      return `${draft.cadenceCount || '3'} times each week`;
    case 'timesPerMonth':
      return `${draft.cadenceCount || '8'} times each month`;
    case 'interval':
      return `Every ${draft.intervalDays || '2'} days`;
    default:
      return 'Daily rhythm';
  }
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  heroCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    gap: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: 16,
  },
  heroIconWrap: {
    width: 78,
    height: 78,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  previewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewChip: {
    minHeight: 34,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    backgroundColor: 'rgba(15,23,42,0.24)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewChipLight: {
    borderColor: '#d9e6f3',
    backgroundColor: '#eef4ff',
  },
  previewChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  field: {
    gap: 8,
    flex: 1,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  multiline: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pillLabel: {
    fontWeight: '700',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeTile: {
    width: '48%',
    minHeight: 96,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  typeHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  helperCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  helperText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  scheduleTile: {
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  weekdays: {
    flexDirection: 'row',
    gap: 8,
  },
  weekday: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayLabel: {
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  switchLabel: {
    fontWeight: '700',
    fontSize: 15,
  },
  switchHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconTile: {
    width: '31%',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
  },
  iconLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
