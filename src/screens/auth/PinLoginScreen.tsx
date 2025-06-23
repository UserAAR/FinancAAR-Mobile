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
  const { authenticateWithPin, authenticateWithBiometric, authState, biometricState, userPreferences } = useAuth();
  const alert = useAlert();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [showPinKeypad, setShowPinKeypad] = useState(false);
  const [biometricTriggered, setBiometricTriggered] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // No auto-start useEffect - user chooses manually

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
      if (!result.success) {
        setIsScanning(false);
      }
    } catch (error) {
      setIsScanning(false);
    }
  };

  const handleUsePinInstead = () => {
    setIsScanning(false);
    setShowPinKeypad(true);
  };

  const handleUseBiometricInstead = () => {
    setShowPinKeypad(false);
    setIsScanning(true);
    setBiometricTriggered(true);
    handleBiometricAuth();
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
    topSectionCompact: {
      flex: 0.6,
      paddingTop: theme.spacing.xl + 20,
    },
    welcomeSection: {
      alignItems: 'center',
      marginBottom: theme.spacing.xxl,
    },
    welcomeSectionCompact: {
      marginBottom: theme.spacing.lg,
    },
    greetingContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    greetingContainerCompact: {
      marginBottom: theme.spacing.md,
    },
    welcomeText: {
      fontSize: 30,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      letterSpacing: 0.6,
    },
    welcomeTextCompact: {
      fontSize: 26,
      marginBottom: theme.spacing.xs,
    },
    userName: {
      fontSize: 34,
      fontWeight: '600',
      color: theme.colors.primary,
      textAlign: 'center',
      letterSpacing: 0.4,
    },
    userNameCompact: {
      fontSize: 30,
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
    bottomSectionExpanded: {
      flex: 1,
      justifyContent: 'center',
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
    biometricButtonScanning: {
      backgroundColor: theme.colors.success + '15',
      borderColor: theme.colors.success + '30',
    },
    biometricText: {
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: '500',
    },
    biometricTextScanning: {
      color: theme.colors.success,
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
    biometricMainContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
    },
    biometricTitle: {
      color: theme.colors.primary,
      fontSize: 22,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    biometricSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      fontWeight: '400',
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
    },
    biometricMainButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primary + '15',
      borderWidth: 2,
      borderColor: theme.colors.primary + '30',
      marginBottom: theme.spacing.xl,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    pinAlternativeButton: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: theme.colors.primary,
      borderRadius: theme.borderRadius.xl,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      alignItems: 'center',
    },
    pinAlternativeText: {
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    pinOnlyContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    pinOnlyContainerCentered: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleCentered: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: theme.spacing.xl,
    },
    pinOnlySubtitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.textSecondary,
      textAlign: 'center',
      letterSpacing: 0.2,
      opacity: 0.9,
    },
  });

  return (
    <View style={styles.container}>
      {/* Top Section - Beautiful Welcome */}
      <View style={[
        styles.topSection,
        !isScanning && styles.topSectionCompact
      ]}>
        <View style={[
          styles.welcomeSection,
          !isScanning && styles.welcomeSectionCompact
        ]}>
          <View style={[
            styles.greetingContainer,
            !isScanning && styles.greetingContainerCompact
          ]}>
            <Text style={[
              styles.welcomeText,
              !isScanning && styles.welcomeTextCompact
            ]}>
              Welcome back,
            </Text>
            {authState.userName ? (
              <Text style={[
                styles.userName,
                !isScanning && styles.userNameCompact
              ]}>
                {authState.userName}!
              </Text>
            ) : (
              <Text style={[
                styles.userName,
                !isScanning && styles.userNameCompact
              ]}>
                Friend!
              </Text>
            )}
          </View>
          
          {/* Add subtitle for PIN-only mode */}
          {!isScanning && (
            <Text style={styles.pinOnlySubtitle}>
              Ready to manage your finances?
            </Text>
          )}
        </View>
      </View>

      {/* Bottom Section - Authentication */}
      <View style={[
        styles.bottomSection,
        styles.bottomSectionExpanded
      ]}>
        {/* Always show combined PIN + Fingerprint interface */}
        
        {/* PIN Section */}
        <View style={styles.pinSection}>
          <Text style={styles.title}>
            Choose your authentication method
          </Text>
          
          {/* PIN Input - Show only when user chooses PIN */}
          {showPinKeypad && (
            <>
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
                  autoFocus={true}
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
            </>
          )}
          
          {/* PIN Button - Show when PIN keypad is hidden */}
          {!showPinKeypad && (
            <TouchableOpacity 
              style={styles.button}
              onPress={handleUsePinInstead}
            >
              <Text style={styles.buttonText}>Use PIN</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
        
        {/* Biometric Section */}
        <View style={styles.biometricContainer}>
          <TouchableOpacity 
            style={[
              styles.biometricButton,
              isScanning && styles.biometricButtonScanning
            ]} 
            onPress={handleUseBiometricInstead}
          >
            <Ionicons 
              name="finger-print" 
              size={32} 
              color={isScanning ? theme.colors.success : theme.colors.primary} 
            />
          </TouchableOpacity>
          <Text style={[
            styles.biometricText,
            isScanning && styles.biometricTextScanning
          ]}>
            {isScanning ? `Scanning ${biometricState.getBiometricName()}...` : `Use ${biometricState.getBiometricName()}`}
          </Text>
        </View>

        {attempts > 0 && (
          <Text style={styles.attemptsText}>
            ⚠️ Failed attempts: {attempts}/3
          </Text>
        )}
      </View>
    </View>
  );
} 