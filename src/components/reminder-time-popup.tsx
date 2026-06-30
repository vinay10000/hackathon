import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useThemeTokens } from '@/src/theme/colors';

type ReminderTimePopupProps = {
  initialTime: string;
  inputSurface: string;
  onCancel: () => void;
  onConfirm: (time: string) => void;
};

export function ReminderTimePopup({ initialTime, inputSurface, onCancel, onConfirm }: ReminderTimePopupProps) {
  const tokens = useThemeTokens();
  const isLight = tokens.mode === 'light';
  const [initialHour, initialMinute] = normalizeTimeParts(initialTime || '08:00');
  const [hourInput, setHourInput] = useState(initialHour);
  const [minuteInput, setMinuteInput] = useState(initialMinute);
  const [activeTimePart, setActiveTimePart] = useState<'hour' | 'minute' | null>(null);

  return (
    <View style={styles.popupLayer}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: isLight ? 'rgba(16,24,40,0.28)' : 'rgba(0,0,0,0.58)' }]} onPress={onCancel} />
      <View style={[styles.reminderCard, { backgroundColor: isLight ? '#ffffff' : tokens.surface, borderColor: isLight ? '#e1e7f0' : tokens.border }]}>
        <Text style={[styles.popupTitle, { color: tokens.text }]}>Enter time</Text>
        <View style={styles.timeDisplay}>
          <View>
            <TextInput
              accessibilityLabel="Reminder hour"
              keyboardType="number-pad"
              maxLength={2}
              value={hourInput}
              onFocus={() => setActiveTimePart('hour')}
              onBlur={() => {
                setActiveTimePart(null);
                setHourInput(normalizeLooseTimePart(hourInput));
              }}
              onChangeText={(nextHour) => setHourInput(sanitizeTimeInput(nextHour))}
              style={[
                styles.timeBox,
                activeTimePart === 'hour' ? styles.activeTimeBox : null,
                {
                  backgroundColor: isLight ? '#ffffff' : '#f8fafc',
                  borderColor: activeTimePart === 'hour' ? (isLight ? '#2f231d' : tokens.primary) : 'transparent',
                  color: '#10243e',
                },
              ]}
            />
            <Text style={[styles.timeHint, { color: tokens.text }]}>Hour</Text>
          </View>
          <Text style={[styles.timeSeparator, { color: tokens.text }]}>:</Text>
          <View>
            <TextInput
              accessibilityLabel="Reminder minute"
              keyboardType="number-pad"
              maxLength={2}
              value={minuteInput}
              onFocus={() => setActiveTimePart('minute')}
              onBlur={() => {
                setActiveTimePart(null);
                setMinuteInput(normalizeLooseTimePart(minuteInput));
              }}
              onChangeText={(nextMinute) => setMinuteInput(sanitizeTimeInput(nextMinute))}
              style={[
                styles.timeBox,
                activeTimePart === 'minute' ? styles.activeTimeBox : null,
                {
                  backgroundColor: isLight ? inputSurface : '#f8fafc',
                  borderColor: activeTimePart === 'minute' ? (isLight ? '#2f231d' : tokens.primary) : 'transparent',
                  color: '#10243e',
                },
              ]}
            />
            <Text style={[styles.timeHint, { color: tokens.text }]}>Minute</Text>
          </View>
        </View>

        <View style={styles.popupActions}>
          <View style={styles.popupActionGroup}>
            <Pressable onPress={onCancel} style={styles.popupTextAction}>
              <Text style={[styles.popupActionText, { color: tokens.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(normalizeTime(`${hourInput}:${minuteInput}`))}
              style={styles.popupTextAction}
            >
              <Text style={[styles.popupActionText, { color: tokens.text }]}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export function normalizeTimeParts(value: string) {
  const [rawHour = '08', rawMinute = '00'] = value.split(':');
  return [rawHour.padStart(2, '0').slice(-2), rawMinute.padStart(2, '0').slice(-2)] as const;
}

export function normalizeTime(value: string) {
  const [rawHour, rawMinute] = normalizeTimeParts(value);
  const hour = Math.min(23, Math.max(0, Number.parseInt(rawHour, 10) || 0));
  const minute = Math.min(59, Math.max(0, Number.parseInt(rawMinute, 10) || 0));
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function sanitizeTimeInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 2);
}

function normalizeLooseTimePart(value: string) {
  const numeric = sanitizeTimeInput(value);
  if (!numeric) {
    return '00';
  }

  return numeric.padStart(2, '0').slice(-2);
}

const styles = StyleSheet.create({
  popupLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  reminderCard: {
    width: 228,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  popupTitle: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 18,
  },
  timeDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 12,
  },
  timeBox: {
    width: 72,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 40,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 2,
  },
  activeTimeBox: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  timeSeparator: {
    fontSize: 42,
    fontWeight: '600',
    lineHeight: 54,
  },
  timeHint: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
  },
  popupActions: {
    marginTop: 18,
    alignItems: 'flex-end',
  },
  popupActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  popupTextAction: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  popupActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
