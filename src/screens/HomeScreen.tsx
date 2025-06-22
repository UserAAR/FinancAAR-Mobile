import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/currency';
import { database } from '../utils/database';
import { Account, Transaction } from '../types';
import AccountCard from '../components/AccountCard';
import QuickStats from '../components/QuickStats';
import AppLogo from '../components/AppLogo';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { theme } = useTheme();
  const { authState } = useAuth();
  const navigation = useNavigation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAccountIndex, setCurrentAccountIndex] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load accounts
      const accountData = database.getAccounts();
      setAccounts(accountData);
      
      // Load recent transactions (last 3 for homepage)
      const transactionData = database.getTransactions(3);
      setRecentTransactions(transactionData);
      
      // Calculate total balance
      const balanceData = database.getTotalBalance();
      setTotalBalance(balanceData.total);
      
      // Get monthly data for current month
      const monthlyData = database.getMonthlyData(1);
      if (monthlyData.length > 0) {
        const currentMonth = monthlyData[0];
        setMonthlyIncome(currentMonth.income);
        setMonthlyExpense(currentMonth.expense);
      } else {
        setMonthlyIncome(0);
        setMonthlyExpense(0);
      }
      
      // Trigger QuickStats refresh
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = authState.userName || 'Friend';
    
    if (hour < 5) {
      return `Hello, ${name}!`;
    } else if (hour < 12) {
      return `Good morning, ${name}!`;
    } else if (hour < 17) {
      return `Good afternoon, ${name}!`;
    } else if (hour < 22) {
      return `Good evening, ${name}!`;
    } else {
      return `Hello, ${name}!`;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    greetingContainer: {
      flex: 1,
      paddingRight: theme.spacing.md,
    },
    greeting: {
      fontSize: 30,
      fontWeight: '800',
      color: theme.colors.primary,
      marginBottom: theme.spacing.xs,
      textShadowColor: theme.colors.primary + '30',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    notificationButton: {
      backgroundColor: theme.colors.primary + '15',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: '600',
      color: theme.colors.text,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    accountsContainer: {
      height: 200,
      marginBottom: theme.spacing.md,
    },
    accountCard: {
      width: width - (theme.spacing.lg * 2),
      marginHorizontal: theme.spacing.lg,
    },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.border,
      marginHorizontal: 4,
    },
    activePaginationDot: {
      backgroundColor: theme.colors.primary,
      width: 24,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
      marginHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.md,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.lg,
      marginVertical: theme.spacing.xs,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    transactionIcon: {
      backgroundColor: theme.colors.primary + '20',
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
      marginRight: theme.spacing.md,
    },
    transactionDetails: {
      flex: 1,
    },
    transactionTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    transactionDate: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    addButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      margin: theme.spacing.lg,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    addButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: theme.spacing.sm,
    },
    viewAllButton: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.primary + '30',
      borderStyle: 'dashed',
    },
    viewAllButtonText: {
      color: theme.colors.primary,
      fontSize: 15,
      fontWeight: '600',
      marginLeft: theme.spacing.sm,
    },
  });

  const renderEmptyAccounts = () => (
    <View style={styles.emptyState}>
      <Ionicons name="wallet-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={styles.emptyText}>
        No accounts yet.{'\n'}Add your first account to get started!
      </Text>
    </View>
  );

  const renderEmptyTransactions = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={48} color={theme.colors.textSecondary} />
      <Text style={styles.emptyText}>No recent transactions</Text>
    </View>
  );

  const renderAccountsPagination = () => {
    if (accounts.length <= 1) return null;
    
    return (
      <View style={styles.pagination}>
        {accounts.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentAccountIndex && styles.activePaginationDot,
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Accounts Section - Now First */}
      <Text style={styles.sectionTitle}>My Accounts</Text>
      {accounts.length > 0 ? (
        <>
          <ScrollView 
            horizontal 
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.accountsContainer}
            onMomentumScrollEnd={(event) => {
              const pageIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentAccountIndex(pageIndex);
            }}
          >
            {accounts.map((account, index) => (
              <View key={account.id} style={styles.accountCard}>
                <AccountCard 
                  account={account}
                  onPress={() => {
                    console.log('Navigate to account:', account.id);
                  }}
                />
              </View>
            ))}
          </ScrollView>
          {renderAccountsPagination()}
        </>
      ) : (
        renderEmptyAccounts()
      )}

      {/* Financial Overview Section - Now Second */}
      <Text style={styles.sectionTitle}>Here's your financial overview</Text>
      <QuickStats refreshTrigger={refreshTrigger} />

      {/* Recent Transactions */}
      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {recentTransactions.length > 0 ? (
        <>
          {recentTransactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionIcon}>
                <Ionicons 
                  name={transaction.type === 'income' ? 'arrow-down' : 'arrow-up'} 
                  size={20} 
                  color={theme.colors.primary} 
                />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>{transaction.title}</Text>
                <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
              </View>
              <Text style={[
                styles.transactionAmount,
                { color: transaction.type === 'income' ? theme.colors.success : theme.colors.error }
              ]}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </Text>
            </View>
          ))}
          
          {/* View All Transactions Button */}
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('Transactions' as never)}
          >
            <Ionicons name="receipt-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.viewAllButtonText}>View All Transactions</Text>
          </TouchableOpacity>
        </>
      ) : (
        renderEmptyTransactions()
      )}

      {/* Quick Add Button */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('AddTransaction' as never)}
      >
        <Ionicons name="add" size={20} color="white" />
        <Text style={styles.addButtonText}>Add Transaction</Text>
      </TouchableOpacity>
    </ScrollView>
  );
} 