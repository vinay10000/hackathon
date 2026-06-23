import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppStore } from '@/src/store/app-store';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const horizontalPadding = 16;
const slideWidth = screenWidth - horizontalPadding * 2;
const heroHeight = Math.min(380, Math.max(260, screenHeight * 0.43));

type OnboardingFeature = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
};

const slides: Array<{
  key: string;
  image: number;
  eyebrow: string;
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel: string;
  accent: string;
  features: OnboardingFeature[];
}> = [
  {
    key: 'build',
    image: require('../assets/images/illustration-1.png'),
    eyebrow: 'Start simple',
    title: 'Build habits that actually stick',
    body: 'Plan your day, keep momentum visible, and get gentle nudges before routines slip away.',
    primaryLabel: 'Next',
    secondaryLabel: 'Sign in instead',
    accent: '#8b5cf6',
    features: [
      {
        icon: 'calendar-clear-outline',
        iconBg: 'rgba(139, 92, 246, 0.18)',
        iconColor: '#ddd6fe',
        title: 'Daily rhythm',
        body: 'Know what to do next at a glance.',
      },
      {
        icon: 'notifications-outline',
        iconBg: 'rgba(45, 212, 191, 0.16)',
        iconColor: '#99f6e4',
        title: 'Smart nudges',
        body: 'Helpful reminders without the noise.',
      },
      {
        icon: 'sparkles-outline',
        iconBg: 'rgba(96, 165, 250, 0.16)',
        iconColor: '#bfdbfe',
        title: 'AI support',
        body: 'Turn goals into practical routines.',
      },
    ],
  },
  {
    key: 'voice',
    image: require('../assets/images/illustration-2.png'),
    eyebrow: 'Less tapping',
    title: 'Let AI handle the habit admin',
    body: 'Create, edit, and log routines with natural voice commands when your hands are full.',
    primaryLabel: 'Next',
    secondaryLabel: 'Sign in instead',
    accent: '#38bdf8',
    features: [
      {
        icon: 'mic-outline',
        iconBg: 'rgba(56, 189, 248, 0.16)',
        iconColor: '#bae6fd',
        title: 'Voice logging',
        body: 'Say what changed and move on.',
      },
      {
        icon: 'flash-outline',
        iconBg: 'rgba(167, 139, 250, 0.18)',
        iconColor: '#ddd6fe',
        title: 'Instant setup',
        body: 'Describe a goal. Get a habit plan.',
      },
      {
        icon: 'chatbubble-ellipses-outline',
        iconBg: 'rgba(74, 222, 128, 0.16)',
        iconColor: '#bbf7d0',
        title: 'Guided edits',
        body: 'Adjust routines conversationally.',
      },
    ],
  },
  {
    key: 'grow',
    image: require('../assets/images/illustration-3.png'),
    eyebrow: 'Stay motivated',
    title: 'See progress before motivation fades',
    body: 'Track streaks, spot patterns, and celebrate small wins that make consistency feel rewarding.',
    primaryLabel: 'Get started',
    secondaryLabel: 'Sign in instead',
    accent: '#fbbf24',
    features: [
      {
        icon: 'trending-up-outline',
        iconBg: 'rgba(56, 189, 248, 0.16)',
        iconColor: '#bae6fd',
        title: 'Progress insights',
        body: 'Understand what is improving.',
      },
      {
        icon: 'flame-outline',
        iconBg: 'rgba(251, 191, 36, 0.16)',
        iconColor: '#fde68a',
        title: 'Streak energy',
        body: 'Keep momentum front and center.',
      },
      {
        icon: 'trophy-outline',
        iconBg: 'rgba(74, 222, 128, 0.16)',
        iconColor: '#bbf7d0',
        title: 'Milestones',
        body: 'Make every small win visible.',
      },
    ],
  },
];

