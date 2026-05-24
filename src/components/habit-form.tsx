import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { HABIT_COLORS, HABIT_ICONS } from '@/src/domain/habits';
import { palette, useThemeTokens } from '@/src/theme/colors';
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

const kinds: { label: string; value: HabitKind }[] = [
  { label: 'Yes / No', value: 'yesNo' },
  { label: 'Count', value: 'count' },
  { label: 'Duration', value: 'duration' },
  { label: 'Negative', value: 'negative' },
];

const schedules: { label: string; value: HabitFormDraft['scheduleKind'] }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekdays', value: 'weekdays' },
  { label: 'Times / Week', value: 'timesPerWeek' },
  { label: 'Times / Month', value: 'timesPerMonth' },
  { label: 'Interval', value: 'interval' },
];

export function HabitForm({ draft, onChange }: HabitFormProps) {
  const tokens = useThemeTokens();
  return (
    <View style={styles.form}>
      <Field label="Habit name" textColor={tokens.text}>
        <TextInput value={draft.name} onChangeText={(name) => onChange({ ...draft, name })} placeholder="Drink water" placeholderTextColor={tokens.textMuted} style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderColor: tokens.border }]} />
      </Field>

      <Field label="Type" textColor={tokens.text}>
        <View style={styles.pillRow}>
          {kinds.map((option) => (
            <Pressable key={option.value} style={[styles.pill, { backgroundColor: tokens.surface, borderColor: tokens.border }, draft.kind === option.value && { backgroundColor: tokens.primary }]} onPress={() => onChange({ ...draft, kind: option.value })}>
              <Text style={[styles.pillLabel, { color: draft.kind === option.value && tokens.mode === 'light' ? '#ffffff' : tokens.text }]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="Category" textColor={tokens.text}>
        <TextInput value={draft.category} onChangeText={(category) => onChange({ ...draft, category })} placeholder="Wellness" placeholderTextColor={tokens.textMuted} style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderColor: tokens.border }]} />
      </Field>

      {(draft.kind === 'count' || draft.kind === 'duration') && (
        <View style={styles.row}>
          <Field label="Target" textColor={tokens.text}>
            <TextInput value={draft.targetValue} onChangeText={(targetValue) => onChange({ ...draft, targetValue })} keyboardType="numeric" placeholder="8" placeholderTextColor={tokens.textMuted} style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderColor: tokens.border }]} />
          </Field>
          <Field label="Unit" textColor={tokens.text}>
            <TextInput value={draft.unit} onChangeText={(unit) => onChange({ ...draft, unit })} placeholder="glasses" placeholderTextColor={tokens.textMuted} style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderColor: tokens.border }]} />
          </Field>
        </View>
      )}

      <Field label="Schedule" textColor={tokens.text}>
        <View style={styles.pillRow}>
          {schedules.map((option) => (
            <Pressable key={option.value} style={[styles.pill, { backgroundColor: tokens.surface, borderColor: tokens.border }, draft.scheduleKind === option.value && { backgroundColor: tokens.primary }]} onPress={() => onChange({ ...draft, scheduleKind: option.value })}>
              <Text style={[styles.pillLabel, { color: draft.scheduleKind === option.value && tokens.mode === 'light' ? '#ffffff' : tokens.text }]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      {draft.scheduleKind === 'weekdays' && (
        <View style={styles.weekdays}>
          {weekdayOptions.map((weekday) => {
            const selected = draft.weekdays.includes(weekday.value);
            return (
              <Pressable
                key={weekday.value}
                style={[styles.weekday, { backgroundColor: tokens.surface, borderColor: tokens.border }, selected && { backgroundColor: tokens.primary }]}
                onPress={() =>
                  onChange({
                    ...draft,
                    weekdays: selected ? draft.weekdays.filter((item) => item !== weekday.value) : [...draft.weekdays, weekday.value].sort(),
                  })
                }
              >
                <Text style={[styles.weekdayLabel, { color: selected && tokens.mode === 'light' ? '#ffffff' : tokens.text }]}>{weekday.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {(draft.scheduleKind === 'timesPerWeek' || draft.scheduleKind === 'timesPerMonth') && (
        <Field label={draft.scheduleKind === 'timesPerWeek' ? 'Times per week' : 'Times per month'} textColor={tokens.text}>
          <TextInput value={draft.cadenceCount} onChangeText={(cadenceCount) => onChange({ ...draft, cadenceCount })} keyboardType="numeric" placeholder="3" placeholderTextColor={tokens.textMuted} style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderColor: tokens.border }]} />
        </Field>
      )}

      {draft.scheduleKind === 'interval' && (
        <Field label="Every N days" textColor={tokens.text}>
          <TextInput value={draft.intervalDays} onChangeText={(intervalDays) => onChange({ ...draft, intervalDays })} keyboardType="numeric" placeholder="2" placeholderTextColor={tokens.textMuted} style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderColor: tokens.border }]} />
        </Field>
      )}

      <View style={styles.row}>
        <Field label="Start date" textColor={tokens.text}>
          <TextInput value={draft.startDate} onChangeText={(startDate) => onChange({ ...draft, startDate })} placeholder="2026-05-24" placeholderTextColor={tokens.textMuted} style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderColor: tokens.border }]} />
        </Field>
        <Field label="End date" textColor={tokens.text}>
          <TextInput value={draft.endDate} onChangeText={(endDate) => onChange({ ...draft, endDate })} placeholder="Optional" placeholderTextColor={tokens.textMuted} style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderColor: tokens.border }]} />
        </Field>
      </View>

      <Field label="Reminder" textColor={tokens.text}>
        <View style={[styles.switchRow, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Text style={[styles.switchLabel, { color: tokens.text }]}>Enable a local reminder</Text>
          <Switch value={draft.reminderEnabled} onValueChange={(reminderEnabled) => onChange({ ...draft, reminderEnabled })} />
        </View>
        {draft.reminderEnabled ? (
          <TextInput value={draft.reminderTime} onChangeText={(reminderTime) => onChange({ ...draft, reminderTime })} placeholder="08:00" placeholderTextColor={tokens.textMuted} style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderColor: tokens.border }]} />
        ) : null}
      </Field>

      <Field label="Color" textColor={tokens.text}>
        <View style={styles.swatchRow}>
          {HABIT_COLORS.map((color) => (
            <Pressable key={color} style={[styles.swatch, { backgroundColor: color }, draft.color === color && styles.swatchActive]} onPress={() => onChange({ ...draft, color })} />
          ))}
        </View>
      </Field>

      <Field label="Description" textColor={tokens.text}>
        <TextInput value={draft.description} onChangeText={(description) => onChange({ ...draft, description })} placeholder="Why this matters" placeholderTextColor={tokens.textMuted} style={[styles.input, styles.multiline, { backgroundColor: tokens.surface, color: tokens.text, borderColor: tokens.border }]} multiline />
      </Field>

      <Field label="Motivational note" textColor={tokens.text}>
        <TextInput
          value={draft.motivationalNote}
          onChangeText={(motivationalNote) => onChange({ ...draft, motivationalNote })}
          placeholder="Tiny nudge for reminder copy"
          placeholderTextColor={tokens.textMuted}
          style={[styles.input, styles.multiline, { backgroundColor: tokens.surface, color: tokens.text, borderColor: tokens.border }]}
          multiline
        />
      </Field>

      <Field label="Icon keyword" textColor={tokens.text}>
        <View style={styles.pillRow}>
          {HABIT_ICONS.map((icon) => (
            <Pressable key={icon} style={[styles.pill, { backgroundColor: tokens.surface, borderColor: tokens.border }, draft.icon === icon && { backgroundColor: tokens.primary }]} onPress={() => onChange({ ...draft, icon })}>
              <Text style={[styles.pillLabel, { color: draft.icon === icon && tokens.mode === 'light' ? '#ffffff' : tokens.text }]}>{icon}</Text>
            </Pressable>
          ))}
        </View>
      </Field>
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

const styles = StyleSheet.create({
  form: {
    gap: 16,
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
  },
  multiline: {
    minHeight: 84,
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
    fontWeight: '600',
  },
  weekdays: {
    flexDirection: 'row',
    gap: 8,
  },
  weekday: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  switchLabel: {
    fontWeight: '600',
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: '#ffffff',
  },
});
