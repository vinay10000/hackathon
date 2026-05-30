import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

import { AiCommandPreview, resolveHabitCommand } from '@/src/lib/ai-assistant';
import { generateGeminiText } from '@/src/lib/gemini';
import { useAppStore } from '@/src/store/app-store';

type ResultPopup = {
  type: 'success' | 'failure';
  title: string;
  message: string;
};

type InteractionMode = 'voice' | 'chat';
type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  text: string;
};

export default function AssistantVoiceScreen() {
  const insets = useSafeAreaInsets();
  const habits = useAppStore((state) => state.habits);
  const logs = useAppStore((state) => state.logs);
  const aiEnabled = useAppStore((state) => state.preferences.aiEnabled);
  const addAiHistoryItem = useAppStore((state) => state.addAiHistoryItem);
  const updateAiHistoryStatus = useAppStore((state) => state.updateAiHistoryStatus);
  const setMicrophonePermission = useAppStore((state) => state.setMicrophonePermission);
  const completeHabit = useAppStore((state) => state.completeHabit);
  const skipHabit = useAppStore((state) => state.skipHabit);
  const archiveHabit = useAppStore((state) => state.archiveHabit);
  const restoreHabit = useAppStore((state) => state.restoreHabit);
  const deleteHabit = useAppStore((state) => state.deleteHabit);
  const updateHabitNote = useAppStore((state) => state.updateHabitNote);
  const updateHabitValue = useAppStore((state) => state.updateHabitValue);
  const saveHabit = useAppStore((state) => state.saveHabit);
  const [transcript, setTranscript] = useState('');
  const [agentText, setAgentText] = useState('');
  const [resultPopup, setResultPopup] = useState<ResultPopup | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('voice');
  const [chatDraft, setChatDraft] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [speechError, setSpeechError] = useState('');
  const [liveWordIndex, setLiveWordIndex] = useState(0);
  const transcriptRef = useRef('');
  const processedTranscriptRef = useRef('');
  const transcriptClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agentClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idlePulse = useRef(new Animated.Value(0)).current;
  const speechPulse = useRef(new Animated.Value(0)).current;
  const waveShift = useRef(new Animated.Value(0)).current;
  const transcriptOpacity = useRef(new Animated.Value(1)).current;
  const agentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const idleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(idlePulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(idlePulse, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const speechLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(speechPulse, {
          toValue: 1,
          duration: 720,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(speechPulse, {
          toValue: 0,
          duration: 720,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const waveLoop = Animated.loop(
      Animated.timing(waveShift, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    idleLoop.start();
    speechLoop.start();
    waveLoop.start();

    return () => {
      idleLoop.stop();
      speechLoop.stop();
      waveLoop.stop();
    };
  }, [idlePulse, speechPulse, waveShift]);

  useEffect(() => {
    const words = getTranscriptWords(transcript);
    if (!recognizing || words.length <= 1) {
      return;
    }

    setLiveWordIndex(Math.max(words.length - 1, 0));
  }, [recognizing, transcript]);

  useEffect(() => {
    if (transcriptClearTimeoutRef.current) {
      clearTimeout(transcriptClearTimeoutRef.current);
      transcriptClearTimeoutRef.current = null;
    }

    if (!transcript.trim()) {
      transcriptOpacity.setValue(1);
      return;
    }

    transcriptOpacity.setValue(1);
    transcriptClearTimeoutRef.current = setTimeout(() => {
      Animated.timing(transcriptOpacity, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setTranscript('');
        setLiveWordIndex(0);
        transcriptOpacity.setValue(1);
        transcriptClearTimeoutRef.current = null;
      });
    }, 5000);

    return () => {
      if (transcriptClearTimeoutRef.current) {
        clearTimeout(transcriptClearTimeoutRef.current);
        transcriptClearTimeoutRef.current = null;
      }
    };
  }, [transcript, transcriptOpacity]);

  useEffect(() => {
    if (agentClearTimeoutRef.current) {
      clearTimeout(agentClearTimeoutRef.current);
      agentClearTimeoutRef.current = null;
    }

    if (!agentText.trim()) {
      agentOpacity.setValue(1);
      return;
    }

    agentOpacity.setValue(1);
    agentClearTimeoutRef.current = setTimeout(() => {
      Animated.timing(agentOpacity, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setAgentText('');
        agentOpacity.setValue(1);
        agentClearTimeoutRef.current = null;
      });
    }, 5000);

    return () => {
      if (agentClearTimeoutRef.current) {
        clearTimeout(agentClearTimeoutRef.current);
        agentClearTimeoutRef.current = null;
      }
    };
  }, [agentText, agentOpacity]);

  useSpeechRecognitionEvent('start', () => {
    setRecognizing(true);
    setProcessing(false);
    setSpeechError('');
    setAgentText('');
    setResultPopup(null);
    setTranscript('');
    transcriptRef.current = '';
    processedTranscriptRef.current = '';
    setLiveWordIndex(0);
  });

  useSpeechRecognitionEvent('end', () => {
    setRecognizing(false);
    const finalTranscript = transcriptRef.current.trim();
    if (finalTranscript && finalTranscript !== processedTranscriptRef.current) {
      processedTranscriptRef.current = finalTranscript;
      void handleVoiceCommand(finalTranscript);
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    const nextTranscript = ((event.results ?? []) as Array<{ transcript?: string }>)
      .map((item) => item.transcript?.trim() ?? '')
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (nextTranscript) {
      const words = getTranscriptWords(nextTranscript);
      setTranscript(nextTranscript);
      transcriptRef.current = nextTranscript;
      setLiveWordIndex(Math.max(words.length - 1, 0));
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setRecognizing(false);
    setSpeechError(event.message || 'Could not hear that clearly.');
    setAgentText('I could not transcribe that clearly.');
    setResultPopup({
      type: 'failure',
      title: 'Speech failed',
      message: event.message || 'Try again in a quieter place.',
    });
    if (event.error === 'not-allowed') {
      setMicrophonePermission('denied');
    }
  });

  const words = useMemo(() => getTranscriptWords(transcript), [transcript]);
  const activeWordIndex = Math.min(liveWordIndex, Math.max(words.length - 1, 0));
  const orbScale = recognizing
    ? speechPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] })
    : processing
      ? speechPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] })
      : idlePulse.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1.02] });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={[styles.screen, interactionMode === 'chat' && styles.chatScreen]}>
        <Pressable
          accessibilityLabel="Close assistant"
          accessibilityRole="button"
          onPress={() => {
            if (recognizing) {
              stopListening();
            }
            router.replace('/today');
          }}
          style={[styles.closeButton, { top: Math.max(insets.top, 20) + 14 }]}
        >
          <Text style={styles.closeGlyph}>×</Text>
        </Pressable>

        <View
          style={[
            styles.topRightActions,
            {
              top: Math.max(insets.top, 20) + 20,
              right: 22,
            },
          ]}
        >
          <View style={styles.modeSwitch}>
            <ModeButton
              icon="pulse"
              active={interactionMode === 'voice'}
              accessibilityLabel="Voice mode"
              onPress={() => {
                setInteractionMode('voice');
                setResultPopup(null);
              }}
            />
            <ModeButton
              icon="create-outline"
              active={interactionMode === 'chat'}
              accessibilityLabel="AI chat mode"
              onPress={() => {
                if (recognizing) {
                  stopListening();
                }
                setInteractionMode('chat');
              }}
            />
          </View>

          {interactionMode === 'chat' ? (
            <Pressable
              accessibilityLabel="Start new chat"
              accessibilityRole="button"
              onPress={clearChat}
              style={styles.newChatButton}
            >
              <Ionicons name="refresh" size={19} color="rgba(226,232,240,0.82)" />
            </Pressable>
          ) : null}
        </View>

        {interactionMode === 'voice' ? (
          <View style={styles.centerStage}>
            <VoiceOrb idlePulse={idlePulse} speechPulse={speechPulse} waveShift={waveShift} active={recognizing || processing} scale={orbScale} />

            <View style={styles.stateRow}>
              <StateBadge label="Idle" active={!recognizing && !processing} />
              <View style={styles.stateDivider} />
              <StateBadge label={processing ? 'Thinking' : 'Speaking'} active={recognizing || processing} highlighted />
            </View>

            <View style={styles.dialogueStack}>
              {words.length ? (
                <Animated.View style={[styles.voiceCopyBlock, { opacity: transcriptOpacity }]}>
                  <Text style={styles.voiceLabel}>You said</Text>
                  <View style={styles.transcriptWrap}>
                    {words.map((word, index) => (
                      <Animated.View
                        key={`${word}-${index}`}
                        style={[
                          styles.wordWrap,
                          index === activeWordIndex && styles.activeWordWrap,
                          index === activeWordIndex && {
                            transform: [
                              {
                                scale: speechPulse.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [1, recognizing ? 1.06 : 1.02],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.word,
                            index < activeWordIndex && styles.pastWord,
                            index === activeWordIndex && styles.activeWord,
                            index > activeWordIndex && styles.futureWord,
                          ]}
                        >
                          {word}
                        </Text>
                        {index === activeWordIndex ? <View style={styles.wordWave} /> : null}
                      </Animated.View>
                    ))}
                  </View>
                </Animated.View>
              ) : (
                <View style={styles.emptyTranscriptState}>
                  <Text style={styles.emptyTranscriptTitle}>
                    {recognizing ? 'Listening...' : 'Tap the mic to speak'}
                  </Text>
                  <Text style={styles.emptyTranscriptBody}>
                    {recognizing ? 'Your words will appear here in real time.' : 'Say a habit command and I will transcribe it live.'}
                  </Text>
                </View>
              )}

              {agentText ? (
                <Animated.View style={[styles.agentResponse, { opacity: agentOpacity }]}>
                  <Text style={styles.agentLabel}>AI agent</Text>
                  <Text style={styles.agentText}>{agentText}</Text>
                </Animated.View>
              ) : null}
            </View>

            {speechError ? <Text style={styles.errorText}>{speechError}</Text> : null}
          </View>
        ) : (
          <View style={[styles.chatThread, { paddingTop: Math.max(insets.top, 20) + 82 }]}>
            {chatMessages.length ? (
              chatMessages.map((message) => (
                <View key={message.id} style={message.role === 'user' ? styles.chatUserRow : styles.chatAgentRow}>
                  {message.role === 'agent' ? <View style={styles.agentDot} /> : null}
                  <View style={[styles.chatBubble, message.role === 'user' ? styles.chatUserBubble : styles.chatAgentBubble]}>
                    <Text style={styles.chatBubbleText}>{message.text}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.chatEmptyState}>
                <Text style={styles.chatEmptyTitle}>Ask your AI habit coach</Text>
                <Text style={styles.chatEmptyBody}>Type a habit command like “Run 10 km daily”. I’ll respond, then show success or failure.</Text>
              </View>
            )}
            {processing ? (
              <View style={styles.chatAgentRow}>
                <View style={styles.agentDot} />
                <View style={[styles.chatBubble, styles.chatAgentBubble]}>
                  <Text style={styles.chatBubbleText}>Working...</Text>
                </View>
              </View>
            ) : null}
          </View>
        )}

        <Pressable
          accessibilityLabel={recognizing ? 'Stop listening' : 'Start listening'}
          accessibilityRole="button"
          onPress={recognizing ? stopListening : startListening}
          style={[
            styles.micButton,
            {
              bottom: Math.max(insets.bottom, 18) + 34,
              opacity: interactionMode === 'voice' ? 1 : 0,
              pointerEvents: interactionMode === 'voice' ? 'auto' : 'none',
            },
          ]}
        >
          <View style={styles.micGlow} />
          {recognizing || processing ? (
            <View style={styles.stopGlyph}>
              <Ionicons name="stop" size={20} color="#ffffff" />
            </View>
          ) : (
            <Ionicons name="mic" size={42} color="#1d8cff" />
          )}
        </Pressable>

        {interactionMode === 'chat' ? (
          <View style={[styles.chatComposer, { bottom: Math.max(insets.bottom, 18) + 34 }]}>
            <TextInput
              value={chatDraft}
              onChangeText={setChatDraft}
              placeholder="Type a habit command..."
              placeholderTextColor="rgba(148,163,184,0.72)"
              style={styles.chatInput}
              returnKeyType="send"
              onSubmitEditing={() => {
                void submitChatDraft();
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send AI chat command"
              onPress={() => {
                void submitChatDraft();
              }}
              style={[styles.chatSendButton, (!chatDraft.trim() || processing) && styles.chatSendDisabled]}
            >
              <Ionicons name="arrow-up" size={22} color="#ffffff" />
            </Pressable>
          </View>
        ) : null}

        {resultPopup ? (
          <View style={styles.popupBackdrop}>
            <View style={[styles.resultPopup, resultPopup.type === 'failure' && styles.failurePopup]}>
              <View style={[styles.popupIcon, resultPopup.type === 'failure' && styles.failureIcon]}>
                <Ionicons name={resultPopup.type === 'success' ? 'checkmark' : 'alert'} size={22} color="#ffffff" />
              </View>
              <Text style={styles.popupTitle}>{resultPopup.title}</Text>
              <Text style={styles.popupMessage}>{resultPopup.message}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss result"
                onPress={() => setResultPopup(null)}
                style={styles.popupButton}
              >
                <Text style={styles.popupButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );

  async function handleVoiceCommand(input: string) {
    if (!aiEnabled) {
      const message = 'The assistant is disabled in Settings.';
      setAgentText(message);
      setResultPopup({ type: 'failure', title: 'Assistant disabled', message });
      void speakAgentReply(message);
      return;
    }

    setProcessing(true);
    setSpeechError('');
    setResultPopup(null);

    try {
      const preview = await resolveHabitCommand(input, habits, logs);
      const workingText = getAgentWorkingText(preview);
      setAgentText(workingText);
      appendChatMessage('agent', workingText);

      const historyItem = addAiHistoryItem({
        input,
        interpretedText: preview.interpretedText,
        intent: preview.intent,
        preview: preview.preview,
        matchedHabitId: preview.matchedHabitId,
        status: preview.status,
      });

      if (preview.status !== 'previewed') {
        updateAiHistoryStatus(historyItem.id, 'failed');
        setResultPopup({
          type: 'failure',
          title: 'Need more detail',
          message: preview.preview,
        });
        setAgentText(preview.preview);
        void speakAgentReply(preview.preview);
        return;
      }

      const output = await executePreview(preview);
      updateAiHistoryStatus(historyItem.id, 'confirmed');
      setAgentText(output);
      appendChatMessage('agent', output);
      void speakAgentReply(output);
      setResultPopup({
        type: 'success',
        title: 'Done',
        message: output,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The assistant could not complete that action.';
      setSpeechError(message);
      setAgentText('I could not complete that.');
      appendChatMessage('agent', `I could not complete that. ${message}`);
      void speakAgentReply(`I could not complete that. ${message}`);
      setResultPopup({
        type: 'failure',
        title: 'Action failed',
        message,
      });
    } finally {
      setProcessing(false);
    }
  }

  async function submitChatDraft() {
    const nextDraft = chatDraft.trim();
    if (!nextDraft || processing) {
      return;
    }

    setTranscript(nextDraft);
    transcriptRef.current = nextDraft;
    setLiveWordIndex(Math.max(getTranscriptWords(nextDraft).length - 1, 0));
    appendChatMessage('user', nextDraft);
    setChatDraft('');
    await handleVoiceCommand(nextDraft);
  }

  function appendChatMessage(role: ChatMessage['role'], text: string) {
    setChatMessages((messages) => [
      ...messages,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role,
        text,
      },
    ]);
  }

  function clearChat() {
    Speech.stop();
    if (transcriptClearTimeoutRef.current) {
      clearTimeout(transcriptClearTimeoutRef.current);
      transcriptClearTimeoutRef.current = null;
    }
    if (agentClearTimeoutRef.current) {
      clearTimeout(agentClearTimeoutRef.current);
      agentClearTimeoutRef.current = null;
    }
    transcriptOpacity.setValue(1);
    agentOpacity.setValue(1);
    setChatMessages([]);
    setChatDraft('');
    setTranscript('');
    transcriptRef.current = '';
    setAgentText('');
    setSpeechError('');
    setResultPopup(null);
    processedTranscriptRef.current = '';
  }

  async function executePreview(preview: AiCommandPreview) {
    const execution = preview.execution;

    if (execution?.type === 'create') {
      const habit = await saveHabit(execution.draft);
      return `Created ${habit.name}.`;
    }

    if (execution?.type === 'modify') {
      const habit = await saveHabit(execution.draft, execution.habitId);
      return `Updated ${habit.name}.`;
    }

    if (execution?.type === 'complete') {
      completeHabit(execution.habitId, execution.dateKey);
      return `Marked the habit complete for ${friendlyResultDate(execution.dateKey)}.`;
    }

    if (execution?.type === 'skip') {
      skipHabit(execution.habitId, execution.dateKey);
      return `Marked the habit skipped for ${friendlyResultDate(execution.dateKey)}.`;
    }

    if (execution?.type === 'log') {
      updateHabitValue(execution.habitId, execution.dateKey, execution.value, execution.note);
      return `Logged ${execution.value} for ${friendlyResultDate(execution.dateKey)}.`;
    }

    if (execution?.type === 'note') {
      updateHabitNote(execution.habitId, execution.dateKey, execution.note);
      return `Saved the note for ${friendlyResultDate(execution.dateKey)}.`;
    }

    if (execution?.type === 'archive') {
      archiveHabit(execution.habitId);
      return 'Habit archived.';
    }

    if (execution?.type === 'restore') {
      restoreHabit(execution.habitId);
      return 'Habit restored.';
    }

    if (execution?.type === 'delete') {
      await deleteHabit(execution.habitId);
      return 'Habit deleted.';
    }

    if (preview.intent === 'summary' || preview.intent === 'recommendation') {
      const activeHabits = habits.filter((habit) => !habit.archivedAt);
      const prompt = [
        `User command: ${transcriptRef.current}`,
        `Interpreted preview: ${preview.preview}`,
        `Active habits: ${JSON.stringify(activeHabits)}`,
        `Habit logs: ${JSON.stringify(logs.slice(0, 150))}`,
        'Write a short, supportive response for the habit app. Be specific, non-judgmental, and avoid medical, legal, or financial advice.',
      ].join('\n\n');
      return generateGeminiText(prompt, {
        systemInstruction:
          preview.intent === 'summary'
            ? 'You are an in-app habit assistant. Summarize current habit progress in simple, encouraging language using only the provided local data.'
            : 'You are an in-app habit coach. Recommend small, realistic habits, targets, and reminders using only the provided local data and the user request.',
      });
    }

    throw new Error('No safe action was available for that command.');
  }

  async function startListening() {
    if (interactionMode !== 'voice') {
      return;
    }

    setSpeechError('');
    setAgentText('');
    setResultPopup(null);
    Speech.stop();

    try {
      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!available) {
        const message = 'Speech recognition is not available on this device.';
        setSpeechError(message);
        setResultPopup({ type: 'failure', title: 'Speech unavailable', message });
        return;
      }

      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setMicrophonePermission(permission.granted ? 'granted' : 'denied');
      if (!permission.granted) {
        const message = 'Microphone permission was not granted.';
        setSpeechError(message);
        setResultPopup({ type: 'failure', title: 'Permission needed', message });
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
      const message = error instanceof Error ? error.message : 'Could not start listening.';
      setSpeechError(message);
      setResultPopup({ type: 'failure', title: 'Listening failed', message });
    }
  }

  function stopListening() {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      setRecognizing(false);
      setSpeechError(error instanceof Error ? error.message : 'Could not stop listening.');
    }
  }

  async function speakAgentReply(value: string) {
    const text = value.trim();
    if (!text) {
      return;
    }

    try {
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        Speech.stop();
      }

      Speech.speak(text, {
        language: 'en-US',
        pitch: 1,
        rate: 0.96,
      });
    } catch {
      // Keep the UI responsive even if device TTS is unavailable.
    }
  }
}

function getAgentWorkingText(preview: AiCommandPreview) {
  if (preview.status !== 'previewed') {
    return preview.preview;
  }

  switch (preview.intent) {
    case 'create':
      return 'Ok, creating.';
    case 'modify':
      return 'Ok, updating.';
    case 'complete':
      return 'Ok, marking it complete.';
    case 'skip':
      return 'Ok, marking it skipped.';
    case 'log':
      return 'Ok, logging it.';
    case 'note':
      return 'Ok, saving the note.';
    case 'archive':
      return 'Ok, archiving.';
    case 'restore':
      return 'Ok, restoring.';
    case 'delete':
      return 'Ok, deleting.';
    case 'summary':
      return 'Ok, summarizing.';
    case 'recommendation':
      return 'Ok, thinking through a suggestion.';
    default:
      return 'Ok, working on it.';
  }
}

function friendlyResultDate(dateKey: string) {
  const todayKey = new Date().toISOString().slice(0, 10);
  return dateKey === todayKey ? 'today' : dateKey;
}

function VoiceOrb({
  idlePulse,
  speechPulse,
  waveShift,
  active,
  scale,
}: {
  idlePulse: Animated.Value;
  speechPulse: Animated.Value;
  waveShift: Animated.Value;
  active: boolean;
  scale: Animated.AnimatedInterpolation<string | number>;
}) {
  const activeScale = active
    ? speechPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] })
    : idlePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });

  return (
    <Animated.View style={[styles.orbField, { transform: [{ scale }] }]}>
      <Animated.View
        style={[
          styles.dottedRing,
          {
            opacity: idlePulse.interpolate({ inputRange: [0, 1], outputRange: [0.42, 0.78] }),
            transform: [{ scale: activeScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.outerGlow,
          {
            opacity: active ? 0.62 : 0.34,
            transform: [{ scale: activeScale }],
          },
        ]}
      />
      <View style={styles.sideBarsLeft}>
        {[6, 15, 27, 38, 30, 19, 8].map((height, index) => (
          <Animated.View
            key={`left-${height}-${index}`}
            style={[
              styles.sideBar,
              {
                height,
                opacity: active ? 0.9 : 0.42,
                transform: [
                  {
                    scaleY: active
                      ? speechPulse.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1.2 + index * 0.02] })
                      : 1,
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.sideBarsRight}>
        {[8, 19, 30, 38, 27, 15, 6].map((height, index) => (
          <Animated.View
            key={`right-${height}-${index}`}
            style={[
              styles.sideBar,
              {
                height,
                opacity: active ? 0.95 : 0.48,
                transform: [
                  {
                    scaleY: active
                      ? speechPulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.26 - index * 0.03] })
                      : 1,
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.orb}>
        <View style={styles.orbTintA} />
        <View style={styles.orbTintB} />
        <View style={styles.orbTintC} />
        <View style={styles.orbRingA} />
        <View style={styles.orbRingB} />
        <Animated.View
          style={[
            styles.waveBand,
            {
              transform: [
                {
                  translateX: waveShift.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-18, 18],
                  }),
                },
                {
                  scaleY: active
                    ? speechPulse.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.18] })
                    : 1,
                },
              ],
            },
          ]}
        >
          <View style={styles.waveLobeLeft} />
          <View style={styles.waveLobeRight} />
          <View style={styles.waveThread} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function StateBadge({ label, active, highlighted }: { label: string; active: boolean; highlighted?: boolean }) {
  return (
    <View style={[styles.stateBadge, active && styles.stateBadgeActive]}>
      <View style={[styles.stateIcon, highlighted && styles.stateIconBlue, active && styles.stateIconActive]}>
        <View style={[styles.stateMiniWave, highlighted && styles.stateMiniWaveBlue]} />
      </View>
      <Text style={[styles.stateLabel, active && (highlighted ? styles.speakingLabel : styles.idleLabel)]}>{label}</Text>
    </View>
  );
}

function ModeButton({
  icon,
  active,
  accessibilityLabel,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  active: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.modeButton, active && styles.modeButtonActive]}
    >
      <Ionicons name={icon} size={18} color={active ? '#16142a' : 'rgba(226,232,240,0.62)'} />
    </Pressable>
  );
}

function getTranscriptWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000a19',
  },
  screen: {
    position: 'relative',
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    backgroundColor: '#000a19',
  },
  chatScreen: {
    backgroundColor: '#100d1d',
  },
  closeButton: {
    position: 'absolute',
    left: 28,
    zIndex: 10,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    color: 'rgba(226,232,240,0.78)',
    fontSize: 58,
    lineHeight: 58,
    fontWeight: '200',
  },
  modeSwitch: {
    width: 76,
    minHeight: 40,
    borderRadius: 20,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(19,20,38,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },
  topRightActions: {
    position: 'absolute',
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#d9c9ff',
    shadowColor: '#9b7cff',
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  newChatButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 22,
    paddingTop: 94,
    paddingBottom: 160,
    gap: 26,
  },
  orbField: {
    width: 286,
    height: 286,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dottedRing: {
    position: 'absolute',
    width: 278,
    height: 278,
    borderRadius: 139,
    borderWidth: 2,
    borderStyle: 'dotted',
    borderColor: 'rgba(0,194,255,0.5)',
  },
  outerGlow: {
    position: 'absolute',
    width: 238,
    height: 238,
    borderRadius: 119,
    borderWidth: 14,
    borderColor: 'rgba(0,132,255,0.16)',
    shadowColor: '#00b7ff',
    shadowOpacity: 0.8,
    shadowRadius: 32,
  },
  orb: {
    width: 198,
    height: 198,
    borderRadius: 99,
    overflow: 'hidden',
    backgroundColor: '#021b45',
    borderWidth: 2,
    borderColor: '#4adfff',
    shadowColor: '#00b7ff',
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 18,
  },
  orbTintA: {
    position: 'absolute',
    left: -32,
    top: -18,
    width: 160,
    height: 198,
    borderRadius: 90,
    backgroundColor: 'rgba(99,70,255,0.52)',
  },
  orbTintB: {
    position: 'absolute',
    right: -38,
    bottom: -22,
    width: 170,
    height: 198,
    borderRadius: 96,
    backgroundColor: 'rgba(0,226,218,0.62)',
  },
  orbTintC: {
    position: 'absolute',
    left: 18,
    bottom: -52,
    width: 178,
    height: 134,
    borderRadius: 82,
    backgroundColor: 'rgba(0,122,255,0.52)',
  },
  orbRingA: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 3,
    borderColor: 'rgba(91,117,255,0.9)',
  },
  orbRingB: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.64)',
  },
  waveBand: {
    position: 'absolute',
    left: 16,
    top: 68,
    width: 166,
    height: 66,
  },
  waveLobeLeft: {
    position: 'absolute',
    left: 0,
    top: 16,
    width: 98,
    height: 50,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 64,
    backgroundColor: 'rgba(111,67,255,0.64)',
    borderTopWidth: 2,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  waveLobeRight: {
    position: 'absolute',
    right: 0,
    top: 18,
    width: 100,
    height: 50,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    borderBottomLeftRadius: 64,
    borderBottomRightRadius: 28,
    backgroundColor: 'rgba(0,224,235,0.68)',
    borderTopWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  waveThread: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: 34,
    height: 2,
    backgroundColor: 'rgba(26,171,255,0.9)',
    shadowColor: '#10d6ff',
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  sideBarsLeft: {
    position: 'absolute',
    left: 2,
    top: 128,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sideBarsRight: {
    position: 'absolute',
    right: 2,
    top: 128,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sideBar: {
    width: 4,
    borderRadius: 99,
    backgroundColor: '#17dcff',
    shadowColor: '#17dcff',
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginTop: -6,
  },
  stateDivider: {
    width: 1,
    height: 44,
    backgroundColor: 'rgba(148,163,184,0.26)',
  },
  stateBadge: {
    minWidth: 86,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    opacity: 0.48,
  },
  stateBadgeActive: {
    opacity: 1,
  },
  stateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(148,163,184,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateIconBlue: {
    borderStyle: 'solid',
    borderColor: '#13d7ff',
  },
  stateIconActive: {
    shadowColor: '#148eff',
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  stateMiniWave: {
    width: 24,
    height: 2,
    borderRadius: 99,
    backgroundColor: 'rgba(148,163,184,0.75)',
  },
  stateMiniWaveBlue: {
    backgroundColor: '#13d7ff',
  },
  stateLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(148,163,184,0.76)',
  },
  idleLabel: {
    color: 'rgba(203,213,225,0.72)',
  },
  speakingLabel: {
    color: '#17d9ff',
  },
  transcriptWrap: {
    minHeight: 86,
    maxWidth: 340,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    rowGap: 8,
    paddingHorizontal: 0,
  },
  dialogueStack: {
    minHeight: 148,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  voiceCopyBlock: {
    maxWidth: 340,
    alignItems: 'center',
    gap: 10,
  },
  voiceLabel: {
    color: 'rgba(148,163,184,0.82)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  emptyTranscriptState: {
    minHeight: 86,
    maxWidth: 320,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  emptyTranscriptTitle: {
    color: '#ffffff',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyTranscriptBody: {
    color: 'rgba(148,163,184,0.78)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  wordWrap: {
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeWordWrap: {
    paddingHorizontal: 9,
    borderRadius: 16,
    backgroundColor: '#0f8fff',
    shadowColor: '#15d6ff',
    shadowOpacity: 0.9,
    shadowRadius: 14,
  },
  word: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  pastWord: {
    color: '#f8fbff',
  },
  activeWord: {
    color: '#ffffff',
  },
  futureWord: {
    color: 'rgba(148,163,184,0.54)',
  },
  wordWave: {
    position: 'absolute',
    bottom: -9,
    width: 70,
    height: 4,
    borderRadius: 99,
    backgroundColor: '#0f8fff',
    shadowColor: '#18d5ff',
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  errorText: {
    marginTop: -20,
    color: '#f87171',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  chatThread: {
    flex: 1,
    paddingHorizontal: 26,
    paddingBottom: 120,
    gap: 18,
  },
  chatUserRow: {
    alignItems: 'flex-end',
  },
  chatAgentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  agentDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(226,232,240,0.95)',
    marginTop: 9,
  },
  chatBubble: {
    maxWidth: '84%',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  chatUserBubble: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chatAgentBubble: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 2,
  },
  chatBubbleText: {
    color: '#f8fbff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  chatEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 10,
  },
  chatEmptyTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  chatEmptyBody: {
    color: 'rgba(226,232,240,0.66)',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontWeight: '600',
  },
  agentResponse: {
    maxWidth: '92%',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(23,217,255,0.28)',
    backgroundColor: 'rgba(5,21,47,0.74)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#0f8fff',
    shadowOpacity: 0.34,
    shadowRadius: 16,
  },
  agentLabel: {
    color: 'rgba(148,163,184,0.82)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  agentText: {
    color: '#ffffff',
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
    textAlign: 'center',
  },
  micButton: {
    position: 'absolute',
    alignSelf: 'center',
    width: 122,
    height: 122,
    borderRadius: 61,
    borderWidth: 2,
    borderColor: '#0f8fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2,12,29,0.82)',
    shadowColor: '#0f8fff',
    shadowOpacity: 0.8,
    shadowRadius: 28,
    elevation: 18,
  },
  micGlow: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(15,143,255,0.08)',
  },
  stopGlyph: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1687ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatComposer: {
    position: 'absolute',
    left: 22,
    right: 22,
    minHeight: 68,
    borderRadius: 34,
    paddingLeft: 22,
    paddingRight: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.26)',
    backgroundColor: 'rgba(9,8,17,0.84)',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.28,
    shadowRadius: 20,
  },
  chatInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    paddingVertical: 10,
  },
  chatSendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f8fff',
  },
  chatSendDisabled: {
    opacity: 0.45,
  },
  popupBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgba(0,5,15,0.42)',
  },
  resultPopup: {
    width: '100%',
    maxWidth: 330,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.36)',
    backgroundColor: 'rgba(3,18,42,0.96)',
    paddingHorizontal: 22,
    paddingVertical: 22,
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOpacity: 0.42,
    shadowRadius: 28,
  },
  failurePopup: {
    borderColor: 'rgba(248,113,113,0.42)',
    shadowColor: '#ef4444',
  },
  popupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    marginBottom: 12,
  },
  failureIcon: {
    backgroundColor: '#ef4444',
  },
  popupTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  popupMessage: {
    color: 'rgba(226,232,240,0.82)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
  },
  popupButton: {
    minWidth: 112,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f8fff',
    marginTop: 18,
    paddingHorizontal: 18,
  },
  popupButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
});
