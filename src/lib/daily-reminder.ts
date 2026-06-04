import { clearNotificationIds, ensureNotificationChannel } from '@/src/lib/notifications';

import * as Notifications from 'expo-notifications';

export async function rescheduleDailyReminder(previousIds: string[], time: string, enabled: boolean) {
  if (previousIds.length) {
    await clearNotificationIds(previousIds);
  }

  if (!enabled) {
    return [];
  }

  await ensureNotificationChannel();
  const [hour, minute] = time.split(':').map(Number);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'HabitAI daily reminder',
      body: 'Open HabitAI and keep your streak alive today.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'habit-reminders',
    },
  });

  return [id];
}
