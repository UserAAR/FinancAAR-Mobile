import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, CURRENCY_SYMBOL } from '../utils/currency';
import { database } from '../utils/database';
import { MonthlyData, CategorySpending, Transaction, Account } from '../types';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 32;

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const { authState } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategorySpending[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'3month' | '6month' | '1year'>('6month');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      const months = selectedPeriod === '6month' ? 6 : selectedPeriod === '3month' ? 3 : 12;
      
      // Load all data
      const monthData = database.getMonthlyData(months);
      const catData = database.getCategorySpending(months);
      const allTransactions = database.getTransactions();
      const allAccounts = database.getAccounts();
      
      setMonthlyData(monthData);
      setCategoryData(catData);
      setTransactions(allTransactions);
      setAccounts(allAccounts);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  // Enhanced chart data with better colors and formatting
  const getIncomeExpenseChartData = () => {
    if (!monthlyData.length) {
      // Show sample data instead of empty chart
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          { 
            data: [100, 150, 200, 180, 250, 300], 
            color: () => theme.colors.success,
            strokeWidth: 3
          },
          { 
            data: [80, 120, 160, 140, 200, 240], 
            color: () => theme.colors.error,
            strokeWidth: 3
          }
        ],
        legend: ['Income', 'Expenses']
      };
    }

    // Ensure all values are positive and handle zero values
    const incomeData = monthlyData.map(d => Math.max(d.income, 1));
    const expenseData = monthlyData.map(d => Math.max(d.expense, 1));

    return {
      labels: monthlyData.map(d => d.month.slice(0, 3)),
      datasets: [
        {
          data: incomeData,
          color: () => theme.colors.success,
          strokeWidth: 3
        },
        {
          data: expenseData,
          color: () => theme.colors.error,
          strokeWidth: 3
        }
      ],
      legend: ['Income', 'Expenses']
    };
  };

  const getNetSavingsChartData = () => {
    if (!monthlyData.length) {
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0] }]
      };
    }

    const netData = monthlyData.map(d => d.income - d.expense);
    return {
      labels: monthlyData.map(d => d.month.slice(0, 3)),
      datasets: [{
        data: netData,
        color: () => theme.colors.primary,
        strokeWidth: 4
      }]
    };
  };

  const getCategoryPieData = () => {
    if (!categoryData.length) {
      return [{
        name: 'No Expenses',
        amount: 1,
        color: theme.colors.surface,
        legendFontColor: theme.colors.textSecondary,
        legendFontSize: 12
      }];
    }

    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];

    return categoryData.slice(0, 8).map((cat, index) => ({
      name: cat.name,
      amount: cat.totalSpent,
      color: colors[index % colors.length],
      legendFontColor: theme.colors.text,
      legendFontSize: 11
    }));
  };

  // New: Account balance distribution
  const getAccountBalanceData = () => {
    if (!accounts.length) return [];
    
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    
    return accounts.filter(acc => acc.balance > 0).map((account, index) => ({
      name: account.name,
      amount: account.balance,
      color: colors[index % colors.length],
      legendFontColor: theme.colors.text,
      legendFontSize: 11
    }));
  };

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 210, 170, ${opacity})`,
    labelColor: () => theme.colors.text,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 11,
    },
    propsForVerticalLabels: {
      fontSize: 10,
    },
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl + 20,
      paddingBottom: theme.spacing.md,
    },
    greeting: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
    },
    periodSelector: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xs,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      ...theme.shadows?.small,
    },
    periodButton: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
    },
    activePeriodButton: {
      backgroundColor: theme.colors.primary,
    },
    periodText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    activePeriodText: {
      color: 'white',
    },
    quickStatsContainer: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
    },
    statsRow: {
      flexDirection: 'row',
      marginBottom: theme.spacing.md,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginHorizontal: theme.spacing.xs,
      alignItems: 'center',
      ...theme.shadows?.medium,
    },
    statIcon: {
      backgroundColor: theme.colors.primary + '15',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontWeight: '500',
    },
    chartContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.lg,
      ...theme.shadows?.medium,
    },
    chartHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    chartIcon: {
      backgroundColor: theme.colors.primary + '15',
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
      marginRight: theme.spacing.md,
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    insightCard: {
      backgroundColor: theme.colors.primary + '10',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
    },
    insightTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    insightText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
      marginTop: theme.spacing.xl,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.md,
      lineHeight: 24,
    },
  });

  // Calculate insights
  const totalIncome = monthlyData.reduce((sum, month) => sum + month.income, 0);
  const totalExpense = monthlyData.reduce((sum, month) => sum + month.expense, 0);
  const netSavings = totalIncome - totalExpense;
  const avgMonthlyIncome = monthlyData.length ? totalIncome / monthlyData.length : 0;
  const avgMonthlyExpense = monthlyData.length ? totalExpense / monthlyData.length : 0;
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100) : 0;
  
  const topCategory = categoryData.length > 0 ? categoryData[0] : null;
  const transactionCount = transactions.length;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="analytics" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>Loading your financial insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Analytics</Text>
          <Text style={styles.subtitle}>Here's your financial analysis</Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['3month', '6month', '1year'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.activePeriodButton
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodText,
                selectedPeriod === period && styles.activePeriodText
              ]}>
                {period === '3month' ? '3 Months' : period === '6month' ? '6 Months' : '1 Year'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {monthlyData.length > 0 ? (
          <>
            {/* Quick Stats */}
            <View style={styles.quickStatsContainer}>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <Ionicons name="trending-up" size={20} color={theme.colors.success} />
                  </View>
                  <Text style={[styles.statValue, { color: theme.colors.success }]}>
                    {formatCurrency(totalIncome)}
                  </Text>
                  <Text style={styles.statLabel}>Total Income</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <Ionicons name="trending-down" size={20} color={theme.colors.error} />
                  </View>
                  <Text style={[styles.statValue, { color: theme.colors.error }]}>
                    {formatCurrency(totalExpense)}
                  </Text>
                  <Text style={styles.statLabel}>Total Expenses</Text>
                </View>
              </View>
              
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <Ionicons name="wallet" size={20} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.statValue, { color: netSavings >= 0 ? theme.colors.success : theme.colors.error }]}>
                    {formatCurrency(netSavings)}
                  </Text>
                  <Text style={styles.statLabel}>Net Savings</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <Ionicons name="pie-chart" size={20} color={theme.colors.warning} />
                  </View>
                  <Text style={[styles.statValue, { color: savingsRate >= 20 ? theme.colors.success : theme.colors.warning }]}>
                    {savingsRate.toFixed(1)}%
                  </Text>
                  <Text style={styles.statLabel}>Savings Rate</Text>
                </View>
              </View>
            </View>

            {/* Insight Card */}
            <View style={styles.insightCard}>
              <Text style={styles.insightTitle}>💡 Financial Insight</Text>
              <Text style={styles.insightText}>
                {savingsRate >= 20 
                  ? `Great job! You're saving ${savingsRate.toFixed(1)}% of your income. Keep up the excellent financial discipline!`
                  : savingsRate >= 10 
                  ? `You're saving ${savingsRate.toFixed(1)}% of your income. Consider reducing expenses in ${topCategory?.name || 'top spending categories'} to improve your savings rate.`
                  : netSavings >= 0 
                  ? `You're saving ${savingsRate.toFixed(1)}% of your income. Try to aim for at least 10-20% savings rate for better financial health.`
                  : `You're spending more than you earn. Consider reviewing your expenses, especially in ${topCategory?.name || 'high spending categories'}.`
                }
              </Text>
            </View>

            {/* 1. Spending by Category */}
            {categoryData.length > 0 && (
              <View style={styles.chartContainer}>
                <View style={styles.chartHeader}>
                  <View style={styles.chartIcon}>
                    <Ionicons name="pie-chart" size={20} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.chartTitle}>Spending by Category</Text>
                </View>
                <PieChart
                  data={getCategoryPieData()}
                  width={chartWidth - 64}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="amount"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  center={[10, 0]}
                  absolute
                />
              </View>
            )}

            {/* 2. Income vs Expenses Chart */}
            <View style={styles.chartContainer}>
              <View style={styles.chartHeader}>
                <View style={styles.chartIcon}>
                  <Ionicons name="bar-chart" size={20} color={theme.colors.primary} />
                </View>
                <Text style={styles.chartTitle}>Income vs Expenses Trend</Text>
              </View>
              <BarChart
                data={getIncomeExpenseChartData()}
                width={chartWidth - 64}
                height={220}
                chartConfig={chartConfig}
                verticalLabelRotation={0}
                showValuesOnTopOfBars={false}
                withInnerLines={false}
                yAxisLabel={CURRENCY_SYMBOL}
                yAxisSuffix=""
                style={{ marginLeft: -20 }}
              />
            </View>

            {/* 3. Account Balance Distribution */}
            {accounts.length > 1 && getAccountBalanceData().length > 0 && (
              <View style={styles.chartContainer}>
                <View style={styles.chartHeader}>
                  <View style={styles.chartIcon}>
                    <Ionicons name="wallet" size={20} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.chartTitle}>Account Balance Distribution</Text>
                </View>
                <PieChart
                  data={getAccountBalanceData()}
                  width={chartWidth - 64}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="amount"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  center={[10, 0]}
                  absolute
                />
              </View>
            )}

            {/* 4. Net Savings Trend */}
            <View style={styles.chartContainer}>
              <View style={styles.chartHeader}>
                <View style={styles.chartIcon}>
                  <Ionicons name="trending-up" size={20} color={theme.colors.primary} />
                </View>
                <Text style={styles.chartTitle}>Net Savings Over Time</Text>
              </View>
              <LineChart
                data={getNetSavingsChartData()}
                width={chartWidth - 64}
                height={220}
                chartConfig={chartConfig}
                bezier
                withInnerLines={false}
                withOuterLines={false}
                withVerticalLines={false}
                withHorizontalLines={true}
                style={{ marginLeft: -20 }}
              />
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={80} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>
              No financial data available yet.{'\n\n'}
              Start by adding some transactions to see beautiful analytics and insights about your spending patterns!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
} 