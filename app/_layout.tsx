import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Disable Expo's LogBox error overlay to prevent duplicate error messages
// This suppresses the bottom error overlay while keeping our custom toast at the top
LogBox.ignoreAllLogs(); // Ignore all log notifications

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
      <FlashMessage 
        position="top" 
        floating={true}
        statusBarHeight={50}
      />
    </ThemeProvider>
  );
}
