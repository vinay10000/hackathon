import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

type InteractionMode = 'voice' | 'chat';

type ResultPopup = {
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

export default function AssistantScreen() {
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
  const [finalTranscript, setFinalTranscript] = useState('');
  const [recognizing, setRecognizing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cleaningTranscript, setCleaningTranscript] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [resultPopup, setResultPopup] = useState<ResultPopup | null>(null);
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
  const speechPulse = useRef(new Animated.Value(0)).current;
  const waveShift = useRef(new Animated.Value(0)).current;

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
    setResultPopup(null);
    setTranscript('');
    setFinalTranscript('');
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
    setResultPopup({
      type: 'failure',
      title: 'Speech failed',
      message,
    });
    if (event.error === 'not-allowed') {
      setMicrophonePermission('denied');
    }
  });

  const voiceMessages = useMemo(() => messages.slice(-4), [messages]);
  const transcriptWords = useMemo(() => getTranscriptWords(transcript), [transcript]);
  const activeWordIndex = Math.min(liveWordIndex, Math.max(transcriptWords.length - 1, 0));
  const orbScale = recognizing
    ? speechPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] })
    : processing
      ? speechPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] })
      : idlePulse.interpolate({ inputRange: [0, 1], outputRange: [0.99, 1.02] });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        style={styles.safeArea}
      >
        <View style={styles.screen}>
          <Pressable
            accessibilityLabel="Close assistant"
            accessibilityRole="button"
            onPress={() => {
              if (recognizing) {
                stopListening();
              }
              router.replace('/today');
            }}
            style={[styles.closeButton, { top: Math.max(insets.top, 20) + 10 }]}
          >
            <Text style={styles.closeGlyph}>×</Text>
          </Pressable>

          <View style={[styles.topRightActions, { top: Math.max(insets.top, 20) + 16, right: 20 }]}>
            <View style={styles.modeSwitch}>
              <ModeButton
                icon="pulse"
                active={interactionMode === 'voice'}
                accessibilityLabel="Voice mode"
                onPress={() => setInteractionMode('voice')}
              />
              <ModeButton
                icon="chatbubble-ellipses-outline"
                active={interactionMode === 'chat'}
                accessibilityLabel="Chat mode"
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
              style={styles.newChatButton}
            >
              <Ionicons name="refresh" size={18} color="rgba(230,239,255,0.86)" />
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
              <VoiceOrb idlePulse={idlePulse} speechPulse={speechPulse} waveShift={waveShift} active={recognizing || processing} scale={orbScale} />

              <View style={styles.stateRow}>
                <StateBadge label="Listening" active={recognizing} tone="listening" />
                <StateBadge label="Cleaning" active={cleaningTranscript} tone="thinking" />
                <StateBadge label="Thinking" active={processing && !recognizing && !cleaningTranscript} tone="thinking" />
                <StateBadge
                  label={pendingAction ? 'Confirming' : 'Ready'}
                  active={!recognizing && !processing && !cleaningTranscript}
                  tone={pendingAction ? 'confirm' : 'idle'}
                />
              </View>

              <View style={styles.voiceStageCard}>
                <Text style={styles.sectionEyebrow}>Live voice</Text>
                {transcriptWords.length ? (
                  <View style={styles.transcriptWrap}>
                    {transcriptWords.map((word, index) => (
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
                                  outputRange: [1, recognizing ? 1.05 : 1.02],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <Text style={[styles.word, index === activeWordIndex ? styles.activeWord : styles.pastWord]}>{word}</Text>
                      </Animated.View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyVoiceState}>
                    <Text style={styles.emptyVoiceTitle}>{recognizing ? 'Listening now' : 'Tap the mic to talk'}</Text>
                    <Text style={styles.emptyVoiceBody}>
                      {recognizing
                        ? 'Your spoken words will appear here live.'
                        : 'Speak naturally. I can coach you, ask follow-up questions, and prepare habit changes for confirmation.'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.voiceStageCard}>
                <Text style={styles.sectionEyebrow}>Final transcript</Text>
                {cleaningTranscript ? (
                  <View style={styles.finalTranscriptState}>
                    <ActivityIndicator color="#8ff0d9" />
                    <Text style={styles.finalTranscriptBody}>{`Cleaning the final transcript with ${getWhisperModelName()} before I respond.`}</Text>
                  </View>
                ) : finalTranscript ? (
                  <Text style={styles.finalTranscriptText}>{finalTranscript}</Text>
                ) : (
                  <Text style={styles.finalTranscriptHint}>
                    Live words appear above while you speak. After you stop, I clean the final transcript before responding.
                  </Text>
                )}
              </View>

              {speechError ? <Text style={styles.errorText}>{speechError}</Text> : null}

              {pendingAction ? (
                <ConfirmationCard
                  preview={pendingAction.preview}
                  onConfirm={() => void confirmPendingAction()}
                  onCancel={cancelPendingAction}
                  onSelectHabit={(habitId) => void resolveDisambiguation(habitId)}
                  busy={processing}
                />
              ) : null}

              <View style={styles.voiceHistoryBlock}>
                <Text style={styles.sectionEyebrow}>Conversation</Text>
                {voiceMessages.length ? (
                  voiceMessages.map((message) => <CompactMessage key={message.id} message={message} />)
                ) : (
                  <Text style={styles.emptyConversationText}>
                    Your recent turns will stay here so you can see what you said, what I understood, and what happens next.
                  </Text>
                )}
              </View>
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
                  messages.map((message) => <ThreadMessage key={message.id} message={message} />)
                ) : (
                  <View style={styles.chatEmptyState}>
                    <Text style={styles.chatEmptyTitle}>Chat with your habit assistant</Text>
                    <Text style={styles.chatEmptyBody}>
                      Ask for coaching, talk through a goal, or tell me to create, update, delete, or complete a habit. I will confirm before changing anything.
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
                  />
                ) : null}

                {processing ? (
                  <View style={styles.typingRow}>
                    <ActivityIndicator color="#2ed0ff" />
                    <Text style={styles.typingText}>Thinking through that...</Text>
                  </View>
                ) : null}
              </ScrollView>

              <View style={[styles.chatComposer, { paddingBottom: Math.max(insets.bottom, 18) + 10 }]}>
                <TextInput
                  value={chatDraft}
                  onChangeText={setChatDraft}
                  placeholder="Ask anything about your habits..."
                  placeholderTextColor="rgba(133,162,191,0.78)"
                  style={styles.chatInput}
                  multiline
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send message"
                  onPress={() => void submitChatDraft()}
                  disabled={!chatDraft.trim() || processing}
                  style={[styles.chatSendButton, (!chatDraft.trim() || processing) && styles.chatSendDisabled]}
                >
                  <Ionicons name="arrow-up" size={20} color="#08111f" />
                </Pressable>
              </View>
            </View>
          )}

          {interactionMode === 'voice' ? (
            <Pressable
              accessibilityLabel={recognizing ? 'Stop listening' : 'Start listening'}
              accessibilityRole="button"
              onPress={recognizing ? stopListening : () => void startListening()}
              style={[styles.micButton, { bottom: Math.max(insets.bottom, 18) + 28 }]}
            >
              <View style={styles.micGlow} />
              {recognizing || processing ? <Ionicons name="stop" size={24} color="#ffffff" /> : <Ionicons name="mic" size={28} color="#061322" />}
            </Pressable>
          ) : null}

          {resultPopup ? (
            <View style={styles.popupBackdrop}>
              <View style={[styles.resultPopup, resultPopup.type === 'failure' && styles.failurePopup]}>
                <View style={[styles.popupIcon, resultPopup.type === 'failure' && styles.failureIcon]}>
                  <Ionicons name={resultPopup.type === 'success' ? 'checkmark' : 'alert'} size={20} color="#ffffff" />
                </View>
                <Text style={styles.popupTitle}>{resultPopup.title}</Text>
                <Text style={styles.popupMessage}>{resultPopup.message}</Text>
                <Pressable onPress={() => setResultPopup(null)} style={styles.popupButton}>
                  <Text style={styles.popupButtonText}>OK</Text>
                </Pressable>
              </View>
            </View>
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
      setResultPopup({ type: 'failure', title: 'Assistant disabled', message });
      if (source === 'voice') {
        void speakAgentReply(message);
      }
      return;
    }

    setProcessing(true);
    setSpeechError('');
    setResultPopup(null);
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
      setResultPopup({ type: 'failure', title: 'Action failed', message });
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
      setResultPopup({ type: 'success', title: 'Done', message: resultMessage });
      setPendingAction(null);
      setSelectedHabitId(undefined);
      void speakAgentReply(resultMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not finish that action.';
      updateAiHistoryStatus(pendingAction.sessionId, 'failed');
      addMessage('assistant', `I could not finish that: ${message}`);
      setResultPopup({ type: 'failure', title: 'Action failed', message });
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
    setFinalTranscript('');
    setCleaningTranscript(false);
    setSpeechError('');
    setResultPopup(null);
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
    setResultPopup(null);
    setFinalTranscript('');
    setCleaningTranscript(false);
    try {
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
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

      Speech.stop();
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
    setFinalTranscript(liveTranscript);

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
        setFinalTranscript(cleanedTranscript);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Whisper cleanup failed.';
        setSpeechError(message);
        setFinalTranscript(liveTranscript);
      } finally {
        setCleaningTranscript(false);
      }
    }

    if (cleanedTranscript && cleanedTranscript !== processedTranscriptRef.current) {
      processedTranscriptRef.current = cleanedTranscript;
      await handleUserTurn(cleanedTranscript, 'voice');
    }

    voiceTurnInFlightRef.current = false;
    audioRecordingUriRef.current = null;
  }
}

