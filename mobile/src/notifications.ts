import * as Notifications from "expo-notifications";

export async function ensureNotificationPermissions() {
  const settings = await Notifications.getPermissionsAsync();
  if (!settings.granted) {
    const request = await Notifications.requestPermissionsAsync();
    return request.granted;
  }
  return true;
}

export async function scheduleDailyReminder() {
  const granted = await ensureNotificationPermissions();
  if (!granted) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "How are you feeling tonight?",
      body: "Capture a quick reflection in Echo."
    },
    trigger: {
      hour: 20,
      minute: 0,
      repeats: true
    }
  });
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
