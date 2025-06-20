import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../hooks/useNotification';

export default function PinLoginScreen() {
  const { theme } = useTheme();
  const { authenticateWithPin, authenticateWithBiometric, authState, biometricState } = useAuth();
  const alert = useAlert();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    // Auto-trigger biometric authentication if enabled
    if (authState.biometricEnabled && biometricState.canUseBiometric) {
      handleBiometricAuth();
    }
  }, []);

  const handlePinSubmit = async () => {
    if (pin.length < 4) {
      alert.error('Incomplete PIN', 'Please enter your complete PIN');
      return;
    }

    try {
      setIsLoading(true);
      const isValid = await authenticateWithPin(pin);
      
      if (!isValid) {
        setAttempts(prev => prev + 1);
        setPin('');
        Vibration.vibrate(500);
        
        if (attempts >= 2) {
          alert.warning(
            'Too Many Attempts',
            'You have entered an incorrect PIN multiple times. Please try again later.'
          );
        } else {
          alert.error('Incorrect PIN', 'Please try again.');
        }
      }
    } catch (error) {
      alert.error('Authentication Failed', 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const result = await authenticateWithBiometric();
      if (!result.success && result.error) {
        console.log('Biometric auth failed:', result.error);
      }
    } catch (error) {
      console.log('Biometric auth error:', error);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    welcomeText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    userName: {
      fontSize: 18,
      color: theme.colors.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    pinInput: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 20,
      color: theme.colors.text,
      textAlign: 'center',
      letterSpacing: 4,
      marginBottom: theme.spacing.md,
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    biometricButton: {
      alignItems: 'center',
      marginTop: theme.spacing.lg,
      padding: theme.spacing.md,
    },
    biometricText: {
      color: theme.colors.primary,
      fontSize: 14,
      marginTop: theme.spacing.sm,
    },
    attemptsText: {
      color: theme.colors.error,
      fontSize: 14,
      textAlign: 'center',
      marginTop: theme.spacing.md,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome back</Text>
      {authState.userName && (
        <Text style={styles.userName}>{authState.userName}</Text>
      )}
      
      <Text style={styles.title}>Enter your PIN</Text>
      
      <TextInput
        style={styles.pinInput}
        placeholder="Enter PIN"
        placeholderTextColor={theme.colors.textSecondary}
        value={pin}
        onChangeText={setPin}
        keyboardType="numeric"
        secureTextEntry
        maxLength={authState.pinLength}
        onSubmitEditing={handlePinSubmit}
      />
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handlePinSubmit}
        disabled={isLoading || pin.length < 4}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Authenticating...' : 'Login'}
        </Text>
      </TouchableOpacity>

      {authState.biometricEnabled && biometricState.canUseBiometric && (
        <TouchableOpacity 
          style={styles.biometricButton} 
          onPress={handleBiometricAuth}
        >
          <Ionicons 
            name="finger-print" 
            size={32} 
            color={theme.colors.primary} 
          />
          <Text style={styles.biometricText}>
            Use {biometricState.getBiometricName()}
          </Text>
        </TouchableOpacity>
      )}

      {attempts > 0 && (
        <Text style={styles.attemptsText}>
          Failed attempts: {attempts}/3
        </Text>
      )}
    </View>
  );
} 