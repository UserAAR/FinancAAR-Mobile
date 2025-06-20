import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export interface ToastProps {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  onDismiss: () => void;
  duration?: number;
}

const { width } = Dimensions.get('window');

export default function Toast({
  visible,
  type,
  title,
  message,
  onDismiss,
  duration = 3000,
}: ToastProps) {
  const { theme } = useTheme();
  const translateYAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateYAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      Animated.parallel([
        Animated.timing(translateYAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, duration]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateYAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
      default:
        return 'information-circle';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      case 'warning':
        return theme.colors.warning;
      case 'info':
        return theme.colors.primary;
      default:
        return theme.colors.primary;
    }
  };

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 50,
      left: theme.spacing.md,
      right: theme.spacing.md,
      zIndex: 9999,
    },
    toast: {
      backgroundColor: getBackgroundColor(),
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    iconContainer: {
      marginRight: theme.spacing.md,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: 'bold',
      color: 'white',
      marginBottom: message ? theme.spacing.xs : 0,
    },
    message: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.9)',
      lineHeight: 18,
    },
    closeButton: {
      marginLeft: theme.spacing.sm,
      padding: theme.spacing.xs,
    },
  });

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.toast,
          {
            opacity: opacityAnim,
            transform: [{ translateY: translateYAnim }],
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={getIconName()}
            size={24}
            color="white"
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDismiss}
        >
          <Ionicons name="close" size={20} color="white" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
} 