import React, { createContext, useContext, useEffect, useReducer, useState, ReactNode, useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import { useSecureStorage, storeObject, getObject } from '../hooks/useSecureStorage';
import { useBiometric } from '../hooks/useBiometric';
import { database } from '../utils/database';

// Best Practice: Separate types for different concerns
interface AuthState {
  isAuthenticated: boolean;
  pinSet: boolean;
  userName: string;
  pinLength: 4 | 6;
  biometricEnabled: boolean;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultCurrency: string;
  notifications: boolean;
  pinLength: 4 | 6;
  biometricEnabled: boolean;
}

// Best Practice: Simplified AppSettings for non-critical data only
interface AppSettings {
  lastSyncDate?: string;
  appVersion?: string;
  // Keep only non-critical, runtime-specific settings here
}

interface AuthContextType {
  authState: AuthState;
  userPreferences: UserPreferences;
  isLoading: boolean;
  
  // Authentication methods
  setupPin: (pin: string, userName: string, authenticate?: boolean) => Promise<void>;
  authenticateWithPin: (pin: string) => Promise<boolean>;
  changePin: (currentPin: string, newPin: string) => Promise<boolean>;
  authenticateWithBiometric: () => Promise<{ success: boolean; error?: string }>;
  
  // User preferences methods (Best Practice: Direct DB access)
  updateUserPreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  updateUserName: (name: string) => Promise<void>;
  
  // Setup methods
  completeSetup: () => void;
  
  // Logout and reset
  logout: () => void;
  resetApp: () => Promise<void>;
  
  // Biometric state
  biometricState: {
    isAvailable: boolean;
    canUseBiometric: boolean;
    getBiometricName: () => string;
  };
}

const defaultAuthState: AuthState = {
  isAuthenticated: false,
  pinSet: false,
  userName: '',
  pinLength: 4,
  biometricEnabled: false,
};

const defaultUserPreferences: UserPreferences = {
  theme: 'system',
  defaultCurrency: '₼',
  notifications: true,
  pinLength: 4,
  biometricEnabled: false,
};

const defaultAppSettings: AppSettings = {
  lastSyncDate: new Date().toISOString(),
  appVersion: '2.1.0',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Best Practice: Separate state management
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(defaultUserPreferences);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);

  // Best Practice: Only PIN in secure storage (most critical security data)
  const [pinState, setPinStorage] = useSecureStorage('auth_pin');
  const biometric = useBiometric();

  const [pinLoading, storedPin] = pinState;

  // Best Practice: Initialize from database (persistent) and cache in memory
  useEffect(() => {
    if (!pinLoading) {
      initializeAuth();
    }
  }, [pinLoading]);

  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (isSetupInProgress) {
        return;
      }

      // Best Practice: Load all user data from database (persistent across app kills)
      const dbUserName = database.getUserName();
      const dbPreferences = database.getUserPreferences();
      
      // Best Practice: Cache in memory for performance
      setUserPreferences(dbPreferences);
      
      const setupCompleted = database.isSetupCompleted();
      
      setAuthState(prev => ({
        ...prev,
        userName: dbUserName || '',
        pinLength: dbPreferences.pinLength,
        biometricEnabled: dbPreferences.biometricEnabled,
        pinSet: !!storedPin && setupCompleted,
      }));

    } catch (error) {
      // Error handled silently for production
    } finally {
      setIsLoading(false);
    }
  }, [storedPin, isSetupInProgress]);

  const hashPin = async (pin: string): Promise<string> => {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );
  };

  const setupPin = async (pin: string, userName: string, authenticate: boolean = true): Promise<void> => {
    try {
      setIsSetupInProgress(true);
      
      const hashedPin = await hashPin(pin);
      
      // Best Practice: Critical security data in secure storage
      setPinStorage(hashedPin);

      // Best Practice: User data in database (persistent)
      database.setUserName(userName.trim());
      database.setUserPreferences({
        pinLength: pin.length as 4 | 6,
        biometricEnabled: false, // Default to false, user can enable later
      });

      // Best Practice: Update memory cache immediately
      const newPreferences = {
        ...userPreferences,
        pinLength: pin.length as 4 | 6,
      };
      setUserPreferences(newPreferences);

      setAuthState(prev => ({
        ...prev,
        pinSet: true,
        pinLength: pin.length as 4 | 6,
        userName: userName.trim(),
        isAuthenticated: authenticate,
        biometricEnabled: false,
      }));
      
    } catch (error) {
      // Error handled silently for production
      throw error;
    }
  };

  const completeSetup = (): void => {
    database.setSetupCompleted();
    setAuthState(prev => ({
      ...prev,
      pinSet: true,
    }));
    
    setIsSetupInProgress(false);
  };

  const authenticateWithPin = async (pin: string): Promise<boolean> => {
    try {
      if (!storedPin) {
        return false;
      }

      const hashedPin = await hashPin(pin);
      const isValid = hashedPin === storedPin;

      if (isValid) {
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
        }));
      }

      return isValid;
    } catch (error) {
      // Error handled silently for production
      return false;
    }
  };

  const changePin = async (currentPin: string, newPin: string): Promise<boolean> => {
    try {
      const isCurrentValid = await authenticateWithPin(currentPin);
      if (!isCurrentValid) {
        return false;
      }

      const hashedNewPin = await hashPin(newPin);
      setPinStorage(hashedNewPin);

      // Best Practice: Update database preferences
      database.setPinLength(newPin.length as 4 | 6);
      
      // Update memory cache
      const newPreferences = {
        ...userPreferences,
        pinLength: newPin.length as 4 | 6,
      };
      setUserPreferences(newPreferences);

      setAuthState(prev => ({
        ...prev,
        pinLength: newPin.length as 4 | 6,
      }));

      return true;
    } catch (error) {
      // Error handled silently for production
      return false;
    }
  };

  const authenticateWithBiometric = async (): Promise<{ success: boolean; error?: string }> => {
    if (!userPreferences.biometricEnabled || !biometric.canUseBiometric) {
      return {
        success: false,
        error: 'Biometric authentication is not enabled or available',
      };
    }

    const result = await biometric.authenticate();
    
    if (result.success) {
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: true,
      }));
    }

    return result;
  };

  // Best Practice: Direct database operations for user preferences
  const updateUserPreferences = async (preferences: Partial<UserPreferences>): Promise<void> => {
    try {
      // Update database (persistent)
      database.setUserPreferences(preferences);
      
      // Update memory cache (performance)
      const newPreferences = { ...userPreferences, ...preferences };
      setUserPreferences(newPreferences);

      // Update auth state if needed
      if (preferences.biometricEnabled !== undefined || preferences.pinLength !== undefined) {
        setAuthState(prev => ({
          ...prev,
          biometricEnabled: newPreferences.biometricEnabled,
          pinLength: newPreferences.pinLength,
        }));
      }
    } catch (error) {
      // Error handled silently for production
      throw error;
    }
  };

  const updateUserName = async (name: string): Promise<void> => {
    // Best Practice: Direct database operation
    database.setUserName(name.trim());
    
    // Update memory cache
    setAuthState(prev => ({
      ...prev,
      userName: name.trim(),
    }));
  };

  const logout = (): void => {
    setAuthState(prev => ({
      ...prev,
      isAuthenticated: false,
    }));
  };

  const resetApp = async (): Promise<void> => {
    try {
      // Clear secure storage (PIN)
      setPinStorage(null);
      
      // Clear database completely
      database.clearAllData();

      // Reset memory state
      setAuthState(defaultAuthState);
      setUserPreferences(defaultUserPreferences);
      setAppSettings(defaultAppSettings);
    } catch (error) {
      // Error handled silently for production
      throw error;
    }
  };

  // Best Practice: Convenience methods
  const toggleBiometric = async (): Promise<void> => {
    if (!biometric.canUseBiometric) {
      throw new Error('Biometric authentication is not available on this device');
    }

    await updateUserPreferences({
      biometricEnabled: !userPreferences.biometricEnabled,
    });
  };

  const changePinLength = async (newLength: 4 | 6): Promise<void> => {
    await updateUserPreferences({
      pinLength: newLength,
    });
  };

  const value: AuthContextType = {
    authState,
    userPreferences,
    isLoading,
    
    // Authentication methods
    setupPin,
    authenticateWithPin,
    changePin,
    authenticateWithBiometric,
    
    // User preferences methods
    updateUserPreferences,
    updateUserName,
    
    // Setup methods
    completeSetup,
    
    // Logout and reset
    logout,
    resetApp,
    
    // Biometric state
    biometricState: {
      isAvailable: biometric.isAvailable,
      canUseBiometric: biometric.canUseBiometric,
      getBiometricName: biometric.getBiometricName,
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 