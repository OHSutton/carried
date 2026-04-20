import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const GYM_DAY_REMINDER_KEY = 'gym_day_reminder_notification_id';
const REST_TIMER_REMINDER_KEY = 'rest_timer_notification_id';

// Force notifications to show natively even if the app is purely in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false, // No sound so we can "tick" it silently
    shouldSetBadge: false,
  }),
});

const ensureNotificationChannel = async () => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#00E5FF',
    sound: 'default',
  });
};

const getStoredNotificationId = async (storageKey: string) => {
  const item = await Notifications.getAllScheduledNotificationsAsync();
  const match = item.find((notification) => notification.content.data?.storageKey === storageKey);
  return match?.identifier ?? null;
};

const cancelStoredNotification = async (storageKey: string) => {
  const existingId = await getStoredNotificationId(storageKey);
  if (!existingId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(existingId);
  } catch (e) {}
};

export const requestNotificationPermissions = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus === 'granted') {
    await ensureNotificationChannel();
  }
  return finalStatus === 'granted';
};

export const updateWorkoutNotification = async (title: string, body: string) => {
  // Expo local notifications cannot reliably behave like a single mutable
  // "live activity" entry across foreground ticks, and scheduling them every
  // second causes notification spam. We keep real scheduled reminders for
  // rest completion and gym-day prompts instead.
  return;
};

export const clearWorkoutNotification = async () => {
  try {
    const existingId = await getStoredNotificationId('active-workout-tracker');
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId);
      await Notifications.dismissNotificationAsync(existingId);
    }
  } catch (e) {
    console.error('Failed to dismiss notification:', e);
  }
};

export const scheduleGymDayNotification = async (title: string, body: string, triggerDate: Date) => {
    const hasPerm = await requestNotificationPermissions();
    if (!hasPerm) return;

    // Clear previous scheduled
    await cancelScheduledGymDayNotifications();

    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            sound: true,
            data: { storageKey: GYM_DAY_REMINDER_KEY },
        },
        trigger: { date: triggerDate } as any,
    });
};

export const cancelScheduledGymDayNotifications = async () => {
    try {
        await cancelStoredNotification(GYM_DAY_REMINDER_KEY);
    } catch(e) {}
};

export const scheduleRestTimerNotification = async (title: string, body: string, seconds: number) => {
  const hasPerm = await requestNotificationPermissions();
  if (!hasPerm || seconds <= 0) return;

  await cancelRestTimerNotification();

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { storageKey: REST_TIMER_REMINDER_KEY },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds } as any,
  });
};

export const cancelRestTimerNotification = async () => {
  try {
    await cancelStoredNotification(REST_TIMER_REMINDER_KEY);
  } catch (e) {}
};
