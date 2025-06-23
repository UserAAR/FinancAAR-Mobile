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
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, CURRENCY_SYMBOL } from '../utils/currency';
import { database } from '../utils/database';
import { MonthlyData, CategorySpending, Transaction, Account } from '../types';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 32;

interface AnalyticsScreenProps {
  navigation?: any;
}

export default function AnalyticsScreen({ navigation }: AnalyticsScreenProps) {
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
      // Error handled silently for production
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  // Advanced Chart with Rich Financial Analytics
  const getAdvancedChartData = () => {
    const days = selectedPeriod === '6month' ? 180 : selectedPeriod === '3month' ? 90 : 365;
    const chartData = database.getDailyChartData(days);
    
    // Only use real data - no fake defaults
    const ensureValidData = (data: number[]) => {
      if (!data || data.length === 0) return [];
      return data.map(val => typeof val === 'number' && !isNaN(val) ? val : 0);
    };
    
    return {
      labels: chartData.labels,
      datasets: [
        {
          data: ensureValidData(chartData.datasets.savingsRates),
          color: () => '#00D2AA', // Primary teal
          strokeWidth: 4,
        },
        {
          data: ensureValidData(chartData.datasets.netSavingsScaled),
          color: () => '#4CAF50', // Green
          strokeWidth: 3,
        },
        {
          data: ensureValidData(chartData.datasets.incomeProgress),
          color: () => '#2196F3', // Blue
          strokeWidth: 3,
        },
        {
          data: ensureValidData(chartData.datasets.expenseProgress),
          color: () => '#FF9800', // Orange
          strokeWidth: 3,
        },
        {
          data: ensureValidData(chartData.datasets.targetLine),
          color: () => '#F44336', // Red
          strokeWidth: 2,
          withDots: false,
        },
      ],
      legend: [],
      metadata: chartData.metadata,
    };
  };

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(0, 210, 170, ${opacity})`,
    labelColor: () => theme.colors.text,
    style: {
      borderRadius: 16,
      paddingRight: 40,
      paddingLeft: 8,
    },
    propsForLabels: {
      fontSize: 8,
      fontWeight: '500',
    },
    propsForVerticalLabels: {
      fontSize: 8,
      fontWeight: '500',
      rotation: 0,
    },
    propsForHorizontalLabels: {
      fontSize: 8,
      fontWeight: '500',
    },
    strokeWidth: 2,
    useShadowColorFromDataset: true,
    fillShadowGradient: theme.colors.primary,
    fillShadowGradientOpacity: 0.05,
    withShadow: false,
    withInnerLines: true,
    withOuterLines: false,
    withVerticalLines: false,
    withHorizontalLines: true,
    segments: 6,
    formatYLabel: (value: string) => {
      const num = parseFloat(value);
      if (num >= 100) return `${Math.round(num)}`;
      if (num >= 10) return `${num.toFixed(0)}`;
      return `${num.toFixed(1)}`;
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
      borderWidth: 1,
      borderColor: theme.colors.border + '30',
    },
    chartHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    chartIcon: {
      backgroundColor: theme.colors.primary + '15',
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
      marginRight: theme.spacing.md,
    },
    chartTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
    },
    chartSubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.lg,
      lineHeight: 18,
      fontWeight: '500',
    },
    aiAnalysisCard: {
      backgroundColor: theme.colors.primary + '10',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      borderWidth: 2,
      borderColor: theme.colors.primary + '30',
      ...theme.shadows?.medium,
    },
    aiHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    aiIcon: {
      backgroundColor: theme.colors.primary + '20',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      marginRight: theme.spacing.md,
    },
    aiTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
    },
    aiSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
      lineHeight: 20,
    },
    aiButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows?.small,
    },
    aiButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: theme.spacing.sm,
    },
    insightCard: {
      backgroundColor: theme.colors.success + '10',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.success,
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
    chartInsights: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
    },
    insightRow: {
      alignItems: 'center',
    },
    insightLabel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    insightValue: {
      fontSize: 12,
      fontWeight: '700',
      marginTop: 2,
    },
    chartLegend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border + '30',
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
      width: '48%',
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: theme.spacing.xs,
    },
    legendText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
  });

  // Calculate insights using mathematically correct formulas
  const months = selectedPeriod === '6month' ? 6 : selectedPeriod === '3month' ? 3 : 12;
  
  // Get accurate financial calculations
  const savingsCalculation = database.calculateSavingsRate(months);
  const advancedAnalytics = database.getAdvancedAnalytics();
  
  // Use correct calculations
  const { savingsRate, netSavings, totalIncome, cashFlowSavingsRate } = savingsCalculation;
  const totalExpense = totalIncome - (cashFlowSavingsRate / 100 * totalIncome);
  const avgMonthlyIncome = monthlyData.length ? totalIncome / monthlyData.length : 0;
  const avgMonthlyExpense = monthlyData.length ? totalExpense / monthlyData.length : 0;
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  const topCategory = categoryData.length > 0 ? categoryData[0] : null;
  const transactionCount = transactions.length;
  
  // Financial Health Score
  const healthScore = advancedAnalytics.summary.financialHealthScore;

  const handleAIAnalysis = () => {
    if (navigation) {
      navigation.navigate('AIAnalysis');
    }
  };

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
          <Text style={styles.subtitle}>Track your financial progress</Text>
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

            {/* AI Analysis Card */}
            <View style={styles.aiAnalysisCard}>
              <View style={styles.aiHeader}>
                <View style={styles.aiIcon}>
                  <Ionicons name="analytics" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.aiTitle}>🤖 AI Financial Analysis</Text>
              </View>
              <Text style={styles.aiSubtitle}>
                Get personalized insights, spending recommendations, and financial advice powered by artificial intelligence.
              </Text>
              <TouchableOpacity style={styles.aiButton} onPress={handleAIAnalysis}>
                <Ionicons name="analytics" size={20} color="white" />
                <Text style={styles.aiButtonText}>Analyze My Finances</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Insight with Financial Health Score */}
            <View style={styles.insightCard}>
              <Text style={styles.insightTitle}>💡 Financial Health Analysis</Text>
              <Text style={styles.insightText}>
                <Text style={{ fontWeight: 'bold' }}>Health Score: {healthScore}/100</Text>{'\n\n'}
                <Text style={{ fontWeight: 'bold' }}>Net Savings Rate: {savingsRate.toFixed(1)}%</Text> (True wealth building){'\n'}
                <Text style={{ fontWeight: 'bold' }}>Cash Flow Rate: {cashFlowSavingsRate.toFixed(1)}%</Text> (Income vs Expenses){'\n\n'}
                {savingsRate >= 20 
                  ? `🎯 Excellent! Your ${savingsRate.toFixed(1)}% net savings rate shows you're building real wealth. Your actual asset growth exceeds the 20% target.`
                  : savingsRate >= 10 
                  ? `💪 Good progress! Your ${savingsRate.toFixed(1)}% net savings rate is solid. Push toward 20% for optimal financial security.`
                  : savingsRate >= 0 
                  ? `⚠️ Your ${savingsRate.toFixed(1)}% net savings rate needs improvement. Focus on increasing actual wealth accumulation.`
                  : `🚨 Warning: Negative ${Math.abs(savingsRate).toFixed(1)}% savings rate means your net worth is declining. Immediate action required!`
                }
              </Text>
            </View>

            {/* Financial Analytics Chart - Only show if we have real data */}
            {(() => {
              const chartData = getAdvancedChartData();
              if (chartData.labels.length === 0) {
                return (
                  <View style={styles.chartContainer}>
                    <View style={styles.chartHeader}>
                      <View style={styles.chartIcon}>
                        <Ionicons name="analytics" size={20} color={theme.colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.chartTitle}>Financial Analytics</Text>
                      </View>
                    </View>
                    <View style={styles.emptyState}>
                      <Ionicons name="analytics-outline" size={48} color={theme.colors.textSecondary} />
                      <Text style={styles.emptyText}>
                        Add more transactions to see your financial trends
                      </Text>
                    </View>
                  </View>
                );
              }
              
              return (
                <View style={styles.chartContainer}>
                  <View style={styles.chartHeader}>
                    <View style={styles.chartIcon}>
                      <Ionicons name="analytics" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.chartTitle}>Financial Analytics</Text>
                    </View>
                  </View>
                  
                  <LineChart
                    data={chartData}
                    width={chartWidth - 32}
                    height={280}
                    chartConfig={chartConfig}
                    bezier={true}
                    style={{ 
                      marginLeft: -16,
                      borderRadius: 16,
                      marginVertical: theme.spacing.sm,
                    }}
                    fromZero={false}
                    withDots={true}
                    withVerticalLabels={true}
                    withHorizontalLabels={true}
                    yAxisInterval={1}
                    transparent={true}
                  />
                  
                  {/* Custom Legend */}
                  <View style={styles.chartLegend}>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: '#00D2AA' }]} />
                      <Text style={styles.legendText}>Savings Rate</Text>
                    </View>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                      <Text style={styles.legendText}>Net Savings</Text>
                    </View>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
                      <Text style={styles.legendText}>Income Growth</Text>
                    </View>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                      <Text style={styles.legendText}>Expense Efficiency</Text>
                    </View>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
                      <Text style={styles.legendText}>Target (20%)</Text>
                    </View>
                  </View>
                </View>
              );
            })()}
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