import { Stack } from "expo-router";
import { AuthProvider } from "../lib/auth-context";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="create-account" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="create-household" />
        <Stack.Screen name="join-household" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}
