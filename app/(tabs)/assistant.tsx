import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { format } from 'date-fns';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { interpretHabitCommand } from '@/src/lib/ai-assistant';
import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';

export default function AssistantScreen() {
  const tokens = useThemeTokens();
  const habits = useAppStore((state) => state.habits);
  const aiEnabled = useAppStore((state) => state.preferences.aiEnabled);
  const microphonePermission = useAppStore((state) => state.preferences.microphonePermission);
  const history = useAppStore((state) => state.aiHistory);
  const addAiHistoryItem = useAppStore((state) => state.addAiHistoryItem);
  const updateAiHistoryStatus = useAppStore((state) => state.updateAiHistoryStatus);
  const setMicrophonePermission = useAppStore((state) => state.setMicrophonePermission);
  const clearAiHistory = useAppStore((state) => state.clearAiHistory);
  const toggleHabitComplete = useAppStore((state) => state.toggleHabitComplete);
  const skipHabit = useAppStore((state) => state.skipHabit);
  const archiveHabit = useAppStore((state) => state.archiveHabit);
  const restoreHabit = useAppStore((state) => state.restoreHabit);
  const deleteHabit = useAppStore((state) => state.deleteHabit);
  const updateHabitNote = useAppStore((state) => state.updateHabitNote);
  const updateHabitValue = useAppStore((state) => state.updateHabitValue);
  const [command, setCommand] = useState('');
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const preview = interpretHabitCommand(command, habits);

  useSpeechRecognitionEvent('start', () => {
    setRecognizing(true);
    setSpeechError(null);
  });
  useSpeechRecognitionEvent('end', () => setRecognizing(false));
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) {
      setCommand(transcript);
    }
  });
  useSpeechRecognitionEvent('error', (event) => {
    setRecognizing(false);
    setSpeechError(`${event.error}: ${event.message}`);
    if (event.error === 'not-allowed') {
      setMicrophonePermission('denied');
    }
  });

  return (
    <ScreenShell title="Assistant" subtitle="Type or dictate habit commands, review the interpreted text, then explicitly confirm before anything writes.">
      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <Text style={[styles.kicker, { color: tokens.primary }]}>Safe command input</Text>
        <TextInput
          value={command}
          onChangeText={setCommand}
          editable={aiEnabled}
          multiline
          placeholder="Try: I completed meditation today"
          placeholderTextColor={tokens.textMuted}
          style={[styles.commandInput, { backgroundColor: tokens.surfaceMuted, color: tokens.text, borderColor: tokens.border }]}
        />
        <Text style={[styles.body, { color: tokens.textMuted }]}>Recognized text is editable here before preview. Voice capture is gated by microphone permission and can fall back to text.</Text>
        {speechError ? <Text style={[styles.errorText, { color: tokens.danger }]}>{speechError}</Text> : null}
        <View style={styles.row}>
          <PrimaryButton
            label={recognizing ? 'Stop listening' : microphonePermission === 'granted' ? 'Speak command' : 'Allow mic'}
            tone="secondary"
            onPress={recognizing ? stopListening : startListening}
          />
          <PrimaryButton
            label="Preview"
            onPress={() => {
              const item = addAiHistoryItem({
                input: command,
                interpretedText: preview.interpretedText,
                intent: preview.intent,
                preview: preview.preview,
                matchedHabitId: preview.matchedHabitId,
                status: preview.status,
              });
              setActivePreviewId(item.id);
            }}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: preview.status === 'previewed' ? tokens.primarySoft : tokens.surfaceMuted, borderColor: tokens.border }]}>
        <Text style={[styles.title, { color: tokens.text }]}>Confirmation preview</Text>
        <Text style={[styles.body, { color: tokens.textMuted }]}>Intent: {preview.intent}</Text>
        <Text style={[styles.preview, { color: tokens.text }]}>{preview.preview}</Text>
        <View style={styles.row}>
          <PrimaryButton
            label="Confirm safely"
            onPress={async () => {
              if (activePreviewId) {
                const executed = preview.status === 'previewed' ? await executePreview() : false;
                updateAiHistoryStatus(activePreviewId, executed ? 'confirmed' : 'needs-clarification');
              }
            }}
          />
          <PrimaryButton
            label="Cancel"
            tone="secondary"
            onPress={() => {
              if (activePreviewId) {
                updateAiHistoryStatus(activePreviewId, 'cancelled');
              }
              setCommand('');
              setActivePreviewId(null);
            }}
          />
        </View>
        <Text style={[styles.body, { color: tokens.textMuted }]}>This milestone records confirmation decisions only. Destructive or ambiguous commands never execute silently.</Text>
      </View>

      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <View style={styles.spaceBetween}>
          <Text style={[styles.title, { color: tokens.text }]}>Command history</Text>
          <Pressable onPress={clearAiHistory}>
            <Text style={[styles.link, { color: tokens.danger }]}>Delete history</Text>
          </Pressable>
        </View>
        {history.length ? (
          history.slice(0, 6).map((item) => (
            <View key={item.id} style={[styles.historyItem, { borderColor: tokens.border }]}>
              <Text style={[styles.historyTitle, { color: tokens.text }]}>{item.intent} · {item.status}</Text>
              <Text style={[styles.body, { color: tokens.textMuted }]}>{item.interpretedText || item.preview}</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.body, { color: tokens.textMuted }]}>No assistant commands yet. History stays local in this build.</Text>
        )}
      </View>
    </ScreenShell>
  );

  async function executePreview() {
    const habitId = preview.matchedHabitId;
    const todayKey = format(new Date(), 'yyyy-MM-dd');

    if (preview.intent === 'summary' || preview.intent === 'recommendation' || preview.intent === 'create' || preview.intent === 'modify') {
      return true;
    }

    if (!habitId) {
      return false;
    }

    if (preview.intent === 'complete') {
      toggleHabitComplete(habitId, todayKey);
      return true;
    }
    if (preview.intent === 'skip') {
      skipHabit(habitId, todayKey);
      return true;
    }
    if (preview.intent === 'archive') {
      archiveHabit(habitId);
      return true;
    }
    if (preview.intent === 'restore') {
      restoreHabit(habitId);
      return true;
    }
    if (preview.intent === 'delete') {
      await deleteHabit(habitId);
      return true;
    }
    if (preview.intent === 'note') {
      updateHabitNote(habitId, todayKey, command);
      return true;
    }
    if (preview.intent === 'log') {
      const numericValue = Number(command.match(/\d+/)?.[0] ?? 1);
      updateHabitValue(habitId, todayKey, numericValue, command);
      return true;
    }

    return false;
  }

  async function startListening() {
    setSpeechError(null);
    try {
      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!available) {
        setSpeechError('Speech recognition is not available on this device. You can still type the command.');
        return;
      }

      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setMicrophonePermission(permission.granted ? 'granted' : 'denied');
      if (!permission.granted) {
        setSpeechError('Microphone or speech recognition permission was not granted. Type the command instead.');
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        contextualStrings: habits.map((habit) => habit.name),
        addsPunctuation: true,
      });
    } catch (error) {
      setRecognizing(false);
      setSpeechError(error instanceof Error ? error.message : 'Could not start speech recognition.');
    }
  }

  function stopListening() {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      setRecognizing(false);
      setSpeechError(error instanceof Error ? error.message : 'Could not stop speech recognition.');
    }
  }
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  body: {
    lineHeight: 21,
  },
  errorText: {
    fontWeight: '700',
    lineHeight: 20,
  },
  commandInput: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    textAlignVertical: 'top',
  },
  preview: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  link: {
    fontWeight: '800',
  },
  historyItem: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 4,
  },
  historyTitle: {
    fontWeight: '800',
    textTransform: 'capitalize',
  },
});
