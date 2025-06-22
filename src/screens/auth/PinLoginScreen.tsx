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
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // Auto-trigger biometric authentication if enabled with a small delay
    if (authState.biometricEnabled && biometricState.canUseBiometric) {
      setTimeout(() => {
        handleBiometricAuth();
      }, 500);
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
    },
    topSection: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
    },

    welcomeSection: {
      alignItems: 'center',
      marginBottom: theme.spacing.xxl,
    },
    greetingContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    welcomeText: {
      fontSize: 30,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      letterSpacing: 0.6,
    },
    userName: {
      fontSize: 34,
      fontWeight: '600',
      color: theme.colors.primary,
      textAlign: 'center',
      letterSpacing: 0.4,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.textSecondary,
      textAlign: 'center',
      letterSpacing: 0.2,
      opacity: 0.9,
    },
    bottomSection: {
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.xl * 2,
    },
    pinSection: {
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: 18,
      fontWeight: '500',
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    pinInputContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 2,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    pinInputFocused: {
      borderColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOpacity: 0.2,
    },
    pinInput: {
      padding: theme.spacing.lg,
      fontSize: 22,
      color: theme.colors.text,
      textAlign: 'center',
      letterSpacing: 8,
      fontWeight: '600',
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.lg,
      alignItems: 'center',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
      marginBottom: theme.spacing.lg,
    },
    buttonDisabled: {
      backgroundColor: theme.colors.textSecondary,
      shadowOpacity: 0.1,
    },
    buttonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    biometricContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
    },
    biometricButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary + '15',
      borderWidth: 2,
      borderColor: theme.colors.primary + '30',
      marginBottom: theme.spacing.md,
    },
    biometricText: {
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: '500',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      marginHorizontal: theme.spacing.md,
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    attemptsText: {
      color: theme.colors.error,
      fontSize: 14,
      textAlign: 'center',
      marginTop: theme.spacing.md,
      fontWeight: '500',
    },
  });

  return (
    <View style={styles.container}>
      {/* Top Section - Beautiful Welcome */}
      <View style={styles.topSection}>
        <View style={styles.welcomeSection}>
          <View style={styles.greetingContainer}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            {authState.userName ? (
              <Text style={styles.userName}>{authState.userName}!</Text>
            ) : (
              <Text style={styles.userName}>Friend!</Text>
            )}
          </View>

        </View>
      </View>

      {/* Bottom Section - Authentication */}
      <View style={styles.bottomSection}>
        <View style={styles.pinSection}>
          <Text style={styles.title}>Enter your PIN to continue</Text>
          
          <View style={[
            styles.pinInputContainer,
            (isFocused || pin.length > 0) && styles.pinInputFocused
          ]}>
            <TextInput
              style={styles.pinInput}
              placeholder={'•'.repeat(authState.pinLength)}
              placeholderTextColor={theme.colors.textSecondary + '60'}
              value={pin}
              onChangeText={setPin}
              keyboardType="numeric"
              secureTextEntry
              maxLength={authState.pinLength}
              onSubmitEditing={handlePinSubmit}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoFocus={!(authState.biometricEnabled && biometricState.canUseBiometric)}
            />
          </View>
          
          <TouchableOpacity 
            style={[
              styles.button,
              (isLoading || pin.length < authState.pinLength) && styles.buttonDisabled
            ]} 
            onPress={handlePinSubmit}
            disabled={isLoading || pin.length < authState.pinLength}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Authenticating...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Biometric Authentication */}
        {authState.biometricEnabled && biometricState.canUseBiometric && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
            
            <View style={styles.biometricContainer}>
              <TouchableOpacity 
                style={styles.biometricButton} 
                onPress={handleBiometricAuth}
              >
                <Ionicons 
                  name="finger-print" 
                  size={24} 
                  color={theme.colors.primary} 
                />
              </TouchableOpacity>
              <Text style={styles.biometricText}>
                Use {biometricState.getBiometricName()}
              </Text>
            </View>
          </>
        )}

        {attempts > 0 && (
          <Text style={styles.attemptsText}>
            ⚠️ Failed attempts: {attempts}/3
          </Text>
        )}
      </View>
    </View>
  );
} 