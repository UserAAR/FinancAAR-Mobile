import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthState, AppSettings } from '../types';
import { useSecureStorage, storeObject, getObject } from '../hooks/useSecureStorage';
import { useBiometric } from '../hooks/useBiometric';
import { database } from '../utils/database';
import * as Crypto from 'expo-crypto';

interface AuthContextType {
  authState: AuthState;
  appSettings: AppSettings;
  isLoading: boolean;
  
  // Authentication methods
  setupPin: (pin: string, userName: string, authenticate?: boolean) => Promise<void>;
  authenticateWithPin: (pin: string) => Promise<boolean>;
  changePin: (currentPin: string, newPin: string) => Promise<boolean>;
  authenticateWithBiometric: () => Promise<{ success: boolean; error?: string }>;
  
  // Settings methods
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  updateAuthSettings: (settings: Partial<{ pin: string; userName: string; pinLength: 4 | 6; biometricEnabled: boolean }>) => Promise<void>;
  toggleBiometric: () => Promise<void>;
  changePinLength: (newLength: 4 | 6) => Promise<void>;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultAuthState: AuthState = {
  isAuthenticated: false,
  pinSet: false,
  biometricEnabled: false,
  pinLength: 4,
  userName: '',
};

const defaultAppSettings: AppSettings = {
  pinLength: 4,
  biometricEnabled: false,
  theme: 'system',
  userName: '',
  defaultCurrency: '₼',
  notifications: true,
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [isLoading, setIsLoading] = useState(true);

  const [pinState, setPinStorage] = useSecureStorage('auth_pin');
  const [settingsState, setSettingsStorage] = useSecureStorage('auth_settings');

  const biometric = useBiometric();

  // Extract loading states and values
  const [pinLoading, storedPin] = pinState;
  const [settingsLoading, settingsStorage] = settingsState;

  // Initialize auth state from storage
  useEffect(() => {
    // Wait for both storages to load before initializing
    if (!pinLoading && !settingsLoading) {
      initializeAuth();
    }
  }, [pinLoading, settingsLoading]);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Always load settings from storage to get the latest data
      const storedSettings = await getObject<AppSettings>('app_settings');
      
      if (storedSettings) {
        // Update app settings
        setAppSettings(storedSettings);
        
        // Update auth state with stored settings
        setAuthState(prev => ({
          ...prev,
          biometricEnabled: storedSettings.biometricEnabled || false,
          pinLength: storedSettings.pinLength || 4,
          userName: storedSettings.userName || '',
          pinSet: !!storedPin && database.isSetupCompleted(),
        }));
      } else {
        // No stored settings, check if setup is completed
        setAuthState(prev => ({
          ...prev,
          pinSet: !!storedPin && database.isSetupCompleted(),
        }));
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hashPin = async (pin: string): Promise<string> => {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );
  };

  const setupPin = async (pin: string, userName: string, authenticate: boolean = true): Promise<void> => {
    try {
      const hashedPin = await hashPin(pin);
      setPinStorage(hashedPin);

      const newSettings: AppSettings = {
        ...appSettings,
        pinLength: pin.length as 4 | 6,
        userName: userName.trim(),
      };
      
      // Save to storage and update local state
      await storeObject('app_settings', newSettings);
      setAppSettings(newSettings);

      // Update auth state with new values
      setAuthState(prev => ({
        ...prev,
        pinSet: true,
        pinLength: pin.length as 4 | 6,
        userName: userName.trim(),
        isAuthenticated: authenticate,
        biometricEnabled: newSettings.biometricEnabled,
      }));
      
      // Small delay to ensure storage write is completed
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error setting up PIN:', error);
      throw error;
    }
  };

  const completeSetup = (): void => {
    database.setSetupCompleted();
    setAuthState(prev => ({
      ...prev,
      pinSet: true,
    }));
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
      console.error('Error authenticating with PIN:', error);
      return false;
    }
  };

  const changePin = async (currentPin: string, newPin: string): Promise<boolean> => {
    try {
      // Verify current PIN first
      const isCurrentValid = await authenticateWithPin(currentPin);
      if (!isCurrentValid) {
        return false;
      }

      // Set new PIN
      const hashedNewPin = await hashPin(newPin);
      setPinStorage(hashedNewPin);

      // Update settings
      const newSettings: AppSettings = {
        ...appSettings,
        pinLength: newPin.length as 4 | 6,
      };

      await storeObject('app_settings', newSettings);
      setAppSettings(newSettings);

      setAuthState(prev => ({
        ...prev,
        pinLength: newPin.length as 4 | 6,
      }));

      return true;
    } catch (error) {
      console.error('Error changing PIN:', error);
      return false;
    }
  };

  const authenticateWithBiometric = async (): Promise<{ success: boolean; error?: string }> => {
    if (!appSettings.biometricEnabled || !biometric.canUseBiometric) {
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

  const updateSettings = async (newSettings: Partial<AppSettings>): Promise<void> => {
    try {
      const updatedSettings = { ...appSettings, ...newSettings };
      await storeObject('app_settings', updatedSettings);
      setAppSettings(updatedSettings);

      // Update auth state if necessary
      setAuthState(prev => ({
        ...prev,
        biometricEnabled: updatedSettings.biometricEnabled,
        pinLength: updatedSettings.pinLength,
        userName: updatedSettings.userName,
      }));
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  const updateAuthSettings = async (settings: Partial<{ pin: string; userName: string; pinLength: 4 | 6; biometricEnabled: boolean }>): Promise<void> => {
    try {
      const updatedSettings = { ...appSettings, ...settings };
      await storeObject('app_settings', updatedSettings);
      setAppSettings(updatedSettings);

      // Update auth state if necessary
      setAuthState(prev => ({
        ...prev,
        biometricEnabled: updatedSettings.biometricEnabled,
        pinLength: updatedSettings.pinLength,
        userName: updatedSettings.userName,
      }));
    } catch (error) {
      console.error('Error updating auth settings:', error);
      throw error;
    }
  };

  const toggleBiometric = async (): Promise<void> => {
    if (!biometric.canUseBiometric) {
      throw new Error('Biometric authentication is not available on this device');
    }

    await updateAuthSettings({
      biometricEnabled: !appSettings.biometricEnabled,
    });
  };

  const changePinLength = async (newLength: 4 | 6): Promise<void> => {
    await updateAuthSettings({
      pinLength: newLength,
    });
  };

  const updateUserName = async (name: string): Promise<void> => {
    await updateAuthSettings({
      userName: name,
    });
  };

  const logout = (): void => {
    setAuthState(prev => ({
      ...prev,
      isAuthenticated: false,
    }));
  };

  const resetApp = async (): Promise<void> => {
    try {
      // Clear all stored data
      setPinStorage(null);
      setSettingsStorage(null);
      await storeObject('app_settings', null);
      
      // Clear setup flag from database
      database.clearSetupFlag();

      // Reset states
      setAuthState(defaultAuthState);
      setAppSettings(defaultAppSettings);
    } catch (error) {
      console.error('Error resetting app:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    authState,
    appSettings,
    isLoading,
    
    // Authentication methods
    setupPin,
    authenticateWithPin,
    changePin,
    authenticateWithBiometric,
    
    // Settings methods
    updateSettings,
    updateAuthSettings,
    toggleBiometric,
    changePinLength,
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