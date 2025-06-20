import { useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

interface BiometricState {
  isAvailable: boolean;
  supportedTypes: string[];
  isEnrolled: boolean;
  canUseBiometric: boolean;
}

export function useBiometric() {
  const [state, setState] = useState<BiometricState>({
    isAvailable: false,
    supportedTypes: [],
    isEnrolled: false,
    canUseBiometric: false,
  });

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      // Convert supported types to readable strings
      const typeStrings = supportedTypes.map(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'FINGERPRINT';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'FACIAL_RECOGNITION';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'IRIS';
          default:
            return 'UNKNOWN';
        }
      });

      const canUseBiometric = isAvailable && isEnrolled && supportedTypes.length > 0;

      setState({
        isAvailable,
        supportedTypes: typeStrings,
        isEnrolled,
        canUseBiometric,
      });
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setState({
        isAvailable: false,
        supportedTypes: [],
        isEnrolled: false,
        canUseBiometric: false,
      });
    }
  };

  const authenticateWithBiometric = async (): Promise<{
    success: boolean;
    error?: string;
    warning?: string;
  }> => {
    try {
      if (!state.canUseBiometric) {
        return {
          success: false,
          error: 'Biometric authentication is not available',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate with your biometric',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: true, // We want to handle PIN ourselves
      });

      if (result.success) {
        return { success: true };
      } else {
        // Use more generic error handling since specific error types are not available
        let errorMessage = 'Authentication failed';
        
        if (result.error && typeof result.error === 'string') {
          errorMessage = result.error;
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      
      // Handle specific error codes if they exist
      let errorMessage = 'An unexpected error occurred during authentication';
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        errorMessage = 'Authentication was cancelled';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const getBiometricName = (): string => {
    if (state.supportedTypes.includes('FINGERPRINT')) {
      return 'Fingerprint';
    } else if (state.supportedTypes.includes('FACIAL_RECOGNITION')) {
      return 'Face ID';
    } else if (state.supportedTypes.includes('IRIS')) {
      return 'Iris';
    } else {
      return 'Biometric';
    }
  };

  const enableBiometric = async (): Promise<void> => {
    // Check if biometric is available before enabling
    if (!state.canUseBiometric) {
      throw new Error('Biometric authentication is not available');
    }
    // This is mainly a validation function since the actual enabling is handled in AuthContext
  };

  const disableBiometric = async (): Promise<void> => {
    // This is mainly a validation function since the actual disabling is handled in AuthContext
  };

  const checkDeviceSecurityLevel = async (): Promise<{
    hasDevicePasscode: boolean;
    securityLevel: LocalAuthentication.SecurityLevel;
  }> => {
    try {
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
      const hasDevicePasscode = securityLevel !== LocalAuthentication.SecurityLevel.NONE;

      return {
        hasDevicePasscode,
        securityLevel,
      };
    } catch (error) {
      console.error('Error checking device security level:', error);
      return {
        hasDevicePasscode: false,
        securityLevel: LocalAuthentication.SecurityLevel.NONE,
      };
    }
  };

  return {
    ...state,
    authenticate: authenticateWithBiometric,
    refresh: checkBiometricAvailability,
    getBiometricName,
    checkDeviceSecurityLevel,
    enable: enableBiometric,
    disable: disableBiometric,
  };
}

// Helper function to check if biometric is supported on the platform
export const isBiometricSupported = (): boolean => {
  // Biometric authentication is supported on iOS and Android
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

// Helper function to get biometric prompt text based on platform
export const getBiometricPromptText = (biometricName: string): {
  promptMessage: string;
  subtitle: string;
} => {
  return {
    promptMessage: `Unlock with ${biometricName}`,
    subtitle: `Use your ${biometricName.toLowerCase()} to access FinancAAR securely`,
  };
}; 