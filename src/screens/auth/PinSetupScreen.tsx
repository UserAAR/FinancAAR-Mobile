import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBiometric } from '../../hooks/useBiometric';
import { useAlert } from '../../hooks/useNotification';
import { database } from '../../utils/database';
import { CardAccount } from '../../types';

type SetupStep = 'name' | 'pin' | 'confirm' | 'biometric' | 'cash' | 'cards';

export default function PinSetupScreen() {
  const { theme } = useTheme();
  const { setupPin, updateAuthSettings, authenticateWithPin } = useAuth();
  const biometric = useBiometric();
  const alert = useAlert();
  
  const [step, setStep] = useState<SetupStep>('name');
  const [isLoading, setIsLoading] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  
  // Form data
  const [userName, setUserName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [cardColor, setCardColor] = useState('#00D2AA');
  const [cardLastDigits, setCardLastDigits] = useState('');
  const [biometricPreference, setBiometricPreference] = useState(false);

  // Prevent navigation during setup
  useEffect(() => {
    return () => {
      if (!isSetupComplete) {
        // Cleanup if component unmounts during setup
      }
    };
  }, [isSetupComplete]);

  const handleNameNext = () => {
    if (userName.trim().length < 2) {
      alert.error('Invalid Name', 'Please enter a valid name (at least 2 characters)');
      return;
    }
    setStep('pin');
  };

  const handlePinNext = () => {
    if (pin.length < 4) {
      alert.error('PIN Too Short', 'PIN must be at least 4 digits');
      return;
    }
    setStep('confirm');
  };

  const handleConfirmNext = () => {
    if (pin !== confirmPin) {
      alert.error('PIN Mismatch', 'PINs do not match. Please try again.');
      return;
    }
    setStep('biometric');
  };

  const handleBiometricChoice = async (useBiometric: boolean) => {
    try {
      setIsLoading(true);
      
      // Don't setup PIN yet - just save the biometric preference
      // We'll setup everything at the end to prevent navigation issues
      
      // Store biometric preference for later use
      setBiometricPreference(useBiometric);
      
      setStep('cash');
    } catch (error) {
      alert.error('Setup Error', 'Failed to setup account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCashNext = async () => {
    const amount = parseFloat(cashAmount) || 0;
    
    try {
      setIsLoading(true);
      
      // Create cash account with the specified amount
      await database.createAccount({
        name: 'Main Cash',
        balance: amount,
        type: 'cash',
        emoji: '💰',
      });
      
      setStep('cards');
    } catch (error) {
      alert.error('Cash Setup Failed', 'Failed to setup cash account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardNext = async () => {
    try {
      setIsLoading(true);
      
      // Create card if user entered details
      if (cardName.trim()) {
        const amount = parseFloat(cardAmount) || 0;
        
        const cardAccountData: Omit<CardAccount, 'id' | 'createdAt' | 'updatedAt'> = {
          name: cardName.trim(),
          balance: amount,
          type: 'card',
          color: cardColor,
          lastFourDigits: cardLastDigits || undefined,
        };
        
        await database.createAccount(cardAccountData);
      }
      
      // Now setup PIN and complete the setup process
      await setupPin(pin, userName.trim(), false);
      
      // Enable biometric if user chose to
      if (biometricPreference && biometric.canUseBiometric) {
        try {
          await updateAuthSettings({ biometricEnabled: true });
        } catch (error) {
          console.log('Biometric setup failed, continuing without it');
        }
      }
      
      // Mark setup as complete in database
      database.setSetupCompleted();
      
      // Mark setup as complete in context
      setIsSetupComplete(true);
      
      // Finally authenticate user to enter the app
      await authenticateWithPin(pin);
    } catch (error) {
      alert.error('Setup Failed', 'Failed to complete setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipCards = () => {
    // Skip card setup and complete
    handleCardNext();
  };

  const cardColors = [
    '#00D2AA', '#FF6B6B', '#4ECDC4', '#45B7D1', 
    '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFB347'
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
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
    secondaryButton: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      alignItems: 'center',
      marginTop: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    secondaryButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    backButton: {
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    backButtonText: {
      color: theme.colors.primary,
      fontSize: 16,
    },
    biometricContainer: {
      alignItems: 'center',
      marginVertical: theme.spacing.xl,
    },
    biometricIcon: {
      marginBottom: theme.spacing.md,
    },
    biometricText: {
      fontSize: 18,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    colorContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginVertical: theme.spacing.md,
    },
    colorOption: {
      width: 40,
      height: 40,
      borderRadius: 20,
      margin: theme.spacing.xs,
      borderWidth: 3,
      borderColor: 'transparent',
    },
    selectedColor: {
      borderColor: theme.colors.text,
    },
    stepIndicator: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    stepDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.xs,
    },
    activeStepDot: {
      backgroundColor: theme.colors.primary,
    },
    completedStepDot: {
      backgroundColor: theme.colors.success,
    },
  });

  const getStepNumber = () => {
    const steps = ['name', 'pin', 'confirm', 'biometric', 'cash', 'cards'];
    return steps.indexOf(step) + 1;
  };

  const renderStepIndicator = () => {
    const totalSteps = 6;
    const currentStep = getStepNumber();
    
    return (
      <View style={styles.stepIndicator}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <View
            key={index}
            style={[
              styles.stepDot,
              index + 1 === currentStep && styles.activeStepDot,
              index + 1 < currentStep && styles.completedStepDot,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderNameStep = () => (
    <>
      <Text style={styles.title}>Welcome to FinancAAR</Text>
      <Text style={styles.subtitle}>What should we call you?</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        placeholderTextColor={theme.colors.textSecondary}
        value={userName}
        onChangeText={setUserName}
        autoCapitalize="words"
        autoComplete="name"
      />
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleNameNext}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </>
  );

  const renderPinStep = () => (
    <>
      <Text style={styles.title}>Create Your PIN</Text>
      <Text style={styles.subtitle}>Enter a 4-6 digit PIN to secure your app</Text>
      <TextInput
        style={styles.pinInput}
        placeholder="Enter PIN"
        placeholderTextColor={theme.colors.textSecondary}
        value={pin}
        onChangeText={setPin}
        keyboardType="numeric"
        secureTextEntry
        maxLength={6}
      />
      <TouchableOpacity 
        style={styles.button} 
        onPress={handlePinNext}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep('name')}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </>
  );

  const renderConfirmStep = () => (
    <>
      <Text style={styles.title}>Confirm Your PIN</Text>
      <Text style={styles.subtitle}>Re-enter your PIN to confirm</Text>
      <TextInput
        style={styles.pinInput}
        placeholder="Confirm PIN"
        placeholderTextColor={theme.colors.textSecondary}
        value={confirmPin}
        onChangeText={setConfirmPin}
        keyboardType="numeric"
        secureTextEntry
        maxLength={pin.length}
      />
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleConfirmNext}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep('pin')}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </>
  );

  const renderBiometricStep = () => (
    <>
      <Text style={styles.title}>Secure Your App</Text>
      <Text style={styles.subtitle}>
        Would you like to use {biometric.getBiometricName()} for quick access?
      </Text>
      
      <View style={styles.biometricContainer}>
        <Ionicons 
          name="finger-print" 
          size={64} 
          color={theme.colors.primary}
          style={styles.biometricIcon}
        />
        <Text style={styles.biometricText}>
          Enable {biometric.getBiometricName()} for faster and more secure login
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => handleBiometricChoice(true)}
        disabled={isLoading || !biometric.canUseBiometric}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Setting up...' : `Enable ${biometric.getBiometricName()}`}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.secondaryButton} 
        onPress={() => handleBiometricChoice(false)}
        disabled={isLoading}
      >
        <Text style={styles.secondaryButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </>
  );

  const renderCashStep = () => (
    <>
      <Text style={styles.title}>Setup Your Cash</Text>
      <Text style={styles.subtitle}>How much cash do you currently have?</Text>
      
      <TextInput
        style={styles.input}
        placeholder="0.00"
        placeholderTextColor={theme.colors.textSecondary}
        value={cashAmount}
        onChangeText={setCashAmount}
        keyboardType="numeric"
      />
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleCashNext}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Setting up...' : 'Continue'}
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderCardsStep = () => (
    <>
      <Text style={styles.title}>Add a Card</Text>
      <Text style={styles.subtitle}>Would you like to add a credit/debit card?</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Card name (e.g., Visa Card)"
        placeholderTextColor={theme.colors.textSecondary}
        value={cardName}
        onChangeText={setCardName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Current balance"
        placeholderTextColor={theme.colors.textSecondary}
        value={cardAmount}
        onChangeText={setCardAmount}
        keyboardType="numeric"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Last 4 digits (optional)"
        placeholderTextColor={theme.colors.textSecondary}
        value={cardLastDigits}
        onChangeText={setCardLastDigits}
        keyboardType="numeric"
        maxLength={4}
      />

      <Text style={[styles.subtitle, { marginTop: theme.spacing.md }]}>Choose card color:</Text>
      <View style={styles.colorContainer}>
        {cardColors.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              cardColor === color && styles.selectedColor,
            ]}
            onPress={() => setCardColor(color)}
          />
        ))}
      </View>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleCardNext}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Creating...' : 'Add Card'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.secondaryButton} 
        onPress={handleSkipCards}
        disabled={isLoading}
      >
        <Text style={styles.secondaryButtonText}>Skip - Add Later</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {renderStepIndicator()}
        
        {step === 'name' && renderNameStep()}
        {step === 'pin' && renderPinStep()}
        {step === 'confirm' && renderConfirmStep()}
        {step === 'biometric' && renderBiometricStep()}
        {step === 'cash' && renderCashStep()}
        {step === 'cards' && renderCardsStep()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
} 