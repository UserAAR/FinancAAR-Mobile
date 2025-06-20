import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency } from '../utils/currency';
import { Account } from '../types';

interface AccountCardProps {
  account: Account;
  onPress?: () => void;
}

const { width } = Dimensions.get('window');

export default function AccountCard({ account, onPress }: AccountCardProps) {
  const { theme } = useTheme();

  const getCardColor = () => {
    if (account.type === 'card' && account.color) {
      return account.color;
    }
    return theme.colors.primary;
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: getCardColor(),
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.xl,
      marginHorizontal: theme.spacing.sm,
      height: 180,
      justifyContent: 'flex-start',
      ...theme.shadows?.large,
      position: 'relative',
      overflow: 'hidden',
    },
    backgroundPattern: {
      position: 'absolute',
      top: -20,
      right: -20,
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      zIndex: 1,
    },
    backgroundPattern2: {
      position: 'absolute',
      bottom: -30,
      left: -30,
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      zIndex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      zIndex: 10,
      marginBottom: theme.spacing.md,
    },
    accountInfo: {
      flex: 1,
      paddingRight: theme.spacing.md,
    },
    accountName: {
      fontSize: 20,
      fontWeight: '700',
      color: 'white',
      marginBottom: theme.spacing.xs,
      lineHeight: 24,
      zIndex: 10,
    },
    accountType: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
      textTransform: 'capitalize',
      fontWeight: '500',
      lineHeight: 18,
      zIndex: 10,
    },
    iconContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 48,
      minHeight: 48,
      zIndex: 10,
    },
    emoji: {
      fontSize: 24,
      lineHeight: 24,
    },
    balanceContainer: {
      zIndex: 15,
      marginVertical: theme.spacing.lg,
      alignItems: 'flex-start',
    },
    balance: {
      fontSize: 32,
      fontWeight: '800',
      color: 'white',
      letterSpacing: -0.5,
      lineHeight: 38,
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
      zIndex: 15,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 10,
      marginTop: 'auto',
    },
    lastFourDigits: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.9)',
      letterSpacing: 2,
      fontFamily: 'monospace',
      fontWeight: '600',
      lineHeight: 18,
      zIndex: 10,
    },
    cardNumber: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    chipIcon: {
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
  });

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Background Patterns */}
      <View style={styles.backgroundPattern} />
      <View style={styles.backgroundPattern2} />
      
      <View style={styles.header}>
        <View style={styles.accountInfo}>
          <Text style={styles.accountName}>{account.name}</Text>
          <Text style={styles.accountType}>{account.type} account</Text>
        </View>
        <View style={styles.iconContainer}>
          {account.emoji ? (
            <Text style={styles.emoji}>{account.emoji}</Text>
          ) : (
            <Ionicons 
              name={account.type === 'cash' ? 'wallet' : 'card'} 
              size={24} 
              color="white" 
            />
          )}
        </View>
      </View>
      
      <View style={styles.balanceContainer}>
        <Text style={styles.balance}>{formatCurrency(account.balance)}</Text>
      </View>
      
      <View style={styles.footer}>
        <View style={styles.cardNumber}>
          <Text style={styles.lastFourDigits}>
            {account.type === 'card' && account.lastFourDigits 
              ? `•••• ${account.lastFourDigits}` 
              : account.type === 'cash' ? 'Cash Account' : ''
            }
          </Text>
        </View>
        {account.type === 'card' && (
          <View style={styles.chipIcon}>
            <Ionicons name="radio-button-on" size={20} color="rgba(255, 255, 255, 0.7)" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
} 