export default function OnboardingScreen() {
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const flatListRef = useRef<FlatList<(typeof slides)[number]>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setActiveIndex(Math.max(0, Math.min(slides.length - 1, nextIndex)));
  }

  function handlePrimaryPress() {
    if (activeIndex < slides.length - 1) {
      const nextIndex = activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveIndex(nextIndex);
      return;
    }

    completeOnboarding();
    router.replace('/auth');
  }

  function handleSecondaryPress() {
    completeOnboarding();
    router.replace('/auth');
  }

  const activeSlide = slides[activeIndex];
  const primaryAccessibilityLabel = activeIndex < slides.length - 1 ? 'Continue onboarding' : 'Finish onboarding';

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#010814', '#06162a', '#030712']} locations={[0, 0.52, 1]} style={styles.screen}>
        <View style={styles.ambientGlowTop} />
        <View style={styles.ambientGlowLeft} />
        <View style={styles.ambientGlowRight} />
        <View style={styles.ambientStarOne} />
        <View style={styles.ambientStarTwo} />
        <View style={styles.ambientStarThree} />

        <View style={styles.topBar}>
          <View style={styles.brandPill}>
            <View style={styles.brandIcon}>
              <Ionicons color="#99f6e4" name="leaf" size={15} />
            </View>
            <Text style={styles.brandText}>HabitAI</Text>
          </View>
          <Text style={styles.stepText}>Step {activeIndex + 1}/{slides.length}</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={slides}
          horizontal
          pagingEnabled
          keyExtractor={(item) => item.key}
          onMomentumScrollEnd={handleMomentumEnd}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <View style={styles.heroFrame}>
                <View style={[styles.heroGlow, { backgroundColor: item.accent }]} />
                <Image resizeMode="contain" source={item.image} style={styles.heroImage} />
              </View>

              <View style={styles.copyBlock}>
                <View style={[styles.eyebrowPill, { borderColor: `${item.accent}55` }]}>
                  <Ionicons color={item.accent} name="sparkles" size={13} />
                  <Text style={[styles.eyebrowText, { color: item.accent }]}>{item.eyebrow}</Text>
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
              </View>

              <View style={styles.featureGrid}>
                {item.features.map((feature) => (
                  <View key={feature.title} style={styles.featureCard}>
                    <View style={[styles.iconWrap, { backgroundColor: feature.iconBg }]}>
                      <Ionicons color={feature.iconColor} name={feature.icon} size={20} />
                    </View>
                    <View style={styles.featureCopy}>
                      <Text style={styles.featureTitle}>{feature.title}</Text>
                      <Text style={styles.featureBody}>{feature.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
          showsHorizontalScrollIndicator={false}
          style={styles.carousel}
        />

        <View style={styles.footer}>
          <View style={styles.paginationRow}>
            <View style={styles.dotsRow} accessibilityLabel={`Onboarding slide ${activeIndex + 1} of ${slides.length}`}>
              {slides.map((slide, index) => (
                <View key={slide.key} style={[styles.dot, index === activeIndex && [styles.dotActive, { backgroundColor: activeSlide.accent }]]} />
              ))}
            </View>
            <Text style={styles.paginationHint}>{activeIndex < slides.length - 1 ? 'Swipe or tap next' : 'Ready when you are'}</Text>
          </View>

          <Pressable
            accessibilityLabel={primaryAccessibilityLabel}
            accessibilityRole="button"
            onPress={handlePrimaryPress}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          >
            <LinearGradient colors={['#8b5cf6', '#6366f1', '#38bdf8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButtonGradient}>
              <View style={styles.primaryArrowBubble}>
                <Ionicons color="#ffffff" name={activeIndex < slides.length - 1 ? 'arrow-forward' : 'checkmark'} size={22} />
              </View>
              <Text style={styles.primaryLabel}>{activeSlide.primaryLabel}</Text>
            </LinearGradient>
          </Pressable>

          <Pressable accessibilityLabel="Sign in instead" accessibilityRole="button" onPress={handleSecondaryPress} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
            <Text style={styles.secondaryLabel}>{activeSlide.secondaryLabel}</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#010814',
  },
  screen: {
    flex: 1,
    paddingHorizontal: horizontalPadding,
    paddingTop: 8,
    paddingBottom: 14,
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -120,
    alignSelf: 'center',
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: 'rgba(96, 165, 250, 0.10)',
  },
  ambientGlowLeft: {
    position: 'absolute',
    top: 150,
    left: -96,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(139, 92, 246, 0.10)',
  },
  ambientGlowRight: {
    position: 'absolute',
    top: 270,
    right: -100,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(45, 212, 191, 0.08)',
  },
  ambientStarOne: {
    position: 'absolute',
    top: 144,
    left: 58,
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(196, 181, 253, 0.9)',
  },
  ambientStarTwo: {
    position: 'absolute',
    top: 232,
    right: 72,
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(125, 211, 252, 0.78)',
  },
  ambientStarThree: {
    position: 'absolute',
    top: 360,
    left: 108,
    width: 2,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(253, 224, 71, 0.82)',
  },
  topBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandPill: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    backgroundColor: 'rgba(8, 18, 35, 0.72)',
    paddingHorizontal: 12,
  },
  brandIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  brandText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  stepText: {
    color: 'rgba(203, 213, 225, 0.72)',
    fontSize: 12,
    fontWeight: '700',
  },
  carousel: {
    flex: 1,
  },
  slide: {
    width: slideWidth,
    paddingBottom: 8,
  },
  heroFrame: {
    height: heroHeight,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  heroGlow: {
    position: 'absolute',
    width: '70%',
    height: '58%',
    borderRadius: 999,
    opacity: 0.16,
    transform: [{ scaleX: 1.25 }],
  },
  heroImage: {
    width: '108%',
    height: '100%',
    opacity: 0.98,
  },
  copyBlock: {
    marginTop: screenHeight < 760 ? -2 : 6,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  eyebrowPill: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  eyebrowText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    maxWidth: 340,
    color: '#ffffff',
    fontSize: screenHeight < 760 ? 29 : 32,
    lineHeight: screenHeight < 760 ? 35 : 38,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -1.1,
  },
  body: {
    marginTop: 10,
    maxWidth: 326,
    color: 'rgba(226, 232, 240, 0.78)',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
  featureGrid: {
    marginTop: 18,
    gap: 8,
  },
  featureCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(8, 18, 35, 0.76)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    shadowColor: '#020617',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: {
    flex: 1,
  },
  featureTitle: {
    color: '#f8fafc',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  featureBody: {
    marginTop: 3,
    color: 'rgba(203, 213, 225, 0.68)',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  footer: {
    paddingTop: 12,
  },
  paginationRow: {
    alignItems: 'center',
    gap: 8,
  },
  dotsRow: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(100, 116, 139, 0.52)',
  },
  dotActive: {
    width: 28,
  },
  paginationHint: {
    color: 'rgba(203, 213, 225, 0.58)',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 14,
    minHeight: 64,
    borderRadius: 28,
    shadowColor: '#6366f1',
    shadowOpacity: 0.38,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  primaryButtonGradient: {
    minHeight: 64,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryArrowBubble: {
    position: 'absolute',
    left: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  primaryLabel: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  secondaryButton: {
    marginTop: 10,
    minHeight: 50,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
    backgroundColor: 'rgba(8, 18, 35, 0.54)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    color: '#c4b5fd',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
