import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

import { PrimaryButton } from '@/src/components/primary-button';
import { AiCommandPreview, resolveHabitCommand } from '@/src/lib/ai-assistant';
import { generateGeminiText, getGeminiModelName } from '@/src/lib/gemini';
import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';

type AssistantMode = 'idle' | 'listening' | 'thinking' | 'preview' | 'clarify' | 'success' | 'error';

export default function AssistantScreen() {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
  const habits = useAppStore((state) => state.habits);
  const logs = useAppStore((state) => state.logs);
  const history = useAppStore((state) => state.aiHistory);
  const aiEnabled = useAppStore((state) => state.preferences.aiEnabled);
  const microphonePermission = useAppStore((state) => state.preferences.microphonePermission);
  const addAiHistoryItem = useAppStore((state) => state.addAiHistoryItem);
  const updateAiHistoryStatus = useAppStore((state) => state.updateAiHistoryStatus);
  const clearAiHistory = useAppStore((state) => state.clearAiHistory);
  const setMicrophonePermission = useAppStore((state) => state.setMicrophonePermission);
  const completeHabit = useAppStore((state) => state.completeHabit);
  const skipHabit = useAppStore((state) => state.skipHabit);
  const archiveHabit = useAppStore((state) => state.archiveHabit);
  const restoreHabit = useAppStore((state) => state.restoreHabit);
  const deleteHabit = useAppStore((state) => state.deleteHabit);
  const updateHabitNote = useAppStore((state) => state.updateHabitNote);
  const updateHabitValue = useAppStore((state) => state.updateHabitValue);
  const saveHabit = useAppStore((state) => state.saveHabit);

  const [command, setCommand] = useState('');
  const [preview, setPreview] = useState<AiCommandPreview | null>(null);
  const [assistantOutput, setAssistantOutput] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [mode, setMode] = useState<AssistantMode>('idle');
  const [recognizing, setRecognizing] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const latestCommandRef = useRef(command);
  const pulse = useRef(new Animated.Value(0)).current;

  latestCommandRef.current = command;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  useSpeechRecognitionEvent('start', () => {
    setRecognizing(true);
    setSpeechError(null);
    setAssistantOutput(null);
    setMode('listening');
  });

  useSpeechRecognitionEvent('end', () => {
    setRecognizing(false);
    setMode((currentMode) => (currentMode === 'thinking' ? currentMode : preview?.status === 'previewed' ? 'preview' : 'idle'));
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcripts = ((event.results ?? []) as Array<{ transcript?: string }>)
      .map((item) => item.transcript?.trim() ?? '')
      .filter(Boolean);

    const transcript = transcripts.join(' ').trim();
    if (transcript) {
      setCommand(transcript);
      setSelectedHabitId(null);
      setSpeechError(null);
      setMode('listening');
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setRecognizing(false);
    setSpeechError(`${event.error}: ${event.message}`);
    setMode('error');
    if (event.error === 'not-allowed') {
      setMicrophonePermission('denied');
    }
  });

  const orbTone = useMemo(() => {
    if (mode === 'preview' && preview?.status === 'previewed') {
      return {
        ring: '#4ade80',
        glow: 'rgba(74,222,128,0.32)',
        core: 'rgba(22,163,74,0.18)',
      };
    }
    if (mode === 'clarify') {
      return {
        ring: '#fbbf24',
        glow: 'rgba(251,191,36,0.28)',
        core: 'rgba(245,158,11,0.16)',
      };
    }
    if (mode === 'error') {
      return {
        ring: tokens.danger,
        glow: 'rgba(248,113,113,0.26)',
        core: 'rgba(239,68,68,0.14)',
      };
    }
    if (mode === 'success') {
      return {
        ring: tokens.success,
        glow: 'rgba(74,222,128,0.28)',
        core: 'rgba(22,163,74,0.14)',
      };
    }
    if (mode === 'thinking') {
      return {
        ring: '#7dd3fc',
        glow: 'rgba(125,211,252,0.28)',
        core: 'rgba(14,165,233,0.14)',
      };
    }
    return {
      ring: tokens.primary,
      glow: tokens.mode === 'light' ? 'rgba(37,99,235,0.26)' : 'rgba(96,165,250,0.28)',
      core: tokens.mode === 'light' ? 'rgba(37,99,235,0.12)' : 'rgba(96,165,250,0.14)',
    };
  }, [mode, preview?.status, tokens.danger, tokens.mode, tokens.primary, tokens.success]);

  const orbScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange:
      mode === 'listening'
        ? [0.98, 1.05]
        : mode === 'thinking'
          ? [0.99, 1.03]
          : mode === 'preview'
            ? [1, 1.025]
            : [1, 1.015],
  });

  const statusLabel =
    mode === 'listening'
      ? 'Listening...'
      : mode === 'thinking'
        ? `Understanding with ${getGeminiModelName()}`
        : mode === 'preview'
          ? 'Confirmation preview ready'
          : mode === 'clarify'
            ? 'One more detail needed'
            : mode === 'success'
              ? 'Action completed'
              : mode === 'error'
                ? 'Something went wrong'
                : 'Speak or type a habit request';

  const statusHelper =
    preview?.status === 'previewed'
      ? 'Review the action below, then confirm.'
      : preview?.status === 'needs-clarification'
        ? 'Pick a habit or refine the transcript before anything changes.'
        : 'Live transcript stays editable before execution.';

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: tokens.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 170 + Math.max(insets.bottom, 12) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCopy}>
            <Text style={[styles.title, { color: tokens.text }]}>Assistant</Text>
            <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
              Talk naturally to create, edit, archive, delete, or log habits with a confirmation step before anything writes.
            </Text>
          </View>

          <View pointerEvents="none" style={styles.orbStage}>
            <View style={[styles.backgroundGlow, { backgroundColor: orbTone.glow }]} />
            <Animated.View
              style={[
                styles.orbOuter,
                {
                  borderColor: orbTone.ring,
                  shadowColor: orbTone.ring,
                  transform: [{ scale: orbScale }],
                },
              ]}
            >
              <View style={[styles.orbMiddle, { borderColor: `${orbTone.ring}BB` }]}>
                <View style={[styles.orbCore, { backgroundColor: orbTone.core }]}>
                  <WaveGlyph color={orbTone.ring} active={mode === 'listening' || mode === 'thinking'} />
                </View>
              </View>
            </Animated.View>
          </View>

          <View style={styles.statusBlock}>
            <Text style={[styles.statusLabel, { color: orbTone.ring }]}>{statusLabel}</Text>
            <Text style={[styles.statusHelper, { color: tokens.textMuted }]}>{statusHelper}</Text>
          </View>

          <View
            style={[
              styles.transcriptCard,
              {
                backgroundColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.88)' : 'rgba(8,18,33,0.78)',
                borderColor:
                  preview?.status === 'previewed'
                    ? 'rgba(74,222,128,0.36)'
                    : tokens.mode === 'light'
                      ? 'rgba(37,99,235,0.18)'
                      : 'rgba(96,165,250,0.22)',
              },
            ]}
          >
            <View style={styles.transcriptHeader}>
              <View style={[styles.transcriptBadge, { backgroundColor: `${orbTone.ring}22` }]}>
                <Ionicons name="mic" size={18} color={orbTone.ring} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.transcriptLabel, { color: tokens.text }]}>Live transcript</Text>
                <Text style={[styles.transcriptHint, { color: tokens.textMuted }]}>
                  Edit the text if speech recognition misses anything.
                </Text>
              </View>
            </View>

            <TextInput
              multiline
              editable={aiEnabled}
              value={command}
              onChangeText={(nextValue) => {
                setCommand(nextValue);
                setSelectedHabitId(null);
                setPreview(null);
                setAssistantOutput(null);
                if (mode !== 'listening' && mode !== 'thinking') {
                  setMode(nextValue.trim() ? 'idle' : 'idle');
                }
              }}
              placeholder="Try: Change my reading habit to 30 minutes every night."
              placeholderTextColor={tokens.textMuted}
              style={[styles.transcriptInput, { color: tokens.text }]}
            />
          </View>

          {preview ? (
            <View
              style={[
                styles.previewCard,
                {
                  backgroundColor:
                    preview.status === 'previewed'
                      ? 'rgba(22,163,74,0.12)'
                      : tokens.mode === 'light'
                        ? 'rgba(245,158,11,0.10)'
                        : 'rgba(120,53,15,0.22)',
                  borderColor:
                    preview.status === 'previewed'
                      ? 'rgba(74,222,128,0.34)'
                      : 'rgba(251,191,36,0.28)',
                },
              ]}
            >
              <View style={styles.previewHeader}>
                <View>
                  <Text style={[styles.previewKicker, { color: preview.status === 'previewed' ? '#4ade80' : '#fbbf24' }]}>
                    {preview.status === 'previewed' ? 'Confirmation Preview' : 'Need Clarification'}
                  </Text>
                  <Text style={[styles.previewIntent, { color: tokens.text }]}>
                    {preview.intent === 'unknown' ? 'Assistant review' : `${preview.intent} intent`}
                  </Text>
                </View>
                <Text style={[styles.previewProvider, { color: tokens.textMuted }]}>
                  {preview.provider === 'google' ? 'Google model' : 'Local rules'}
                </Text>
              </View>

              <Text style={[styles.previewBody, { color: tokens.text }]}>{preview.preview}</Text>

              {preview.destructiveSuggestion ? (
                <View style={[styles.warningCard, { backgroundColor: 'rgba(251,191,36,0.12)', borderColor: 'rgba(251,191,36,0.24)' }]}>
                  <Ionicons name="alert-circle" size={18} color="#fbbf24" />
                  <Text style={[styles.warningText, { color: tokens.text }]}>{preview.destructiveSuggestion}</Text>
                </View>
              ) : null}

              {preview.disambiguationOptions?.length ? (
                <View style={styles.chipWrap}>
                  {preview.disambiguationOptions.map((option) => (
                    <Pressable
                      key={option.id}
                      onPress={() => {
                        setSelectedHabitId(option.id);
                        void handlePreview(option.id);
                      }}
                      style={[
                        styles.choiceChip,
                        {
                          backgroundColor:
                            selectedHabitId === option.id
                              ? 'rgba(96,165,250,0.18)'
                              : tokens.mode === 'light'
                                ? 'rgba(16,36,62,0.06)'
                                : 'rgba(255,255,255,0.04)',
                          borderColor:
                            selectedHabitId === option.id ? tokens.primary : tokens.border,
                        },
                      ]}
                    >
                      <Text style={[styles.choiceChipLabel, { color: tokens.text }]}>
                        {option.name}
                        {option.archived ? ' · Archived' : ''}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={styles.actionRow}>
                {preview.status === 'previewed' ? (
                  <PrimaryButton
                    label={confirmLabelFor(preview)}
                    onPress={() => {
                      void handleConfirm();
                    }}
                  />
                ) : (
                  <PrimaryButton
                    label="Refresh preview"
                    onPress={() => {
                      void handlePreview(selectedHabitId ?? undefined);
                    }}
                  />
                )}

                {preview.intent === 'delete' && preview.matchedHabitId && preview.destructiveSuggestion ? (
                  <PrimaryButton
                    label="Archive instead"
                    tone="secondary"
                    onPress={() => {
                      archiveHabit(preview.matchedHabitId!);
                      setAssistantOutput('Habit archived instead of being deleted. Historical progress stays available.');
                      setMode('success');
                      if (activePreviewId) {
                        updateAiHistoryStatus(activePreviewId, 'confirmed');
                      }
                    }}
                  />
                ) : null}

                <PrimaryButton
                  label="Cancel"
                  tone="secondary"
                  onPress={() => {
                    if (activePreviewId) {
                      updateAiHistoryStatus(activePreviewId, 'cancelled');
                    }
                    setPreview(null);
                    setAssistantOutput(null);
                    setMode(command.trim() ? 'idle' : 'idle');
                  }}
                />
              </View>
            </View>
          ) : null}

          {assistantOutput ? (
            <View
              style={[
                styles.resultCard,
                {
                  backgroundColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(8,18,33,0.78)',
                  borderColor: 'rgba(74,222,128,0.24)',
                },
              ]}
            >
              <Text style={[styles.resultTitle, { color: tokens.text }]}>Assistant result</Text>
              <Text style={[styles.resultBody, { color: tokens.textMuted }]}>{assistantOutput}</Text>
            </View>
          ) : null}

          <View style={styles.controlRow}>
            <VoicePillButton
              icon={recognizing ? 'pause' : microphonePermission === 'granted' ? 'mic' : 'shield-checkmark'}
              label={recognizing ? 'Stop' : microphonePermission === 'granted' ? 'Voice' : 'Allow'}
              color={tokens.textMuted}
              glowColor="transparent"
              onPress={recognizing ? stopListening : startListening}
            />

            <VoicePillButton
              icon={recognizing ? 'radio' : 'sparkles'}
              label={recognizing ? 'Live' : 'Preview'}
              color="#ffffff"
              glowColor={orbTone.ring}
              active
              onPress={() => {
                void handlePreview(selectedHabitId ?? undefined);
              }}
            />

            <VoicePillButton
              icon="close"
              label="Clear"
              color={tokens.danger}
              glowColor="transparent"
              onPress={resetComposer}
            />
          </View>

          {speechError ? (
            <Text style={[styles.errorText, { color: tokens.danger }]}>{speechError}</Text>
          ) : null}

          <View
            style={[
              styles.examplesCard,
              {
                backgroundColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.82)' : 'rgba(8,18,33,0.72)',
                borderColor: tokens.mode === 'light' ? 'rgba(37,99,235,0.14)' : 'rgba(96,165,250,0.18)',
              },
            ]}
          >
            <Text style={[styles.examplesTitle, { color: tokens.text }]}>What you can say</Text>
            <Text style={[styles.exampleLine, { color: tokens.textMuted }]}>“Create a water habit for 8 glasses every day at 8 am.”</Text>
            <Text style={[styles.exampleLine, { color: tokens.textMuted }]}>“Change my reading habit to 30 minutes every night.”</Text>
            <Text style={[styles.exampleLine, { color: tokens.textMuted }]}>“I completed meditation today.”</Text>
            <Text style={[styles.exampleLine, { color: tokens.textMuted }]}>“Mark yesterday’s workout as completed.”</Text>
            <Text style={[styles.exampleLine, { color: tokens.textMuted }]}>“Delete my sugar habit.”</Text>
          </View>

          <View
            style={[
              styles.historyCard,
              {
                backgroundColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.82)' : 'rgba(8,18,33,0.72)',
                borderColor: tokens.mode === 'light' ? 'rgba(37,99,235,0.14)' : 'rgba(96,165,250,0.18)',
              },
            ]}
          >
            <View style={styles.historyHeader}>
              <Text style={[styles.historyTitle, { color: tokens.text }]}>Recent assistant actions</Text>
              {history.length ? (
                <Pressable onPress={clearAiHistory}>
                  <Text style={[styles.clearHistory, { color: tokens.danger }]}>Clear</Text>
                </Pressable>
              ) : null}
            </View>

            {history.length ? (
              history.slice(0, 4).map((item) => (
                <View key={item.id} style={[styles.historyItem, { borderTopColor: tokens.border }]}>
                  <Text style={[styles.historyMeta, { color: tokens.text }]}>
                    {item.intent} · {item.status}
                  </Text>
                  <Text style={[styles.historyText, { color: tokens.textMuted }]}>{item.interpretedText || item.preview}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.historyEmpty, { color: tokens.textMuted }]}>
                No assistant confirmations yet. Your history stays local on this device.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  async function handlePreview(overrideHabitId?: string) {
    if (!aiEnabled) {
      setSpeechError('The assistant is disabled in Settings. Re-enable it before generating previews.');
      setMode('error');
      return;
    }

    const nextCommand = latestCommandRef.current.trim();
    if (!nextCommand) {
      setSpeechError('Say or type a habit request first.');
      setMode('error');
      return;
    }

    setSpeechError(null);
    setAssistantOutput(null);
    setMode('thinking');

    try {
      const nextPreview = await resolveHabitCommand(nextCommand, habits, logs, {
        selectedHabitId: overrideHabitId,
      });

      setPreview(nextPreview);
      setSelectedHabitId(overrideHabitId ?? nextPreview.matchedHabitId ?? null);
      setMode(nextPreview.status === 'previewed' ? 'preview' : 'clarify');

      const item = addAiHistoryItem({
        input: nextCommand,
        interpretedText: nextPreview.interpretedText,
        intent: nextPreview.intent,
        preview: nextPreview.preview,
        matchedHabitId: nextPreview.matchedHabitId,
        status: nextPreview.status,
      });
      setActivePreviewId(item.id);
    } catch (error) {
      setSpeechError(error instanceof Error ? error.message : 'Could not prepare an assistant preview.');
      setMode('error');
    }
  }

  async function handleConfirm() {
    if (!preview || preview.status !== 'previewed') {
      return;
    }

    try {
      let output = '';
      const execution = preview.execution;

      if (execution?.type === 'create') {
        const habit = await saveHabit(execution.draft);
        output = `Created ${habit.name}. Review it anytime from the Today or Calendar flows.`;
      } else if (execution?.type === 'modify') {
        const habit = await saveHabit(execution.draft, execution.habitId);
        output = `Updated ${habit.name}. The confirmed habit changes are saved locally.`;
      } else if (execution?.type === 'complete') {
        completeHabit(execution.habitId, execution.dateKey);
        output = `Marked the habit complete for ${friendlyResultDate(execution.dateKey)}.`;
      } else if (execution?.type === 'skip') {
        skipHabit(execution.habitId, execution.dateKey);
        output = `Marked the habit skipped for ${friendlyResultDate(execution.dateKey)}.`;
      } else if (execution?.type === 'log') {
        updateHabitValue(execution.habitId, execution.dateKey, execution.value, execution.note);
        output = `Logged ${execution.value} for ${friendlyResultDate(execution.dateKey)}.`;
      } else if (execution?.type === 'note') {
        updateHabitNote(execution.habitId, execution.dateKey, execution.note);
        output = `Saved the note for ${friendlyResultDate(execution.dateKey)}.`;
      } else if (execution?.type === 'archive') {
        archiveHabit(execution.habitId);
        output = 'Habit archived. Historical data stays intact.';
      } else if (execution?.type === 'restore') {
        restoreHabit(execution.habitId);
        output = 'Habit restored and active again.';
      } else if (execution?.type === 'delete') {
        await deleteHabit(execution.habitId);
        output = 'Habit deleted from local data.';
      } else if (preview.intent === 'summary' || preview.intent === 'recommendation') {
        const activeHabits = habits.filter((habit) => !habit.archivedAt);
        const prompt = [
          `User command: ${command}`,
          `Interpreted preview: ${preview.preview}`,
          `Active habits: ${JSON.stringify(activeHabits)}`,
          `Habit logs: ${JSON.stringify(logs.slice(0, 150))}`,
          'Write a short, supportive response for the habit app. Be specific, non-judgmental, and avoid medical, legal, or financial advice.',
        ].join('\n\n');
        const systemInstruction =
          preview.intent === 'summary'
            ? 'You are an in-app habit assistant. Summarize current habit progress in simple, encouraging language using only the provided local data.'
            : 'You are an in-app habit coach. Recommend small, realistic habits, targets, and reminders using only the provided local data and the user request.';
        output = await generateGeminiText(prompt, { systemInstruction });
      }

      if (!output) {
        throw new Error('The assistant preview could not be executed safely.');
      }

      setAssistantOutput(output);
      setMode('success');
      if (activePreviewId) {
        updateAiHistoryStatus(activePreviewId, 'confirmed');
      }
    } catch (error) {
      setSpeechError(error instanceof Error ? error.message : 'The assistant could not complete that action.');
      setMode('error');
      if (activePreviewId) {
        updateAiHistoryStatus(activePreviewId, 'failed');
      }
    }
  }

  async function startListening() {
    setSpeechError(null);
    setAssistantOutput(null);

    try {
      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!available) {
        setSpeechError('Speech recognition is not available on this device. You can still type the request below.');
        setMode('error');
        return;
      }

      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setMicrophonePermission(permission.granted ? 'granted' : 'denied');
      if (!permission.granted) {
        setSpeechError('Microphone or speech recognition permission was not granted. Type the request instead.');
        setMode('error');
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
      setMode('error');
    }
  }

  function stopListening() {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      setRecognizing(false);
      setSpeechError(error instanceof Error ? error.message : 'Could not stop speech recognition.');
      setMode('error');
    }
  }

  function resetComposer() {
    if (activePreviewId) {
      updateAiHistoryStatus(activePreviewId, 'cancelled');
    }
    setCommand('');
    setPreview(null);
    setAssistantOutput(null);
    setSpeechError(null);
    setSelectedHabitId(null);
    setMode('idle');
  }
}

function confirmLabelFor(preview: AiCommandPreview) {
  switch (preview.intent) {
    case 'delete':
      return 'Delete habit';
    case 'archive':
      return 'Archive habit';
    case 'restore':
      return 'Restore habit';
    case 'create':
      return 'Create habit';
    case 'modify':
      return 'Save changes';
    case 'summary':
      return 'Get summary';
    case 'recommendation':
      return 'Get advice';
    default:
      return 'Confirm';
  }
}

function friendlyResultDate(dateKey: string) {
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  if (dateKey === todayKey) {
    return 'today';
  }
  return dateKey;
}

function WaveGlyph({ color, active }: { color: string; active: boolean }) {
  return (
    <View style={styles.waveGlyph}>
      {[12, 22, 30, 22, 12].map((height, index) => (
        <View
          key={`${height}-${index}`}
          style={[
            styles.waveBar,
            {
              backgroundColor: color,
              height: active ? height : Math.max(10, height - 8),
              opacity: active ? 1 : 0.72,
            },
          ]}
        />
      ))}
    </View>
  );
}

function VoicePillButton({
  icon,
  label,
  color,
  glowColor,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  glowColor: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.voiceButton,
        active && {
          shadowColor: glowColor,
          shadowOpacity: 0.34,
        },
      ]}
    >
      <View
        style={[
          styles.voiceButtonCore,
          {
            borderColor: active ? `${glowColor}66` : 'rgba(148,163,184,0.2)',
            backgroundColor: active ? 'rgba(30,41,59,0.86)' : 'rgba(12,18,31,0.72)',
          },
        ]}
      >
        <Ionicons name={icon} size={active ? 28 : 24} color={color} />
      </View>
      <Text style={[styles.voiceButtonLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 10,
    gap: 18,
  },
  heroCopy: {
    gap: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 26,
    maxWidth: 520,
  },
  orbStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 6,
  },
  backgroundGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 1,
  },
  orbOuter: {
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.32,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
  },
  orbMiddle: {
    width: 216,
    height: 216,
    borderRadius: 108,
    borderWidth: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbCore: {
    width: 166,
    height: 166,
    borderRadius: 83,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveGlyph: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waveBar: {
    width: 6,
    borderRadius: 99,
  },
  statusBlock: {
    alignItems: 'center',
    gap: 5,
    marginTop: -2,
  },
  statusLabel: {
    fontSize: 20,
    fontWeight: '800',
  },
  statusHelper: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  transcriptCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transcriptBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcriptLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  transcriptHint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  transcriptInput: {
    minHeight: 110,
    fontSize: 18,
    lineHeight: 30,
    textAlignVertical: 'top',
  },
  previewCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  previewKicker: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  previewIntent: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  previewProvider: {
    fontSize: 13,
    fontWeight: '700',
  },
  previewBody: {
    fontSize: 16,
    lineHeight: 25,
  },
  warningCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    lineHeight: 21,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choiceChipLabel: {
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  resultCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  resultBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'flex-start',
    paddingTop: 6,
  },
  voiceButton: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  voiceButtonCore: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  examplesCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  examplesTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  exampleLine: {
    fontSize: 15,
    lineHeight: 22,
  },
  historyCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  clearHistory: {
    fontWeight: '800',
  },
  historyItem: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 4,
  },
  historyMeta: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  historyText: {
    fontSize: 14,
    lineHeight: 21,
  },
  historyEmpty: {
    fontSize: 14,
    lineHeight: 21,
  },
});
