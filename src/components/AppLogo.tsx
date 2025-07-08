import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Constants from 'expo-constants';

interface AppLogoProps {
  size?: 'small' | 'medium' | 'large' | 'xl';
  variant?: 'full' | 'icon-only' | 'text-only';
  showVersion?: boolean;
  style?: any;
}

export default function AppLogo({ 
  size = 'medium', 
  variant = 'full', 
  showVersion = false,
  style 
}: AppLogoProps) {
  const { theme } = useTheme();

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { iconSize: 24, fontSize: 16, spacing: 8 };
      case 'medium':
        return { iconSize: 40, fontSize: 24, spacing: 12 };
      case 'large':
        return { iconSize: 60, fontSize: 32, spacing: 16 };
      case 'xl':
        return { iconSize: 80, fontSize: 40, spacing: 20 };
      default:
        return { iconSize: 40, fontSize: 24, spacing: 12 };
    }
  };

  const sizeConfig = getSizeConfig();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modernContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: sizeConfig.spacing * 2,
      paddingHorizontal: sizeConfig.spacing * 1.5,
      paddingVertical: sizeConfig.spacing,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    logoIcon: {
      width: sizeConfig.iconSize,
      height: sizeConfig.iconSize,
      borderRadius: sizeConfig.iconSize * 0.2,
    },
    textContainer: {
      marginLeft: variant === 'full' ? sizeConfig.spacing : 0,
    },
    appName: {
      fontSize: sizeConfig.fontSize,
      fontWeight: '700',
      color: theme.colors.primary,
      letterSpacing: 0.5,
    },
    appTagline: {
      fontSize: sizeConfig.fontSize * 0.5,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    versionText: {
      fontSize: sizeConfig.fontSize * 0.4,
      color: theme.colors.textSecondary,
      marginTop: 2,
      fontStyle: 'italic',
    },
    // Original container style for text-only
    textLogoContainer: {
      backgroundColor: 'transparent',
      paddingHorizontal: sizeConfig.spacing * 1.8,
      paddingVertical: sizeConfig.spacing * 0.6,
      borderRadius: sizeConfig.spacing * 1.8,
      borderWidth: 3.2,
      borderColor: theme.colors.primary,
    },
    textLogo: {
      fontSize: sizeConfig.fontSize * 0.9,
      fontWeight: '800',
      color: theme.colors.primary,
      letterSpacing: 0.5,
      textAlign: 'center',
    },
  });

  // Icon-only variant
  if (variant === 'icon-only') {
    return (
      <View style={[styles.container, style]}>
        <Image 
          source={require('../../assets/icon.png')} 
          style={styles.logoIcon}
          resizeMode="contain"
        />
      </View>
    );
  }

  // Text-only variant - original container style
  if (variant === 'text-only') {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.textLogoContainer}>
          <Text style={styles.textLogo}>FinancAAR</Text>
        </View>
        {showVersion && (
          <Text style={styles.versionText}>v{Constants.expoConfig?.version || '3.1.1'}</Text>
        )}
      </View>
    );
  }

  // Full variant (icon + text)
  return (
    <View style={[styles.container, style]}>
      <Image 
        source={require('../../assets/icon.png')} 
        style={styles.logoIcon}
        resizeMode="contain"
      />
      <View style={styles.textContainer}>
        <Text style={styles.appName}>FinancAAR</Text>
        <Text style={styles.appTagline}>Personal Finance</Text>
        {showVersion && (
          <Text style={styles.versionText}>v{Constants.expoConfig?.version || '3.1.1'}</Text>
        )}
      </View>
    </View>
  );
} 