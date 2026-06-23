import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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

import {
  AiCommandPreview,
  resolveAssistantConversationTurn,
} from '@/src/lib/ai-assistant';
import { cleanupTranscriptWithWhisper, getWhisperModelName, hasWhisperCleanupConfigured } from '@/src/lib/whisper';
import { useAppStore } from '@/src/store/app-store';
import { AssistantSessionMessage } from '@/src/types/habits';
import { useThemeTokens } from '@/src/theme/colors';

type InteractionMode = 'voice' | 'chat';

type Toast = {
  type: 'success' | 'failure';
  title: string;
  message: string;
};

type PendingAssistantAction = {
  sessionId: string;
  preview: AiCommandPreview;
  combinedInput: string;
  assistantText: string;
  selectedHabitId?: string;
};

// One constant drives the whole orb so it scales as a single unit.
const ORB_SIZE = 188;

export default function AssistantScreen() {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
  const habits = useAppStore((state) => state.habits);
  const logs = useAppStore((state) => state.logs);
  const aiEnabled = useAppStore((state) => state.preferences.aiEnabled);
  const addAiHistoryItem = useAppStore((state) => state.addAiHistoryItem);
  const updateAiHistoryStatus = useAppStore((state) => state.updateAiHistoryStatus);
  const setMicrophonePermission = useAppStore((state) => state.setMicrophonePermission);
  const saveHabit = useAppStore((state) => state.saveHabit);
  const archiveHabit = useAppStore((state) => state.archiveHabit);
  const restoreHabit = useAppStore((state) => state.restoreHabit);
  const completeHabit = useAppStore((state) => state.completeHabit);
  const skipHabit = useAppStore((state) => state.skipHabit);
  const updateHabitValue = useAppStore((state) => state.updateHabitValue);
  const updateHabitNote = useAppStore((state) => state.updateHabitNote);
  const deleteHabit = useAppStore((state) => state.deleteHabit);

  const [interactionMode, setInteractionMode] = useState<InteractionMode>('voice');
  const [messages, setMessages] = useState<AssistantSessionMessage[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [transcript, setTranscript] = useState('');
  const [recognizing, setRecognizing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cleaningTranscript, setCleaningTranscript] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAssistantAction | null>(null);
  const [sessionId, setSessionId] = useState(createSessionId());
  const [selectedHabitId, setSelectedHabitId] = useState<string | undefined>(undefined);
  const [liveWordIndex, setLiveWordIndex] = useState(0);

  const transcriptRef = useRef('');
  const processedTranscriptRef = useRef('');
  const audioRecordingUriRef = useRef<string | null>(null);
  const voiceTurnInFlightRef = useRef(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const idlePulse = useRef(new Animated.Value(0)).current;
  const activePulse = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const toastOffset = useRef(new Animated.Value(0)).current;

  // Derived palette from tokens — one source of truth for the screen.
  const palette = useMemo(() => buildAssistantPalette(tokens), [tokens]);

  // Breathing pulse — always running, subtle.
  useEffect(() => {
    const idleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(idlePulse, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(idlePulse, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    idleLoop.start();
    return () => idleLoop.stop();
  }, [idlePulse]);

  // Active pulse — runs only while listening/processing, faster + punchier.
  const isActive = recognizing || processing || cleaningTranscript;
  useEffect(() => {
    if (isActive) {
      const activeLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(activePulse, {
            toValue: 1,
            duration: 760,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(activePulse, {
            toValue: 0,
            duration: 760,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      activeLoop.start();
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }).start();
      return () => {
        activeLoop.stop();
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 420,
          useNativeDriver: true,
        }).start();
      };
    }
    return;
  }, [isActive, activePulse, glowOpacity]);

  // Toast lifecycle — slide in, auto-dismiss, slide out.
  useEffect(() => {
    if (!toast) {
      return;
    }
    Animated.spring(toastOffset, { toValue: 1, friction: 9, tension: 80, useNativeDriver: true }).start();
    const timer = setTimeout(() => dismissToast(), 2800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  useEffect(() => {
    if (recognizing) {
      setLiveWordIndex(Math.max(getTranscriptWords(transcript).length - 1, 0));
    }
  }, [recognizing, transcript]);

  useEffect(() => {
    if (interactionMode === 'chat') {
      requestAnimationFrame(() => scrollViewRef.current?.scrollToEnd({ animated: true }));
    }
  }, [interactionMode, messages, pendingAction]);

  useSpeechRecognitionEvent('start', () => {
    setRecognizing(true);
    setProcessing(false);
    setCleaningTranscript(false);
    setSpeechError('');
    setToast(null);
    setTranscript('');
    transcriptRef.current = '';
    processedTranscriptRef.current = '';
    audioRecordingUriRef.current = null;
    setLiveWordIndex(0);
  });

  useSpeechRecognitionEvent('audiostart', (event) => {
    audioRecordingUriRef.current = event.uri ?? null;
  });

  useSpeechRecognitionEvent('audioend', (event) => {
    audioRecordingUriRef.current = event.uri ?? audioRecordingUriRef.current;
  });

  useSpeechRecognitionEvent('end', () => {
    setRecognizing(false);
    const finalTranscript = transcriptRef.current.trim();
    if (finalTranscript && finalTranscript !== processedTranscriptRef.current && !voiceTurnInFlightRef.current) {
      void finalizeVoiceTurn(finalTranscript);
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
      setTranscript(nextTranscript);
      transcriptRef.current = nextTranscript;
      setLiveWordIndex(Math.max(getTranscriptWords(nextTranscript).length - 1, 0));
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setRecognizing(false);
    setCleaningTranscript(false);
    voiceTurnInFlightRef.current = false;
    const message = event.message || 'Could not hear that clearly.';
    setSpeechError(message);
    setToast({ type: 'failure', title: 'Speech failed', message });
    if (event.error === 'not-allowed') {
      setMicrophonePermission('denied');
    }
  });

  const voiceMessages = useMemo(() => messages.slice(-4), [messages]);
  const transcriptWords = useMemo(() => getTranscriptWords(transcript), [transcript]);
  const activeWordIndex = Math.min(liveWordIndex, Math.max(transcriptWords.length - 1, 0));
  const isThinking = processing || cleaningTranscript;

  const orbScale = isActive
    ? activePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] })
    : idlePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });

  const glowScale = glowOpacity.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });

  // Two user-facing states only. "Cleaning" folds silently into "Thinking".
  const activeState: 'listening' | 'thinking' | 'confirming' | 'idle' = recognizing
    ? 'listening'
    : isThinking
      ? 'thinking'
      : pendingAction
        ? 'confirming'
        : 'idle';

  function dismissToast() {
    Animated.timing(toastOffset, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
      setToast(null);
    });
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: tokens.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, backgroundColor: tokens.background }}>
          {/* Top-left close — real button, real hit target, real icon. */}
          <Pressable
            accessibilityLabel="Close assistant"
            accessibilityRole="button"
            onPress={() => {
              if (recognizing) {
                stopListening();
              }
              router.replace('/today');
            }}
            style={[styles.closeButton, { top: Math.max(insets.top, 20) + 6, backgroundColor: palette.chip }]}
          >
            <Ionicons name="chevron-down" size={22} color={tokens.textMuted} />
          </Pressable>

          <View style={[styles.topRightActions, { top: Math.max(insets.top, 20) + 8, right: 20 }]}>
            <View style={[styles.modeSwitch, { backgroundColor: palette.chip, borderColor: tokens.border }]}>
              <ModeButton
                icon="mic"
                active={interactionMode === 'voice'}
                accessibilityLabel="Voice mode"
                tokens={tokens}
                palette={palette}
                onPress={() => setInteractionMode('voice')}
              />
              <ModeButton
                icon="chatbubble-ellipses-outline"
                active={interactionMode === 'chat'}
                accessibilityLabel="Chat mode"
                tokens={tokens}
                palette={palette}
                onPress={() => {
                  if (recognizing) {
                    stopListening();
                  }
                  setInteractionMode('chat');
                }}
              />
            </View>
            <Pressable
              accessibilityLabel="Start new assistant session"
              accessibilityRole="button"
              onPress={resetConversation}
              style={[styles.newChatButton, { backgroundColor: palette.chip, borderColor: tokens.border }]}
            >
              <Ionicons name="add" size={22} color={tokens.textMuted} />
            </Pressable>
          </View>

          {interactionMode === 'voice' ? (
            <ScrollView
              contentContainerStyle={[
                styles.voiceContent,
                { paddingTop: Math.max(insets.top, 20) + 84, paddingBottom: Math.max(insets.bottom, 18) + 160 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <GradientOrb
                size={ORB_SIZE}
                scale={orbScale}
                glowOpacity={glowOpacity}
                glowScale={glowScale}
                state={activeState}
                palette={palette}
                tokens={tokens}
              />

              <View style={styles.stateRow}>
                <StateBadge label="Listening" active={recognizing} tone="listening" tokens={tokens} palette={palette} />
                <StateBadge
                  label="Thinking"
                  active={isThinking && !recognizing}
                  tone="thinking"
                  tokens={tokens}
                  palette={palette}
                />
              </View>

              {/* Single live caption strip — not a framed card, not a duplicate. */}
              <View style={styles.captionStrip}>
                {transcriptWords.length ? (
                  <View style={styles.transcriptWrap} accessibilityLiveRegion="polite">
                    {transcriptWords.map((word, index) => {
                      const isActiveWord = index === activeWordIndex;
                      return (
                        <Text
                          key={`${word}-${index}`}
                          style={[
                            styles.word,
                            { color: isActiveWord ? tokens.primary : tokens.text },
                            isActiveWord && { fontWeight: '700' },
                          ]}
                        >
                          {word}
                        </Text>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyVoiceState}>
                    <Text style={[styles.emptyVoiceTitle, { color: tokens.text }]}>
                      {recognizing ? 'Listening…' : 'Tap the mic to talk'}
                    </Text>
                    <Text style={[styles.emptyVoiceBody, { color: tokens.textMuted }]}>
                      {recognizing
                        ? 'Your words appear here as you speak.'
                        : 'Speak naturally — I can coach you and prepare habit changes for you to confirm.'}
                    </Text>
                  </View>
                )}
              </View>

              {speechError ? (
                <Text style={[styles.errorText, { color: tokens.danger }]}>{speechError}</Text>
              ) : null}

              {pendingAction ? (
                <ConfirmationCard
                  preview={pendingAction.preview}
                  onConfirm={() => void confirmPendingAction()}
                  onCancel={cancelPendingAction}
                  onSelectHabit={(habitId) => void resolveDisambiguation(habitId)}
                  busy={processing}
                  tokens={tokens}
                  palette={palette}
                />
              ) : null}

              {voiceMessages.length ? (
                <View style={styles.voiceHistoryBlock}>
                  <Text style={[styles.sectionEyebrow, { color: tokens.textMuted }]}>Recent</Text>
                  {voiceMessages.map((message) => (
                    <CompactMessage key={message.id} message={message} tokens={tokens} palette={palette} />
                  ))}
                </View>
              ) : null}
            </ScrollView>
          ) : (
            <View style={styles.chatLayout}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.chatThread}
                contentContainerStyle={{
                  paddingTop: Math.max(insets.top, 20) + 86,
                  paddingBottom: Math.max(insets.bottom, 18) + 140,
                  paddingHorizontal: 18,
                  gap: 14,
                }}
                showsVerticalScrollIndicator={false}
              >
                {messages.length ? (
                  messages.map((message) => (
                    <ThreadMessage key={message.id} message={message} tokens={tokens} palette={palette} />
                  ))
                ) : (
                  <View style={styles.chatEmptyState}>
                    <Text style={[styles.chatEmptyTitle, { color: tokens.text }]}>Chat with your habit assistant</Text>
                    <Text style={[styles.chatEmptyBody, { color: tokens.textMuted }]}>
                      Ask for coaching, talk through a goal, or tell me to create, update, or complete a habit. I'll
                      confirm before changing anything.
                    </Text>
                  </View>
                )}

                {pendingAction ? (
                  <ConfirmationCard
                    preview={pendingAction.preview}
                    onConfirm={() => void confirmPendingAction()}
                    onCancel={cancelPendingAction}
                    onSelectHabit={(habitId) => void resolveDisambiguation(habitId)}
                    busy={processing}
                    tokens={tokens}
                    palette={palette}
                  />
                ) : null}

                {processing ? <TypingDots tokens={tokens} palette={palette} /> : null}
              </ScrollView>

              <View style={[styles.chatComposer, { paddingBottom: Math.max(insets.bottom, 18) + 10, backgroundColor: palette.composer }]}>
                <TextInput
                  value={chatDraft}
                  onChangeText={setChatDraft}
                  placeholder="Ask anything about your habits…"
                  placeholderTextColor={tokens.textMuted}
                  style={[styles.chatInput, { backgroundColor: tokens.surfaceMuted, color: tokens.text, borderColor: tokens.border }]}
                  multiline
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send message"
                  onPress={() => void submitChatDraft()}
                  disabled={!chatDraft.trim() || processing}
                  style={[
                    styles.chatSendButton,
                    { backgroundColor: tokens.primary },
                    (!chatDraft.trim() || processing) && styles.chatSendDisabled,
                  ]}
                >
                  <Ionicons name="arrow-up" size={20} color={palette.onPrimary} />
                </Pressable>
              </View>
            </View>
          )}

          {interactionMode === 'voice' ? (
            <Pressable
              accessibilityLabel={recognizing ? 'Stop listening' : 'Start listening'}
              accessibilityRole="button"
              onPress={recognizing ? stopListening : () => void startListening()}
              style={[styles.micButton, { bottom: Math.max(insets.bottom, 18) + 28, backgroundColor: tokens.primary }]}
            >
              {recognizing || processing ? (
                <Ionicons name="stop" size={24} color={palette.onPrimary} />
              ) : (
                <Ionicons name="mic" size={28} color={palette.onPrimary} />
              )}
            </Pressable>
          ) : null}

          {toast ? (
            <ToastView
              toast={toast}
              offset={toastOffset}
              tokens={tokens}
              palette={palette}
              topInset={Math.max(insets.top, 20)}
              onDismiss={dismissToast}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  async function handleUserTurn(input: string, source: 'voice' | 'chat') {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    if (!aiEnabled) {
      const message = 'The assistant is disabled in Settings.';
      addMessage('assistant', message);
      setToast({ type: 'failure', title: 'Assistant disabled', message });
      if (source === 'voice') {
        void speakAgentReply(message);
      }
      return;
    }

    setProcessing(true);
    setSpeechError('');
    setToast(null);
    addMessage('user', trimmed);
    if (source === 'chat') {
      setTranscript(trimmed);
      transcriptRef.current = trimmed;
    }

    try {
      const history = messages
        .slice(-8)
        .filter((message) => message.role !== 'system-preview')
        .map((message) => ({
          role: (message.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          text: message.text,
        }));

      const turn = await resolveAssistantConversationTurn(trimmed, habits, logs, {
        pendingInterpretedText: pendingAction?.combinedInput,
        selectedHabitId,
        conversationHistory: history,
      });

      const historyItem = addAiHistoryItem({
        sessionId,
        input: trimmed,
        interpretedText: turn.combinedInput,
        intent: turn.preview.intent,
        preview: turn.preview.preview,
        matchedHabitId: turn.preview.matchedHabitId,
        status:
          turn.stage === 'pending-confirmation'
            ? 'pending-confirmation'
            : turn.stage === 'needs-clarification'
              ? 'needs-clarification'
              : 'conversation',
      });

      addMessage(turn.preview.execution ? 'system-preview' : 'assistant', turn.assistantText);

      if (turn.preview.execution) {
        setPendingAction({
          sessionId: historyItem.id,
          preview: turn.preview,
          combinedInput: turn.combinedInput,
          assistantText: turn.assistantText,
          selectedHabitId,
        });
      } else {
        setPendingAction(null);
        setSelectedHabitId(turn.preview.matchedHabitId);
      }

      if (source === 'voice') {
        void speakAgentReply(turn.assistantText);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The assistant could not process that request.';
      setSpeechError(message);
      addMessage('assistant', `I hit a problem: ${message}`);
      setToast({ type: 'failure', title: 'Action failed', message });
      if (source === 'voice') {
        void speakAgentReply(`I hit a problem. ${message}`);
      }
    } finally {
      setProcessing(false);
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction?.preview.execution) {
      return;
    }

    setProcessing(true);
    try {
      const resultMessage = await executePreview(pendingAction.preview);
      updateAiHistoryStatus(pendingAction.sessionId, 'confirmed');
      addMessage('assistant', resultMessage);
      setToast({ type: 'success', title: 'Done', message: resultMessage });
      setPendingAction(null);
      setSelectedHabitId(undefined);
      void speakAgentReply(resultMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not finish that action.';
      updateAiHistoryStatus(pendingAction.sessionId, 'failed');
      addMessage('assistant', `I could not finish that: ${message}`);
      setToast({ type: 'failure', title: 'Action failed', message });
      setSpeechError(message);
    } finally {
      setProcessing(false);
    }
  }

  function cancelPendingAction() {
    if (pendingAction) {
      updateAiHistoryStatus(pendingAction.sessionId, 'cancelled');
      addMessage('assistant', 'Nothing changed. You can rephrase the request or tell me what to adjust.');
    }
    setPendingAction(null);
    setSelectedHabitId(undefined);
  }

  async function resolveDisambiguation(habitId: string) {
    if (!pendingAction) {
      return;
    }
    setSelectedHabitId(habitId);
    setPendingAction(null);
    await handleUserTurn('Use that habit.', interactionMode === 'voice' ? 'voice' : 'chat');
  }

  async function submitChatDraft() {
    const nextDraft = chatDraft.trim();
    if (!nextDraft || processing) {
      return;
    }
    setChatDraft('');
    await handleUserTurn(nextDraft, 'chat');
  }

  function resetConversation() {
    Speech.stop();
    if (recognizing) {
      stopListening();
    }
    setMessages([]);
    setTranscript('');
    setCleaningTranscript(false);
    setSpeechError('');
    setToast(null);
    setPendingAction(null);
    setSelectedHabitId(undefined);
    setChatDraft('');
    transcriptRef.current = '';
    processedTranscriptRef.current = '';
    audioRecordingUriRef.current = null;
    voiceTurnInFlightRef.current = false;
    setSessionId(createSessionId());
  }

  async function executePreview(preview: AiCommandPreview) {
    const execution = preview.execution;
    if (!execution) {
      throw new Error('No action was ready to run.');
    }

    if (execution.type === 'create') {
      const habit = await saveHabit(execution.draft);
      return `Created ${habit.name}.`;
    }

    if (execution.type === 'modify') {
      const habit = await saveHabit(execution.draft, execution.habitId);
      return `Updated ${habit.name}.`;
    }

    if (execution.type === 'complete') {
      completeHabit(execution.habitId, execution.dateKey);
      return `Marked it complete for ${friendlyResultDate(execution.dateKey)}.`;
    }

    if (execution.type === 'skip') {
      skipHabit(execution.habitId, execution.dateKey);
      return `Marked it skipped for ${friendlyResultDate(execution.dateKey)}.`;
    }

    if (execution.type === 'log') {
      updateHabitValue(execution.habitId, execution.dateKey, execution.value, execution.note);
      return `Logged ${execution.value} for ${friendlyResultDate(execution.dateKey)}.`;
    }

    if (execution.type === 'note') {
      updateHabitNote(execution.habitId, execution.dateKey, execution.note);
      return `Saved that note for ${friendlyResultDate(execution.dateKey)}.`;
    }

    if (execution.type === 'archive') {
      archiveHabit(execution.habitId);
      return 'Archived the habit.';
    }

    if (execution.type === 'restore') {
      restoreHabit(execution.habitId);
      return 'Restored the habit.';
    }

    if (execution.type === 'delete') {
      await deleteHabit(execution.habitId);
      return 'Deleted the habit and its history.';
    }

    throw new Error('That action is not part of this assistant flow yet.');
  }

  async function startListening() {
    setSpeechError('');
    setToast(null);
    setCleaningTranscript(false);
    try {
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        const message = 'Speech recognition is not available on this device.';
        setSpeechError(message);
        setToast({ type: 'failure', title: 'Speech unavailable', message });
        return;
      }

      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setMicrophonePermission(permission.granted ? 'granted' : 'denied');
      if (!permission.granted) {
        const message = 'Microphone permission was not granted.';
        setSpeechError(message);
        setToast({ type: 'failure', title: 'Permission needed', message });
        return;
      }

      Speech.stop();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        contextualStrings: habits.map((habit) => habit.name),
        addsPunctuation: true,
        recordingOptions: ExpoSpeechRecognitionModule.supportsRecording()
          ? {
              persist: true,
            }
          : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start listening.';
      setSpeechError(message);
      setToast({ type: 'failure', title: 'Listening failed', message });
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

  async function speakAgentReply(text: string) {
    if (!text.trim()) {
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
      // Keep visual feedback even if TTS is unavailable.
    }
  }

  function addMessage(role: AssistantSessionMessage['role'], text: string) {
    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role,
        text,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  async function finalizeVoiceTurn(liveTranscript: string) {
    voiceTurnInFlightRef.current = true;
    setCleaningTranscript(false);

    let cleanedTranscript = liveTranscript;
    const audioUri = audioRecordingUriRef.current;

    if (audioUri && hasWhisperCleanupConfigured()) {
      try {
        setCleaningTranscript(true);
        const whisperResult = await cleanupTranscriptWithWhisper(audioUri, {
          language: 'en',
          prompt: habits.map((habit) => habit.name).slice(0, 24).join(', '),
        });
        cleanedTranscript = whisperResult.text.trim() || liveTranscript;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Whisper cleanup failed.';
        setSpeechError(message);
      } finally {
        setCleaningTranscript(false);
      }
    }

    if (cleanedTranscript && cleanedTranscript !== processedTranscriptRef.current) {
      processedTranscriptRef.current = cleanedTranscript;
      setTranscript(cleanedTranscript);
      await handleUserTurn(cleanedTranscript, 'voice');
    }

    voiceTurnInFlightRef.current = false;
    audioRecordingUriRef.current = null;
  }
}

/* ------------------------------------------------------------------ */
/* Components                                                          */
/* ------------------------------------------------------------------ */

function ConfirmationCard({
  preview,
  onConfirm,
  onCancel,
  onSelectHabit,
  busy,
  tokens,
  palette,
}: {
  preview: AiCommandPreview;
  onConfirm: () => void;
  onCancel: () => void;
  onSelectHabit: (habitId: string) => void;
  busy: boolean;
  tokens: ReturnType<typeof useThemeTokens>;
  palette: AssistantPalette;
}) {
  const destructive = preview.intent === 'delete';
  const accent = destructive ? tokens.danger : tokens.primary;

  return (
    <View
      style={[
        styles.confirmCard,
        {
          backgroundColor: tokens.surface,
          borderColor: destructive ? tokens.danger : tokens.border,
          shadowColor: palette.shadow,
        },
      ]}
    >
      <View style={styles.confirmHeader}>
        <Text style={[styles.confirmEyebrow, { color: accent }]}>
          {preview.status === 'needs-clarification' ? 'Need one more detail' : 'Review before changing anything'}
        </Text>
        <Text style={[styles.confirmTitle, { color: tokens.text }]}>
          {preview.intent === 'delete' ? 'Delete habit' : humanizeIntent(preview.intent)}
        </Text>
      </View>

      <Text style={[styles.confirmBody, { color: tokens.text }]}>{preview.preview}</Text>

      {preview.disambiguationOptions?.length ? (
        <View style={styles.optionWrap}>
          {preview.disambiguationOptions.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => onSelectHabit(option.id)}
              style={[styles.optionChip, { backgroundColor: tokens.primarySoft, borderColor: accent }]}
            >
              <Text style={[styles.optionChipText, { color: tokens.text }]}>{option.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {preview.execution ? (
        <View style={styles.confirmActions}>
          <Pressable
            onPress={onCancel}
            style={[styles.cancelButton, { backgroundColor: tokens.surfaceMuted, borderColor: tokens.border }]}
          >
            <Text style={[styles.cancelButtonText, { color: tokens.text }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            disabled={busy}
            style={[styles.confirmButton, { backgroundColor: accent }]}
          >
            <Text style={[styles.confirmButtonText, { color: palette.onPrimary }]}>
              {busy ? 'Working…' : destructive ? 'Delete' : 'Confirm'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ThreadMessage({
  message,
  tokens,
  palette,
}: {
  message: AssistantSessionMessage;
  tokens: ReturnType<typeof useThemeTokens>;
  palette: AssistantPalette;
}) {
  const isUser = message.role === 'user';
  const isPreview = message.role === 'system-preview';

  return (
    <View style={[styles.threadRow, isUser ? styles.threadRowUser : styles.threadRowAssistant]}>
      {!isUser ? (
        <View style={[styles.messageDot, { backgroundColor: isPreview ? tokens.warning : tokens.primary }]} />
      ) : null}
      <View
        style={[
          styles.threadBubble,
          isUser
            ? { backgroundColor: tokens.primary }
            : isPreview
              ? { backgroundColor: tokens.surface, borderColor: tokens.warning }
              : { backgroundColor: tokens.surface, borderColor: tokens.border },
        ]}
      >
        {!isUser ? (
          <Text style={[styles.threadLabel, { color: isPreview ? tokens.warning : tokens.primary }]}>
            {isPreview ? 'Action preview' : 'Assistant'}
          </Text>
        ) : null}
        <Text style={[styles.threadText, { color: isUser ? palette.onPrimary : tokens.text }]}>{message.text}</Text>
      </View>
    </View>
  );
}

function CompactMessage({
  message,
  tokens,
  palette,
}: {
  message: AssistantSessionMessage;
  tokens: ReturnType<typeof useThemeTokens>;
  palette: AssistantPalette;
}) {
  const isUser = message.role === 'user';
  return (
    <View
      style={[
        styles.compactMessage,
        { backgroundColor: isUser ? tokens.primarySoft : tokens.surface, borderColor: tokens.border },
      ]}
    >
      <Text style={[styles.compactRole, { color: isUser ? tokens.primary : palette.label }]}>
        {message.role === 'user' ? 'You' : message.role === 'system-preview' ? 'Preview' : 'Assistant'}
      </Text>
      <Text style={[styles.compactText, { color: tokens.text }]}>{message.text}</Text>
    </View>
  );
}

function ModeButton({
  icon,
  active,
  accessibilityLabel,
  onPress,
  tokens,
  palette,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  active: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  tokens: ReturnType<typeof useThemeTokens>;
  palette: AssistantPalette;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.modeButton, active && { backgroundColor: tokens.primary }]}
    >
      <Ionicons name={icon} size={18} color={active ? palette.onPrimary : tokens.textMuted} />
    </Pressable>
  );
}

function StateBadge({
  label,
  active,
  tone,
  tokens,
  palette,
}: {
  label: string;
  active: boolean;
  tone: 'listening' | 'thinking';
  tokens: ReturnType<typeof useThemeTokens>;
  palette: AssistantPalette;
}) {
  const color = tone === 'listening' ? tokens.primary : palette.label;
  return (
    <View
      accessibilityState={active ? { selected: true } : undefined}
      style={[
        styles.stateBadge,
        {
          backgroundColor: active ? tokens.primarySoft : tokens.surfaceMuted,
          borderColor: active ? color : tokens.border,
        },
      ]}
    >
      <View style={[styles.stateIcon, { backgroundColor: active ? color : tokens.textMuted }]} />
      <Text style={[styles.stateLabel, { color: active ? color : tokens.textMuted, fontWeight: active ? '600' : '500' }]}>
        {label}
      </Text>
    </View>
  );
}

/**
 * One cohesive orb: a smooth LinearGradient core that breathes (idle) or
 * pulses (active), wrapped in a soft animated glow ring. No more stacked
 * rectangles or asymmetric border-radii.
 */
function GradientOrb({
  size,
  scale,
  glowOpacity,
  glowScale,
  state,
  palette,
  tokens,
}: {
  size: number;
  scale: Animated.AnimatedInterpolation<string | number>;
  glowOpacity: Animated.Value;
  glowScale: Animated.AnimatedInterpolation<string | number>;
  state: 'listening' | 'thinking' | 'confirming' | 'idle';
  palette: AssistantPalette;
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  const stateLabel =
    state === 'listening'
      ? 'Listening'
      : state === 'thinking'
        ? 'Thinking'
        : state === 'confirming'
          ? 'Awaiting confirmation'
          : 'Idle';

  return (
    <View style={styles.orbField} accessibilityLabel={`Assistant orb — ${stateLabel}`} accessibilityRole="image">
      {/* Soft glow ring — fades/scales in only while active. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orbGlow,
          {
            width: size + 56,
            height: size + 56,
            borderRadius: (size + 56) / 2,
            backgroundColor: tokens.primary,
            opacity: Animated.multiply(glowOpacity, 0.28),
            transform: [{ scale: glowScale }],
          },
        ]}
      />
      {/* Gradient core. */}
      <Animated.View style={{ width: size, height: size, transform: [{ scale }] }}>
        <LinearGradient
          colors={palette.orbGradient}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: palette.orbBorder,
          }}
        >
          <Ionicons
            name={state === 'listening' ? 'mic' : state === 'thinking' ? 'sparkles' : 'mic-outline'}
            size={size * 0.26}
            color={palette.onPrimary}
          />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

/** Three bouncing dots — the post-ChatGPT typing affordance. */
function TypingDots({
  tokens,
  palette,
}: {
  tokens: ReturnType<typeof useThemeTokens>;
  palette: AssistantPalette;
}) {
  return (
    <View style={[styles.typingRow, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      {[0, 1, 2].map((index) => (
        <BouncingDot key={index} delay={index * 160} color={tokens.primary} />
      ))}
      <Text style={[styles.typingText, { color: tokens.textMuted }]}>Thinking…</Text>
    </View>
  );
}

function BouncingDot({ delay, color }: { delay: number; color: string }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, { toValue: 1, duration: 360, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: 360, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value, delay]);

  const translateY = value.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
  const opacity = value.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <Animated.View
      style={[styles.bouncingDot, { backgroundColor: color, transform: [{ translateY }], opacity }]}
    />
  );
}

function ToastView({
  toast,
  offset,
  tokens,
  palette,
  topInset,
  onDismiss,
}: {
  toast: Toast;
  offset: Animated.Value;
  tokens: ReturnType<typeof useThemeTokens>;
  palette: AssistantPalette;
  topInset: number;
  onDismiss: () => void;
}) {
  const isFailure = toast.type === 'failure';
  const accent = isFailure ? tokens.danger : tokens.success;
  const translateY = offset.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] });

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      pointerEvents="box-none"
      style={[styles.toastWrap, { top: topInset + 12, transform: [{ translateY }] }]}
    >
      <Pressable onPress={onDismiss} style={[styles.toastCard, { backgroundColor: tokens.surface, borderColor: accent, shadowColor: palette.shadow }]}>
        <View style={[styles.toastIcon, { backgroundColor: accent }]}>
          <Ionicons name={isFailure ? 'alert' : 'checkmark'} size={16} color={palette.onPrimary} />
        </View>
        <View style={styles.toastBody}>
          <Text style={[styles.toastTitle, { color: tokens.text }]}>{toast.title}</Text>
          <Text style={[styles.toastMessage, { color: tokens.textMuted }]} numberOfLines={3}>
            {toast.message}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type AssistantPalette = {
  onPrimary: string;
  label: string;
  chip: string;
  composer: string;
  shadow: string;
  orbBorder: string;
  orbGradient: [string, string, string];
};

function buildAssistantPalette(tokens: ReturnType<typeof useThemeTokens>): AssistantPalette {
  // onPrimary text color: dark on the bright accent in light mode, near-black elsewhere.
  const onPrimary = tokens.mode === 'light' ? '#ffffff' : '#04111f';
  return {
    onPrimary,
    label: tokens.mode === 'light' ? '#0f766e' : tokens.teal,
    chip: tokens.mode === 'light' ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.04)',
    composer: tokens.mode === 'light' ? 'rgba(244,247,251,0.94)' : 'rgba(7,17,31,0.96)',
    shadow: tokens.mode === 'light' ? '#0f1f3a' : '#000000',
    orbBorder: tokens.mode === 'light' ? 'rgba(37,99,235,0.45)' : 'rgba(96,165,250,0.55)',
    orbGradient:
      tokens.mode === 'light'
        ? ['#2563eb', '#3b82f6', '#60a5fa']
        : tokens.mode === 'amoled'
          ? ['#0f172a', '#1e293b', '#334155']
          : ['#1e3a8a', '#1d4ed8', '#2563eb'],
  };
}

function getTranscriptWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean);
}

function createSessionId() {
  return `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function friendlyResultDate(dateKey: string) {
  const todayKey = new Date().toISOString().slice(0, 10);
  return dateKey === todayKey ? 'today' : dateKey;
}

function humanizeIntent(intent: AiCommandPreview['intent']) {
  switch (intent) {
    case 'create':
      return 'Create habit';
    case 'modify':
      return 'Update habit';
    case 'complete':
      return 'Complete habit';
    case 'delete':
      return 'Delete habit';
    default:
      return 'Assistant action';
  }
}

const styles = StyleSheet.create({
  closeButton: {
    position: 'absolute',
    left: 16,
    zIndex: 5,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightActions: {
    position: 'absolute',
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 22,
    borderWidth: 1,
    gap: 2,
  },
  modeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 20,
  },
  orbField: {
    width: ORB_SIZE + 80,
    height: ORB_SIZE + 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGlow: {
    position: 'absolute',
  },
  stateRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  stateIcon: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stateLabel: {
    fontSize: 13,
  },
  captionStrip: {
    width: '100%',
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  transcriptWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    rowGap: 4,
  },
  word: {
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '500',
  },
  emptyVoiceState: {
    gap: 6,
    alignItems: 'center',
  },
  emptyVoiceTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  emptyVoiceBody: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  voiceHistoryBlock: {
    width: '100%',
    gap: 8,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  compactMessage: {
    borderRadius: 14,
    padding: 12,
    gap: 4,
    borderWidth: 1,
  },
  compactRole: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  compactText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  chatLayout: {
    flex: 1,
  },
  chatThread: {
    flex: 1,
  },
  threadRow: {
    flexDirection: 'row',
    gap: 10,
  },
  threadRowUser: {
    justifyContent: 'flex-end',
  },
  threadRowAssistant: {
    alignItems: 'flex-start',
  },
  messageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 12,
  },
  threadBubble: {
    maxWidth: '86%',
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
  },
  threadLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  threadText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  chatEmptyState: {
    minHeight: 380,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  chatEmptyTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  chatEmptyBody: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
  },
  confirmCard: {
    width: '100%',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  confirmHeader: {
    gap: 4,
  },
  confirmEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  confirmTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
  },
  confirmBody: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: '70%',
  },
  bouncingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typingText: {
    fontSize: 14,
    fontWeight: '400',
  },
  chatComposer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  chatInput: {
    flex: 1,
    minHeight: 54,
    maxHeight: 132,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  chatSendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendDisabled: {
    opacity: 0.5,
  },
  micButton: {
    position: 'absolute',
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  toastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
  toastIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastBody: {
    flex: 1,
    gap: 2,
  },
  toastTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  toastMessage: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
});
