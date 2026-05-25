import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/empty-state';
import { HabitForm } from '@/src/components/habit-form';
import { draftFromHabit } from '@/src/domain/habits';
import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';

export default function EditHabitScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const tokens = useThemeTokens();
  const isLight = tokens.mode === 'light';
  const insets = useSafeAreaInsets();
  const habit = useAppStore((state) => state.habits.find((item) => item.id === params.id));
  const saveHabit = useAppStore((state) => state.saveHabit);
  const [draft, setDraft] = useState(habit ? draftFromHabit(habit) : null);

  if (!habit || !draft) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: tokens.background }]}>
        <View style={styles.missingWrap}>
          <EmptyState title="Habit not found" subtitle="This habit may have been removed before the edit screen opened." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: tokens.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 170 + Math.max(insets.bottom, 12) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[
              styles.headerButton,
              {
                backgroundColor: isLight ? '#ffffff' : '#09111d',
                borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.12)',
              },
            ]}
          >
            <Ionicons name="chevron-back" size={18} color={isLight ? '#10243e' : '#e2e8f0'} />
          </Pressable>
        </View>

        <View style={[styles.heroCard, { backgroundColor: isLight ? '#ffffff' : '#08111f', borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.14)' }]}>
          <Text style={[styles.eyebrow, { color: isLight ? '#2563eb' : '#93c5fd' }]}>Edit habit</Text>
          <Text style={[styles.title, { color: isLight ? '#10243e' : '#ffffff' }]}>{habit.name}</Text>
          <Text style={[styles.subtitle, { color: isLight ? '#5c6b82' : 'rgba(226,232,240,0.84)' }]}>Tune the schedule, visuals, and reminder flow without losing progress history.</Text>
        </View>

        <HabitForm draft={draft} onChange={setDraft} />
      </ScrollView>

      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: tokens.background, borderTopColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.12)' }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save changes"
          onPress={async () => {
            await saveHabit(draft, habit.id);
            router.replace(`/habit/${habit.id}`);
          }}
          style={[styles.saveButton, isLight ? styles.saveButtonLight : null]}
        >
          <Ionicons name="save-outline" size={18} color="#ffffff" />
          <Text style={styles.saveButtonText}>Save changes</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 14,
  },
  missingWrap: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  eyebrow: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  saveButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  saveButtonLight: {
    backgroundColor: '#2563eb',
  },
});
