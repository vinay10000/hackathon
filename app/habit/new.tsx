import { router } from 'expo-router';
import { format } from 'date-fns';
import { useState } from 'react';

import { HabitForm } from '@/src/components/habit-form';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { createDefaultDraft } from '@/src/domain/habits';
import { useAppStore } from '@/src/store/app-store';

export default function NewHabitScreen() {
  const saveHabit = useAppStore((state) => state.saveHabit);
  const [draft, setDraft] = useState(createDefaultDraft(format(new Date(), 'yyyy-MM-dd')));

  return (
    <ScreenShell title="New habit" subtitle="Create the core unit that powers daily tracking, history, analytics, and reminders.">
      <HabitForm draft={draft} onChange={setDraft} />
      <PrimaryButton
        label="Save habit"
        onPress={async () => {
          const habit = await saveHabit(draft);
          router.replace(`/habit/${habit.id}`);
        }}
      />
    </ScreenShell>
  );
}
