import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { EmptyState } from '@/src/components/empty-state';
import { HabitForm } from '@/src/components/habit-form';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { draftFromHabit } from '@/src/domain/habits';
import { useAppStore } from '@/src/store/app-store';

export default function EditHabitScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const habit = useAppStore((state) => state.habits.find((item) => item.id === params.id));
  const saveHabit = useAppStore((state) => state.saveHabit);
  const [draft, setDraft] = useState(habit ? draftFromHabit(habit) : null);

  if (!habit || !draft) {
    return (
      <ScreenShell title="Edit habit">
        <EmptyState title="Habit not found" subtitle="This habit may have been removed before the edit screen opened." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={`Edit ${habit.name}`} subtitle="Update schedule, notes, targets, and reminder settings without losing history.">
      <HabitForm draft={draft} onChange={setDraft} />
      <PrimaryButton
        label="Save changes"
        onPress={async () => {
          await saveHabit(draft, habit.id);
          router.replace(`/habit/${habit.id}`);
        }}
      />
    </ScreenShell>
  );
}
