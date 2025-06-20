import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency } from '../utils/currency';
import { database } from '../utils/database';

interface QuickStatProps {
  icon: string;
  label: string;
  value: number;
  color: string;
}

interface QuickStatsProps {
  refreshTrigger?: number;
}

export default function QuickStats({ refreshTrigger }: QuickStatsProps) {
  const { theme } = useTheme();
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      
      // Get total balance from all accounts
      const balanceData = database.getTotalBalance();
      setTotalBalance(balanceData.total);
      
      // Get current month data
      const monthlyData = database.getMonthlyData(1);
      if (monthlyData.length > 0) {
        const currentMonth = monthlyData[0];
        setMonthlyIncome(currentMonth.income);
        setMonthlyExpense(currentMonth.expense);
      } else {
        setMonthlyIncome(0);
        setMonthlyExpense(0);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      // Set default values on error
      setTotalBalance(0);
      setMonthlyIncome(0);
      setMonthlyExpense(0);
    } finally {
      setIsLoading(false);
    }
  };

  const statsData: QuickStatProps[] = [
    {
      icon: 'wallet',
      label: 'Total Balance',
      value: totalBalance,
      color: theme.colors.primary,
    },
    {
      icon: 'arrow-up',
      label: 'This Month Income',
      value: monthlyIncome,
      color: theme.colors.success,
    },
    {
      icon: 'arrow-down',
      label: 'This Month Expense',
      value: monthlyExpense,
      color: theme.colors.error,
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      ...theme.shadows.small,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      backgroundColor: 'rgba(0, 210, 170, 0.1)',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    value: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    label: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        {[1, 2, 3].map((index) => (
          <View key={index} style={styles.statItem}>
            <View style={styles.iconContainer}>
              <Ionicons name="hourglass" size={24} color={theme.colors.textSecondary} />
            </View>
            <Text style={styles.value}>Loading...</Text>
            <Text style={styles.label}>Please wait</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {statsData.map((stat, index) => (
        <View key={index} style={styles.statItem}>
          <View style={[styles.iconContainer, { backgroundColor: `${stat.color}20` }]}>
            <Ionicons name={stat.icon as any} size={24} color={stat.color} />
          </View>
          <Text style={styles.value}>{formatCurrency(stat.value)}</Text>
          <Text style={styles.label}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
} 