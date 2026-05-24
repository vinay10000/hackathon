import { router } from 'expo-router';

import { EmptyState } from '@/src/components/empty-state';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { useArchivedHabits } from '@/src/store/app-store';

export default function ArchiveScreen() {
  const archived = useArchivedHabits();

  return (
    <ScreenShell title="Archived habits" subtitle="Archive preserves history while keeping the active dashboard focused.">
      {archived.length ? archived.map((habit) => <PrimaryButton key={habit.id} label={habit.name} tone="secondary" onPress={() => router.push(`/habit/${habit.id}`)} />) : <EmptyState title="Nothing archived" subtitle="Archived habits will appear here without losing their streak and history records." />}
    </ScreenShell>
  );
}
