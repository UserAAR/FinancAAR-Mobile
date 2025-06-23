import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

// Screens
import HomeScreen from '../screens/HomeScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import AIAnalysisScreen from '../screens/AIAnalysisScreen';
import DebtsScreen from '../screens/DebtsScreen';
import DebtDetailScreen from '../screens/DebtDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type TabParamList = {
  Home: undefined;
  AddTransaction: undefined;
  Transactions: undefined;
  AnalyticsStack: undefined;
  DebtsStack: undefined;
  Settings: undefined;
};

export type AnalyticsStackParamList = {
  Analytics: undefined;
  AIAnalysis: undefined;
};

export type DebtsStackParamList = {
  Debts: undefined;
  DebtDetail: { debtId: string };
};

const Tab = createBottomTabNavigator<TabParamList>();
const AnalyticsStack = createStackNavigator<AnalyticsStackParamList>();
const DebtsStack = createStackNavigator<DebtsStackParamList>();

function AnalyticsStackNavigator() {
  return (
    <AnalyticsStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AnalyticsStack.Screen name="Analytics" component={AnalyticsScreen} />
      <AnalyticsStack.Screen name="AIAnalysis" component={AIAnalysisScreen} />
    </AnalyticsStack.Navigator>
  );
}

function DebtsStackNavigator() {
  return (
    <DebtsStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <DebtsStack.Screen name="Debts" component={DebtsScreen} />
      <DebtsStack.Screen name="DebtDetail" component={DebtDetailScreen} />
    </DebtsStack.Navigator>
  );
}

function AppNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'AddTransaction') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Transactions') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'AnalyticsStack') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'DebtsStack') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTitleStyle: {
          color: theme.colors.text,
          fontSize: 18,
          fontWeight: '600',
        },
        headerTintColor: theme.colors.text,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{
          tabBarLabel: 'Add',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="AnalyticsStack"
        component={AnalyticsStackNavigator}
        options={{
          tabBarLabel: 'Analytics',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="DebtsStack"
        component={DebtsStackNavigator}
        options={{
          tabBarLabel: 'Debts',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

export default AppNavigator; 