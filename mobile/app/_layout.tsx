import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: "#111827",
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: "#f5f7fb" },
      }}
    >
      <Stack.Screen name="login" options={{ title: "Sign in" }} />
      <Stack.Screen name="index" options={{ title: "Agreements" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="cases/[caseId]" options={{ title: "Agreement Review" }} />
      <Stack.Screen name="cases/[caseId]/chat" options={{ title: "Case Chat" }} />
    </Stack>
  );
}
