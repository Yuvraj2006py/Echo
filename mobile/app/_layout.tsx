import { Stack } from "expo-router";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

export default function RootLayout() {
  useEffect(() => {
    (async () => {
      await Notifications.requestPermissionsAsync();
    })();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade"
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="journal" />
      <Stack.Screen name="insights" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
