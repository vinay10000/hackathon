import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { Habit } from '@/src/types/habits';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationAccess() {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) {
    return 'granted' as const;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted ? ('granted' as const) : ('denied' as const);
}

export async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('habit-reminders', {
    name: 'Habit reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function syncHabitReminderNotifications(habit: Habit) {
  const reminder = habit.reminders[0];
  if (!reminder?.enabled) {
    return [];
  }

  await ensureNotificationChannel();
  const ids: string[] = [];
  const [hour, minute] = reminder.time.split(':').map(Number);

  if (habit.schedule.kind === 'weekdays') {
    for (const weekday of habit.schedule.weekdays) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time for ${habit.name}`,
          body: habit.motivationalNote || 'Keep your streak alive today.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: weekday + 1,
          hour,
          minute,
          channelId: 'habit-reminders',
        },
      });
      ids.push(id);
    }
    return ids;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Time for ${habit.name}`,
      body: habit.motivationalNote || 'Keep your streak alive today.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'habit-reminders',
    },
  });

  ids.push(id);
  return ids;
}

export async function clearNotificationIds(notificationIds: string[]) {
  await Promise.all(notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

export function canScheduleNotifications() {
  return Device.isDevice;
}
