import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Force notifications to show natively even if the app is purely in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false, // No sound so we can "tick" it silently
    shouldSetBadge: false,
  }),
});

export const requestNotificationPermissions = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
};

export const updateWorkoutNotification = async (title: string, body: string) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: false, // Enforce no buzzing upon update
    },
    trigger: null, // Fire/Update instantly
    identifier: 'active-workout-tracker', // Matching ID prevents spam stacking
  });
};

export const clearWorkoutNotification = async () => {
  try {
    await Notifications.cancelScheduledNotificationAsync('active-workout-tracker');
    await Notifications.dismissNotificationAsync('active-workout-tracker');
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
        },
        trigger: { date: triggerDate } as any,
        identifier: 'gym-day-reminder'
    });
};

export const cancelScheduledGymDayNotifications = async () => {
    try {
        await Notifications.cancelScheduledNotificationAsync('gym-day-reminder');
    } catch(e) {}
};
