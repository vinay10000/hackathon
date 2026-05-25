import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';

const heroImage = require('../assets/images/onboarding-1.png');

export default function OnboardingScreen() {
  const tokens = useThemeTokens();
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const continueAsGuest = useAppStore((state) => state.continueAsGuest);

  function handleStart() {
    completeOnboarding();
    router.replace('/auth');
  }

  function handleGuestMode() {
    completeOnboarding();
    continueAsGuest();
    router.replace('/today');
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#f5f8ff' }]}>
      <ScrollView bounces={false} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <View style={styles.heroGlowTop} />
          <View style={styles.heroGlowBottom} />
          <Image resizeMode="contain" source={heroImage} style={styles.heroImage} />
        </View>

        <View style={styles.copyBlock}>
          <Text style={[styles.title, { color: '#13235f' }]}>Build Better Habits,{'\n'}One Day at a Time</Text>
          <Text style={[styles.body, { color: '#5d6b8d' }]}>
            Track, analyze, and improve your daily routines with AI-powered insights.
          </Text>
        </View>

        <Pressable onPress={handleStart} style={styles.primaryButton}>
          <Text style={styles.primaryLabel}>Get Started</Text>
          <View style={styles.arrowBadge}>
            <Ionicons color="#ffffff" name="arrow-forward" size={20} />
          </View>
        </Pressable>

        <Pressable onPress={handleGuestMode} style={styles.secondaryButton}>
          <Text style={[styles.secondaryLabel, { color: tokens.textMuted }]}>Continue as guest for now</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  heroWrap: {
    marginTop: 4,
    minHeight: 470,
    borderRadius: 36,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4ff',
  },
  heroGlowTop: {
    position: 'absolute',
    top: -48,
    left: -32,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(164, 216, 255, 0.5)',
  },
  heroGlowBottom: {
    position: 'absolute',
    right: -56,
    bottom: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(173, 146, 255, 0.22)',
  },
  heroImage: {
    width: '100%',
    height: 540,
  },
  copyBlock: {
    marginTop: 18,
    alignItems: 'center',
    gap: 14,
  },
  title: {
    textAlign: 'center',
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  body: {
    maxWidth: 320,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '500',
  },
  primaryButton: {
    marginTop: 28,
    minHeight: 72,
    borderRadius: 28,
    backgroundColor: '#5b6cff',
    paddingLeft: 28,
    paddingRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  primaryLabel: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  arrowBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  secondaryButton: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
