import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Navigators
import AppNavigator from './AppNavigator';

// Auth Screens
import PinSetupScreen from '../screens/auth/PinSetupScreen';
import PinLoginScreen from '../screens/auth/PinLoginScreen';

export type RootStackParamList = {
  PinSetup: undefined;
  PinLogin: undefined;
  App: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { authState, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return null; // Could add a loading screen here
  }

  return (
    <NavigationContainer
      theme={{
        dark: theme.mode === 'dark',
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.primary,
        },
        fonts: {
          regular: {
            fontFamily: 'System',
            fontWeight: 'normal',
          },
          medium: {
            fontFamily: 'System',
            fontWeight: '500',
          },
          bold: {
            fontFamily: 'System',
            fontWeight: 'bold',
          },
          heavy: {
            fontFamily: 'System',
            fontWeight: '900',
          },
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {!authState.pinSet ? (
          <Stack.Screen name="PinSetup" component={PinSetupScreen} />
        ) : !authState.isAuthenticated ? (
          <Stack.Screen name="PinLogin" component={PinLoginScreen} />
        ) : (
          <Stack.Screen name="App" component={AppNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}