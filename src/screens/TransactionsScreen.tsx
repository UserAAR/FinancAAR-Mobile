import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency } from '../utils/currency';
import { database } from '../utils/database';
import { Transaction, Account, Category } from '../types';

type FilterType = 'monthly' | 'yearly' | 'account';
type PeriodFilter = 'week' | 'month' | '3months' | '6months' | 'year' | 'all';
type GroupingType = 'day' | 'week' | 'month';

export default function TransactionsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('month');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedGrouping, setSelectedGrouping] = useState<GroupingType>('month');

  useEffect(() => {
    loadData();
  }, [selectedPeriod, selectedAccountId, selectedGrouping]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load accounts
      const accountData = database.getAccounts();
      setAccounts(accountData);
      
      // Load transactions with filters
      let transactionData: Transaction[];
      
      if (selectedAccountId === 'all') {
        transactionData = database.getTransactions();
      } else {
        transactionData = database.getTransactions().filter(
          transaction => transaction.accountId === selectedAccountId || transaction.toAccountId === selectedAccountId
        );
      }
      
      // Apply period filter
      if (selectedPeriod !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        switch (selectedPeriod) {
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case '3months':
            startDate.setMonth(now.getMonth() - 3);
            break;
          case '6months':
            startDate.setMonth(now.getMonth() - 6);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        transactionData = transactionData.filter(
          transaction => transaction.date >= startDate
        );
      }
      
      // Sort by date (newest first)
      transactionData.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setTransactions(transactionData);
    } catch (error) {
      // Error handled silently for production
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
        return 'arrow-down';
      case 'expense':
        return 'arrow-up';
      case 'transfer':
        return 'swap-horizontal';
      case 'debt_payment':
        return 'card';
      case 'borrowed':
        return 'person-add';
      case 'lent':
        return 'person-remove';
      default:
        return 'cash';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'income':
        return theme.colors.success;
      case 'expense':
        return theme.colors.error;
      case 'transfer':
        return theme.colors.primary;
      case 'debt_payment':
        return theme.colors.warning;
      case 'borrowed':
        return '#9C27B0'; // Purple for borrowed money
      case 'lent':
        return '#FF6F00'; // Orange for lent money
      default:
        return theme.colors.text;
    }
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account?.name || 'Unknown';
  };

  const groupTransactionsByDay = () => {
    const grouped: { [key: string]: Transaction[] } = {};
    
    transactions.forEach(transaction => {
      const dayKey = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(transaction.date);
      
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(transaction);
    });
    
    return grouped;
  };

  const groupTransactionsByWeek = () => {
    const grouped: { [key: string]: Transaction[] } = {};
    
    transactions.forEach(transaction => {
      const date = transaction.date;
      const startOfWeek = new Date(date);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day;
      startOfWeek.setDate(diff);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const weekKey = `Week of ${new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(startOfWeek)} - ${new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(endOfWeek)}`;
      
      if (!grouped[weekKey]) {
        grouped[weekKey] = [];
      }
      grouped[weekKey].push(transaction);
    });
    
    return grouped;
  };

  const groupTransactionsByMonth = () => {
    const grouped: { [key: string]: Transaction[] } = {};
    
    transactions.forEach(transaction => {
      const monthKey = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
      }).format(transaction.date);
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(transaction);
    });
    
    return grouped;
  };

  const getGroupedTransactions = () => {
    switch (selectedGrouping) {
      case 'day':
        return groupTransactionsByDay();
      case 'week':
        return groupTransactionsByWeek();
      case 'month':
        return groupTransactionsByMonth();
      default:
        return groupTransactionsByMonth();
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(item.type) + '20' }]}>
        <Ionicons
          name={getTransactionIcon(item.type)}
          size={20}
          color={getTransactionColor(item.type)}
        />
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionTitle}>{item.title}</Text>
        <Text style={styles.transactionSubtitle}>
          {item.type === 'transfer' 
            ? `${getAccountName(item.accountId)} → ${getAccountName(item.toAccountId || '')} • ${formatDate(item.date)}`
            : `${getAccountName(item.accountId)} • ${formatDate(item.date)}`
          }
        </Text>
        {item.description && (
          <Text style={styles.transactionDescription}>{item.description}</Text>
        )}
      </View>
      <View style={styles.transactionAmount}>
        <Text style={[
          styles.amountText,
          { color: getTransactionColor(item.type) }
        ]}>
          {item.type === 'income' || item.type === 'borrowed' ? '+' : 
           item.type === 'transfer' ? '→' : '-'}{formatCurrency(item.amount)}
        </Text>
        <Text style={styles.transactionType}>
          {item.type === 'borrowed' ? 'borrowed' : 
           item.type === 'lent' ? 'lent' : item.type}
        </Text>
      </View>
    </View>
  );

  const renderGroupedTransactions = () => {
    const grouped = getGroupedTransactions();
    
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        {Object.entries(grouped).map(([groupKey, groupTransactions]) => (
          <View key={groupKey} style={styles.groupContainer}>
            <Text style={styles.groupHeader}>{groupKey}</Text>
            {groupTransactions.map((transaction) => (
              <View key={transaction.id}>
                {renderTransaction({ item: transaction })}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    );
  };

  const periodFilters: { key: PeriodFilter; label: string }[] = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: '3months', label: '3M' },
    { key: '6months', label: '6M' },
    { key: 'year', label: 'Year' },
    { key: 'all', label: 'All' },
  ];

  const groupingFilters: { key: GroupingType; label: string; icon: string }[] = [
    { key: 'day', label: 'Daily', icon: 'calendar' },
    { key: 'week', label: 'Weekly', icon: 'calendar-outline' },
    { key: 'month', label: 'Monthly', icon: 'calendar-clear' },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.xl + 20,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginLeft: theme.spacing.md,
    },
    filterContainer: {
      padding: theme.spacing.sm,
    },
    filterRow: {
      flexDirection: 'row',
      marginBottom: theme.spacing.sm,
    },
    filterChip: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      marginRight: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    activeFilterChip: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
    },
    activeFilterText: {
      color: 'white',
    },
    accountFilter: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    groupingContainer: {
      marginTop: theme.spacing.xs,
    },
    sectionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginHorizontal: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    groupingChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      marginRight: theme.spacing.sm,
      borderWidth: 2,
      borderColor: theme.colors.primary + '20',
    },
    activeGroupingChip: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    groupingIcon: {
      marginRight: theme.spacing.xs,
    },
    groupingText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    activeGroupingText: {
      color: 'white',
    },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.sm,
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows?.medium,
    },
    summaryTitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    summaryAmount: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
    },
    content: {
      flex: 1,
    },
    groupContainer: {
      marginBottom: theme.spacing.lg,
    },
    groupHeader: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginHorizontal: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.sm,
      marginVertical: theme.spacing.xs,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      ...theme.shadows?.small,
    },
    transactionIcon: {
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
      marginRight: theme.spacing.md,
    },
    transactionDetails: {
      flex: 1,
    },
    transactionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    transactionSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    transactionDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      fontStyle: 'italic',
    },
    transactionAmount: {
      alignItems: 'flex-end',
    },
    amountText: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
    },
    transactionType: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.md,
    },
  });

  const totalAmount = transactions.reduce((sum, transaction) => {
    if (transaction.type === 'income' || transaction.type === 'borrowed') return sum + transaction.amount;
    if (transaction.type === 'expense' || transaction.type === 'lent') return sum - transaction.amount;
    return sum;
  }, 0);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home' as never);
            }
          }}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Transactions</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="hourglass" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Home' as never);
          }
        }}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Transactions</Text>
      </View>

      <View style={styles.filterContainer}>
        {/* Period Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {periodFilters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                selectedPeriod === filter.key && styles.activeFilterChip,
              ]}
              onPress={() => setSelectedPeriod(filter.key)}
            >
              <Text style={[
                styles.filterText,
                selectedPeriod === filter.key && styles.activeFilterText,
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Account Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedAccountId === 'all' && styles.activeFilterChip,
            ]}
            onPress={() => setSelectedAccountId('all')}
          >
            <Text style={[
              styles.filterText,
              selectedAccountId === 'all' && styles.activeFilterText,
            ]}>
              All Accounts
            </Text>
          </TouchableOpacity>
          {accounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              style={[
                styles.filterChip,
                selectedAccountId === account.id && styles.activeFilterChip,
              ]}
              onPress={() => setSelectedAccountId(account.id)}
            >
              <Text style={[
                styles.filterText,
                selectedAccountId === account.id && styles.activeFilterText,
              ]}>
                {account.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Grouping Filters */}
        <View style={styles.groupingContainer}>
          <Text style={styles.sectionLabel}>Group by:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {groupingFilters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.groupingChip,
                  selectedGrouping === filter.key && styles.activeGroupingChip,
                ]}
                onPress={() => setSelectedGrouping(filter.key)}
              >
                <Ionicons 
                  name={filter.icon as any} 
                  size={16} 
                  color={selectedGrouping === filter.key ? 'white' : theme.colors.primary} 
                  style={styles.groupingIcon}
                />
                <Text style={[
                  styles.groupingText,
                  selectedGrouping === filter.key && styles.activeGroupingText,
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>
          {selectedPeriod === 'all' ? 'Total Balance' : `${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Balance`}
        </Text>
        <Text style={[
          styles.summaryAmount,
          { color: totalAmount >= 0 ? theme.colors.success : theme.colors.error }
        ]}>
          {formatCurrency(totalAmount)}
        </Text>
      </View>

      {/* Transactions List */}
      <View style={styles.content}>
        {transactions.length > 0 ? (
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {renderGroupedTransactions()}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>
              No transactions found.{'\n'}
              Try adjusting your filters or add some transactions.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
} 