function ConfirmationCard({
  preview,
  onConfirm,
  onCancel,
  onSelectHabit,
  busy,
}: {
  preview: AiCommandPreview;
  onConfirm: () => void;
  onCancel: () => void;
  onSelectHabit: (habitId: string) => void;
  busy: boolean;
}) {
  const destructive = preview.intent === 'delete';

  return (
    <View style={[styles.confirmCard, destructive && styles.confirmCardDanger]}>
      <View style={styles.confirmHeader}>
        <Text style={[styles.confirmEyebrow, destructive && styles.confirmEyebrowDanger]}>
          {preview.status === 'needs-clarification' ? 'Need one more detail' : 'Review before changing anything'}
        </Text>
        <Text style={styles.confirmTitle}>{preview.intent === 'delete' ? 'Delete habit' : humanizeIntent(preview.intent)}</Text>
      </View>

      <Text style={styles.confirmBody}>{preview.preview}</Text>

      {preview.disambiguationOptions?.length ? (
        <View style={styles.optionWrap}>
          {preview.disambiguationOptions.map((option) => (
            <Pressable key={option.id} onPress={() => onSelectHabit(option.id)} style={styles.optionChip}>
              <Text style={styles.optionChipText}>{option.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {preview.execution ? (
        <View style={styles.confirmActions}>
          <Pressable onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={onConfirm} disabled={busy} style={[styles.confirmButton, destructive && styles.confirmDangerButton]}>
            <Text style={styles.confirmButtonText}>{busy ? 'Working...' : destructive ? 'Delete' : 'Confirm'}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ThreadMessage({ message }: { message: AssistantSessionMessage }) {
  const isUser = message.role === 'user';
  const isPreview = message.role === 'system-preview';

  return (
    <View style={[styles.threadRow, isUser ? styles.threadRowUser : styles.threadRowAssistant]}>
      {!isUser ? <View style={[styles.messageDot, isPreview && styles.messageDotPreview]} /> : null}
      <View
        style={[
          styles.threadBubble,
          isUser ? styles.threadBubbleUser : isPreview ? styles.threadBubblePreview : styles.threadBubbleAssistant,
        ]}
      >
        {!isUser ? <Text style={styles.threadLabel}>{isPreview ? 'Action preview' : 'Assistant'}</Text> : null}
        <Text style={[styles.threadText, isPreview && styles.threadTextPreview]}>{message.text}</Text>
      </View>
    </View>
  );
}

function CompactMessage({ message }: { message: AssistantSessionMessage }) {
  return (
    <View style={[styles.compactMessage, message.role === 'user' ? styles.compactUser : styles.compactAssistant]}>
      <Text style={styles.compactRole}>{message.role === 'user' ? 'You' : message.role === 'system-preview' ? 'Preview' : 'Assistant'}</Text>
      <Text style={styles.compactText}>{message.text}</Text>
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
      <Ionicons name={icon} size={18} color={active ? '#071220' : 'rgba(231,240,255,0.72)'} />
    </Pressable>
  );
}

function StateBadge({
  label,
  active,
  tone,
}: {
  label: string;
  active: boolean;
  tone: 'idle' | 'listening' | 'thinking' | 'confirm';
}) {
  return (
    <View style={[styles.stateBadge, active && styles.stateBadgeActive]}>
      <View
        style={[
          styles.stateIcon,
          tone === 'listening' && styles.stateIconListening,
          tone === 'thinking' && styles.stateIconThinking,
          tone === 'confirm' && styles.stateIconConfirm,
        ]}
      />
      <Text style={styles.stateLabel}>{label}</Text>
    </View>
  );
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
    : idlePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] });

  return (
    <Animated.View style={[styles.orbField, { transform: [{ scale }] }]}>
      <Animated.View style={[styles.dottedRing, { transform: [{ scale: activeScale }] }]} />
      <Animated.View style={[styles.outerGlow, { opacity: active ? 0.74 : 0.38, transform: [{ scale: activeScale }] }]} />
      <View style={styles.orb}>
        <View style={styles.orbTintA} />
        <View style={styles.orbTintB} />
        <View style={styles.orbTintC} />
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
                    ? speechPulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.18] })
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
  safeArea: {
    flex: 1,
    backgroundColor: '#04101d',
  },
  screen: {
    flex: 1,
    backgroundColor: '#04101d',
  },
  closeButton: {
    position: 'absolute',
    left: 18,
    zIndex: 5,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    color: 'rgba(226,236,248,0.82)',
    fontSize: 48,
    lineHeight: 48,
    fontWeight: '300',
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
    borderRadius: 20,
    backgroundColor: 'rgba(10,23,38,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(98,130,159,0.22)',
  },
  modeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#8ff0d9',
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(10,23,38,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceContent: {
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 18,
  },
  orbField: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dottedRing: {
    position: 'absolute',
    width: 276,
    height: 276,
    borderRadius: 138,
    borderColor: 'rgba(77,193,255,0.42)',
    borderWidth: 2,
    borderStyle: 'dotted',
  },
  outerGlow: {
    position: 'absolute',
    width: 236,
    height: 236,
    borderRadius: 118,
    borderWidth: 14,
    borderColor: 'rgba(53,175,255,0.16)',
    shadowColor: '#2ec8ff',
    shadowOpacity: 0.8,
    shadowRadius: 24,
  },
  orb: {
    width: 194,
    height: 194,
    borderRadius: 97,
    overflow: 'hidden',
    backgroundColor: '#09254d',
    borderWidth: 2,
    borderColor: '#5fe5ff',
  },
  orbTintA: {
    position: 'absolute',
    left: -22,
    top: -12,
    width: 132,
    height: 174,
    borderRadius: 80,
    backgroundColor: 'rgba(63,214,255,0.36)',
  },
  orbTintB: {
    position: 'absolute',
    right: -22,
    bottom: -18,
    width: 150,
    height: 176,
    borderRadius: 90,
    backgroundColor: 'rgba(43,143,255,0.48)',
  },
  orbTintC: {
    position: 'absolute',
    left: 32,
    bottom: -38,
    width: 130,
    height: 110,
    borderRadius: 60,
    backgroundColor: 'rgba(143,240,217,0.36)',
  },
  waveBand: {
    position: 'absolute',
    left: 16,
    top: 66,
    width: 162,
    height: 66,
  },
  waveLobeLeft: {
    position: 'absolute',
    left: 0,
    top: 16,
    width: 98,
    height: 44,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 60,
    backgroundColor: 'rgba(78,188,255,0.64)',
  },
  waveLobeRight: {
    position: 'absolute',
    right: 0,
    top: 16,
    width: 98,
    height: 44,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 28,
    backgroundColor: 'rgba(143,240,217,0.74)',
  },
  waveThread: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: 34,
    height: 2,
    borderRadius: 99,
    backgroundColor: '#d7fbff',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    opacity: 0.6,
  },
  stateBadgeActive: {
    opacity: 1,
  },
  stateIcon: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#89a9c7',
  },
  stateIconListening: {
    backgroundColor: '#2ed0ff',
  },
  stateIconThinking: {
    backgroundColor: '#8ff0d9',
  },
  stateIconConfirm: {
    backgroundColor: '#ffd166',
  },
  stateLabel: {
    color: '#e8f1fb',
    fontSize: 13,
    fontWeight: '700',
  },
  voiceStageCard: {
    width: '100%',
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#0b1d31',
    borderWidth: 1,
    borderColor: 'rgba(113,154,188,0.18)',
    gap: 12,
  },
  sectionEyebrow: {
    color: '#8ff0d9',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transcriptWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    rowGap: 10,
  },
  wordWrap: {
    minHeight: 38,
    justifyContent: 'center',
  },
  activeWordWrap: {
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#2ed0ff',
  },
  word: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
  },
  pastWord: {
    color: '#f5fbff',
  },
  activeWord: {
    color: '#04101d',
  },
  emptyVoiceState: {
    gap: 8,
  },
  emptyVoiceTitle: {
    color: '#f3f8fd',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  emptyVoiceBody: {
    color: '#9bb4cb',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  finalTranscriptState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  finalTranscriptBody: {
    flex: 1,
    color: '#dbe8f4',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  finalTranscriptText: {
    color: '#f4fbff',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
  },
  finalTranscriptHint: {
    color: '#93acc4',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  errorText: {
    color: '#ff9d9d',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  voiceHistoryBlock: {
    width: '100%',
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#081827',
    borderWidth: 1,
    borderColor: 'rgba(113,154,188,0.16)',
    gap: 10,
  },
  compactMessage: {
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  compactUser: {
    backgroundColor: 'rgba(46,208,255,0.12)',
  },
  compactAssistant: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  compactRole: {
    color: '#8ff0d9',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  compactText: {
    color: '#edf5ff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  emptyConversationText: {
    color: '#93acc4',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
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
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 12,
    backgroundColor: '#8ff0d9',
  },
  messageDotPreview: {
    backgroundColor: '#ffd166',
  },
  threadBubble: {
    maxWidth: '86%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  threadBubbleUser: {
    backgroundColor: '#2ed0ff',
  },
  threadBubbleAssistant: {
    backgroundColor: '#0b1d31',
    borderWidth: 1,
    borderColor: 'rgba(113,154,188,0.2)',
  },
  threadBubblePreview: {
    backgroundColor: '#2b230b',
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.28)',
  },
  threadLabel: {
    color: '#8ff0d9',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  threadText: {
    color: '#edf5ff',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  threadTextPreview: {
    color: '#fff4cc',
  },
  chatEmptyState: {
    minHeight: 380,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  chatEmptyTitle: {
    color: '#f3f8fd',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  chatEmptyBody: {
    color: '#9bb4cb',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#102338',
    borderWidth: 1,
    borderColor: 'rgba(113,154,188,0.2)',
    gap: 14,
  },
  confirmCardDanger: {
    backgroundColor: '#2a1315',
    borderColor: 'rgba(255,128,128,0.28)',
  },
  confirmHeader: {
    gap: 4,
  },
  confirmEyebrow: {
    color: '#8ff0d9',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  confirmEyebrowDanger: {
    color: '#ffb4b4',
  },
  confirmTitle: {
    color: '#f4f8fd',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  confirmBody: {
    color: '#dbe8f4',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
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
    backgroundColor: 'rgba(46,208,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46,208,255,0.2)',
  },
  optionChipText: {
    color: '#dff8ff',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cancelButtonText: {
    color: '#edf5ff',
    fontSize: 15,
    fontWeight: '800',
  },
  confirmButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8ff0d9',
  },
  confirmDangerButton: {
    backgroundColor: '#ff8b8b',
  },
  confirmButtonText: {
    color: '#05101d',
    fontSize: 15,
    fontWeight: '900',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  typingText: {
    color: '#9bb4cb',
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: 'rgba(4,16,29,0.96)',
  },
  chatInput: {
    flex: 1,
    minHeight: 54,
    maxHeight: 132,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#0b1d31',
    color: '#edf5ff',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  chatSendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8ff0d9',
  },
  chatSendDisabled: {
    opacity: 0.5,
  },
  micButton: {
    position: 'absolute',
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#8ff0d9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8ff0d9',
    shadowOpacity: 0.42,
    shadowRadius: 18,
  },
  micGlow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
  },
  popupBackdrop: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 24,
  },
  resultPopup: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 22,
    backgroundColor: '#0d2237',
    alignItems: 'center',
    gap: 10,
  },
  failurePopup: {
    backgroundColor: '#2a1315',
  },
  popupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#16c47f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  failureIcon: {
    backgroundColor: '#ff8b8b',
  },
  popupTitle: {
    color: '#f3f8fd',
    fontSize: 20,
    fontWeight: '800',
  },
  popupMessage: {
    color: '#dbe8f4',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '600',
  },
  popupButton: {
    marginTop: 4,
    minWidth: 110,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8ff0d9',
  },
  popupButtonText: {
    color: '#05101d',
    fontSize: 15,
    fontWeight: '900',
  },
});
