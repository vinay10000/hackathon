import { Ionicons } from '@expo/vector-icons';
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

const { width: screenWidth } = Dimensions.get('window');
const horizontalPadding = 16;
const slideWidth = screenWidth - horizontalPadding * 2;

const slides = [
  {
    key: 'build',
    image: require('../assets/images/illustration-1.png'),
    title: 'Build Better Habits',
    body: 'Track routines, stay consistent, and grow every day with smart insights and gentle reminders.',
    primaryLabel: 'Next',
    secondaryLabel: 'Sign in',
    features: [
      {
        icon: 'calendar-clear-outline',
        iconBg: 'rgba(132, 90, 255, 0.22)',
        iconColor: '#f1eeff',
        title: 'Daily tracking',
        body: 'Stay on top of what matters.',
      },
      {
        icon: 'notifications',
        iconBg: 'rgba(109, 223, 153, 0.22)',
        iconColor: '#c6ffd7',
        title: 'Smart reminders',
        body: 'Gentle nudges to keep you going.',
      },
      {
        icon: 'sparkles-outline',
        iconBg: 'rgba(59, 154, 255, 0.2)',
        iconColor: '#8fe4ff',
        title: 'AI insights',
        body: 'Understand patterns and grow faster.',
      },
    ],
  },
  {
    key: 'voice',
    image: require('../assets/images/illustration-2.png'),
    title: 'Smart AI Guidance',
    body: 'Create, edit, and log habits using your voice in seconds.',
    primaryLabel: 'Next',
    secondaryLabel: 'Sign in',
    features: [
      {
        icon: 'mic-outline',
        iconBg: 'rgba(132, 90, 255, 0.22)',
        iconColor: '#f1eeff',
        title: 'Voice commands',
        body: 'Use natural speech to manage habits effortlessly.',
      },
      {
        icon: 'sparkles-outline',
        iconBg: 'rgba(89, 102, 255, 0.2)',
        iconColor: '#b4bbff',
        title: 'Instant setup',
        body: 'Create new habits in seconds with AI assistance.',
      },
      {
        icon: 'notifications',
        iconBg: 'rgba(109, 223, 153, 0.22)',
        iconColor: '#c6ffd7',
        title: 'Smart reminders',
        body: 'Get timely nudges to keep you on track, always.',
      },
    ],
  },
  {
    key: 'grow',
    image: require('../assets/images/illustration-3.png'),
    title: 'Grow Every Day',
    body: 'Track streaks, measure progress, and stay motivated with simple insights.',
    primaryLabel: 'Next',
    secondaryLabel: 'Sign in',
    features: [
      {
        icon: 'trending-up-outline',
        iconBg: 'rgba(59, 154, 255, 0.2)',
        iconColor: '#8fe4ff',
        title: 'Progress insights',
        body: '',
      },
      {
        icon: 'flame',
        iconBg: 'rgba(132, 90, 255, 0.22)',
        iconColor: '#e8d2ff',
        title: 'Streak tracking',
        body: '',
      },
      {
        icon: 'trophy',
        iconBg: 'rgba(255, 207, 89, 0.2)',
        iconColor: '#ffd86f',
        title: 'Milestones',
        body: '',
      },
    ],
  },
] as const;

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.ambientGlowLeft} />
        <View style={styles.ambientGlowRight} />
        <View style={styles.ambientStarOne} />
        <View style={styles.ambientStarTwo} />
        <View style={styles.ambientStarThree} />

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
                <Image resizeMode="cover" source={item.image} style={styles.heroImage} />
              </View>

              <View style={styles.copyBlock}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
              </View>

              <View style={styles.featureRow}>
                {item.features.map((feature) => {
                  const compact = !feature.body;

                  return (
                    <View key={feature.title} style={[styles.featureCard, compact && styles.featureCardCompact]}>
                      <View style={[styles.iconWrap, { backgroundColor: feature.iconBg }]}>
                        <Ionicons color={feature.iconColor} name={feature.icon} size={compact ? 24 : 22} />
                      </View>
                      <Text style={[styles.featureTitle, compact && styles.featureTitleCompact]}>{feature.title}</Text>
                      {feature.body ? <Text style={styles.featureBody}>{feature.body}</Text> : null}
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          showsHorizontalScrollIndicator={false}
          style={styles.carousel}
        />

        <View style={styles.footer}>
          <View style={styles.paginationRow}>
            <View style={styles.counterPill}>
              <Text style={styles.counterText}>
                {activeIndex + 1} of {slides.length}
              </Text>
            </View>

            <View style={styles.dotsRow}>
              {slides.map((slide, index) => (
                <View key={slide.key} style={[styles.dot, index === activeIndex && styles.dotActive]} />
              ))}
            </View>
          </View>

          <Pressable onPress={handlePrimaryPress} style={styles.primaryButton}>
            <View style={styles.primaryArrowBubble}>
              <Ionicons color="#ffffff" name="arrow-forward" size={24} />
            </View>
            <Text style={styles.primaryLabel}>{activeSlide.primaryLabel}</Text>
          </Pressable>

          <Pressable onPress={handleSecondaryPress} style={styles.secondaryButton}>
            <Text style={styles.secondaryLabel}>{activeSlide.secondaryLabel}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#040814',
  },
  screen: {
    flex: 1,
    backgroundColor: '#040814',
    paddingHorizontal: horizontalPadding,
    paddingTop: 6,
    paddingBottom: 14,
  },
  ambientGlowLeft: {
    position: 'absolute',
    top: 120,
    left: -70,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(117, 76, 255, 0.07)',
  },
  ambientGlowRight: {
    position: 'absolute',
    top: 220,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: 'rgba(55, 188, 255, 0.05)',
  },
  ambientStarOne: {
    position: 'absolute',
    top: 154,
    left: 62,
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(153, 109, 255, 0.8)',
  },
  ambientStarTwo: {
    position: 'absolute',
    top: 236,
    right: 78,
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(86, 210, 255, 0.75)',
  },
  ambientStarThree: {
    position: 'absolute',
    top: 336,
    left: 112,
    width: 2,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(204, 133, 255, 0.75)',
  },
  carousel: {
    flex: 1,
  },
  slide: {
    width: slideWidth,
    paddingBottom: 8,
  },
  heroFrame: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImage: {
    width: '112%',
    height: 500,
    marginTop: -4,
    opacity: 0.98,
  },
  copyBlock: {
    marginTop: -6,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -1,
  },
  body: {
    marginTop: 10,
    maxWidth: 312,
    color: '#b8bccb',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  featureCard: {
    flex: 1,
    minHeight: 78,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 20, 39, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(113, 92, 184, 0.26)',
    alignItems: 'flex-start',
  },
  featureCardCompact: {
    minHeight: 74,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureTitle: {
    color: '#f8f8ff',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    textAlign: 'left',
  },
  featureTitleCompact: {
    flex: 1,
    marginLeft: 12,
    textAlign: 'left',
    fontSize: 15,
    lineHeight: 20,
  },
  featureBody: {
    marginTop: 4,
    color: '#b6bdd0',
    fontSize: 9,
    lineHeight: 14,
    fontWeight: '500',
    textAlign: 'left',
  },
  footer: {
    marginTop: 12,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  counterPill: {
    minWidth: 62,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 26, 45, 0.92)',
  },
  counterText: {
    color: '#f2f3fa',
    fontSize: 12,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(70, 72, 98, 0.92)',
  },
  dotActive: {
    backgroundColor: '#936eff',
  },
  primaryButton: {
    marginTop: 18,
    minHeight: 64,
    borderRadius: 28,
    backgroundColor: '#7258ff',
    borderWidth: 1,
    borderColor: 'rgba(173, 157, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7d66ff',
    shadowOpacity: 0.38,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  primaryArrowBubble: {
    position: 'absolute',
    left: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  primaryLabel: {
    color: '#ffffff',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  secondaryButton: {
    marginTop: 12,
    minHeight: 54,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(85, 91, 126, 0.38)',
    backgroundColor: 'rgba(6, 10, 21, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    color: '#9c80ff',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
});
