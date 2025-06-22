import { useEffect, useCallback, useReducer } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type UseStateHook<T> = [[boolean, T | null], (value: T | null) => void];

function useAsyncState<T>(
  initialValue: [boolean, T | null] = [true, null],
): UseStateHook<T> {
  return useReducer(
    (state: [boolean, T | null], action: T | null = null): [boolean, T | null] => [false, action],
    initialValue
  ) as UseStateHook<T>;
}

export async function setStorageItemAsync(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.error('Local storage is unavailable:', e);
    }
  } else {
    if (value == null) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  }
}

export function useSecureStorage(key: string): UseStateHook<string> {
  // Public
  const [state, setState] = useAsyncState<string>();

  // Get
  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          setState(localStorage.getItem(key));
        }
      } catch (e) {
        console.error('Local storage is unavailable:', e);
      }
    } else {
      SecureStore.getItemAsync(key).then(value => {
        setState(value);
      });
    }
  }, [key]);

  // Set
  const setValue = useCallback(
    (value: string | null) => {
      setState(value);
      setStorageItemAsync(key, value);
    },
    [key]
  );

  return [state, setValue];
}

// Specific hooks for authentication data
export const useAuthPin = () => useSecureStorage('auth_pin');
// Removed useAuthSettings and useUserData - now handled via database

// Helper functions for storing complex objects
export const storeObject = async (key: string, obj: any) => {
  try {
    const jsonValue = JSON.stringify(obj);
    await setStorageItemAsync(key, jsonValue);
  } catch (error) {
    console.error('Error storing object:', error);
    throw error;
  }
};

export const getObject = async <T>(key: string): Promise<T | null> => {
  try {
    let value: string | null;
    
    if (Platform.OS === 'web') {
      value = localStorage.getItem(key);
    } else {
      value = await SecureStore.getItemAsync(key);
    }
    
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Error getting object:', error);
    return null;
  }
};

export const removeItem = async (key: string) => {
  try {
    await setStorageItemAsync(key, null);
  } catch (error) {
    console.error('Error removing item:', error);
    throw error;
  }
}; 