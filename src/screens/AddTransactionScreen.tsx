import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert, useToast } from '../hooks/useNotification';
import { formatCurrency, CURRENCY_SYMBOL } from '../utils/currency';
import { database } from '../utils/database';
import { Account, Category, TransactionType } from '../types';

export default function AddTransactionScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const alert = useAlert();
  const toast = useToast();
  const [selectedType, setSelectedType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [toAccount, setToAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedType]);

  const loadData = () => {
    // Load accounts
    const accountData = database.getAccounts();
    setAccounts(accountData);
    
    // Set default account if not selected
    if (!selectedAccount && accountData.length > 0) {
      setSelectedAccount(accountData[0]);
    }

    // Load categories based on selected type
    if (selectedType !== 'transfer') {
      const categoryData = database.getCategories(selectedType === 'income' ? 'income' : 'expense');
      const hidden = ['Debt Repayment', 'Lent Money', 'Borrowed Money', 'Debt Repayment Received'];
      const filtered = categoryData.filter(cat => !hidden.includes(cat.name));
      setCategories(filtered);
      
      // Reset category selection when type changes
      setSelectedCategory(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Reload all data
      loadData();
      toast.success('Refreshed!', 'Account and category data updated');
    } catch (error) {
      alert.error('Refresh Error', 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const transactionData = {
        type: selectedType,
        amount: parseFloat(amount),
        title: title.trim(),
        description: description.trim() || undefined,
        categoryId: selectedType === 'transfer' ? '' : (selectedCategory?.id || ''),
        accountId: selectedAccount!.id,
        toAccountId: selectedType === 'transfer' ? toAccount?.id : undefined,
        date: new Date(),
      };

      await database.createTransaction(transactionData);
      
      // Reset form
      resetForm();
      
      toast.success('Success!', 'Transaction added successfully');
      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Home' as never);
        }
      }, 1500);
    } catch (error) {
      // Parse error message and show user-friendly alerts
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('INSUFFICIENT_FUNDS')) {
        // Extract the specific amount info from error message
        const balanceMatch = errorMessage.match(/has ₼([\d.]+)/);
        const amountMatch = errorMessage.match(/trying to [\w\s]+ ₼([\d.]+)/);
        const accountMatch = errorMessage.match(/Account "([^"]+)"/);
        
        const currentBalance = balanceMatch ? balanceMatch[1] : 'unknown';
        const attemptedAmount = amountMatch ? amountMatch[1] : amount;
        const accountName = accountMatch ? accountMatch[1] : selectedAccount?.name || 'selected account';
        
        alert.error(
          'Insufficient Funds', 
          `${accountName} has only ₼${currentBalance} but you're trying to spend ₼${attemptedAmount}.\n\nPlease select a different account or reduce the amount.`
        );
      } else if (errorMessage.includes('ACCOUNT_NOT_FOUND')) {
        alert.error('Account Error', 'The selected account no longer exists. Please refresh and select a different account.');
      } else if (errorMessage.includes('DESTINATION_ACCOUNT_NOT_FOUND')) {
        alert.error('Transfer Error', 'The destination account no longer exists. Please refresh and select a different account.');
      } else if (errorMessage.includes('INVALID_TRANSFER')) {
        if (errorMessage.includes('same account')) {
          alert.error('Transfer Error', 'You cannot transfer money to the same account. Please select a different destination account.');
        } else {
          alert.error('Transfer Error', 'Please select a valid destination account for the transfer.');
        }
      } else if (errorMessage.includes('INVALID_AMOUNT')) {
        alert.error('Invalid Amount', 'Please enter a valid amount greater than 0.');
      } else if (errorMessage.includes('INVALID_TITLE')) {
        alert.error('Missing Title', 'Please enter a title for your transaction.');
      } else if (errorMessage.includes('INVALID_CATEGORY')) {
        alert.error('Missing Category', 'Please select a category for your transaction.');
      } else if (errorMessage.includes('DATABASE_ERROR')) {
        alert.error('Database Error', 'Failed to save transaction. Please try again.');
      } else {
        // Fallback for unknown errors
        alert.error('Transaction Failed', 'An unexpected error occurred. Please check your information and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!amount || parseFloat(amount) <= 0) {
      alert.error('Invalid Amount', 'Please enter a valid amount.');
      return false;
    }

    if (!title.trim()) {
      alert.error('Missing Title', 'Please enter a title for your transaction.');
      return false;
    }

    if (!selectedAccount) {
      alert.error('No Account Selected', 'Please select an account for your transaction.');
      return false;
    }

    if (selectedType === 'transfer') {
      if (!toAccount) {
        alert.error('Missing Destination', 'Please select a destination account for transfer.');
        return false;
      }
      if (selectedAccount.id === toAccount.id) {
        alert.error('Same Account Error', 'Source and destination accounts cannot be the same.');
        return false;
      }
    } else {
      // Only check category for income and expense transactions, not for transfers
      if (!selectedCategory) {
        alert.error('No Category Selected', 'Please select a category for your transaction.');
        return false;
      }
    }

    return true;
  };

  const resetForm = () => {
    setAmount('');
    setTitle('');
    setDescription('');
    setSelectedCategory(null);
    setToAccount(null);
  };

  const formatAmountInput = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts[1] && parts[1].length > 2) {
      parts[1] = parts[1].substring(0, 2);
    }
    return parts.join('.');
  };

  const getTypeColor = (type: TransactionType) => {
    switch (type) {
      case 'income':
        return theme.colors.success;
      case 'expense':
        return theme.colors.error;
      case 'transfer':
        return theme.colors.primary;
      default:
        return theme.colors.text;
    }
  };

  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case 'income':
        return 'arrow-down';
      case 'expense':
        return 'arrow-up';
      case 'transfer':
        return 'swap-horizontal';
      default:
        return 'cash';
    }
  };

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
    content: {
      flex: 1,
      padding: theme.spacing.md,
    },
    typeSelector: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.xs,
      marginBottom: theme.spacing.lg,
    },
    typeButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      marginHorizontal: 2,
    },
    activeTypeButton: {
      backgroundColor: theme.colors.primary,
    },
    typeButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.xs,
    },
    activeTypeButtonText: {
      color: 'white',
    },
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    amountInput: {
      fontSize: 24,
      fontWeight: '600',
      textAlign: 'center',
    },
    accountGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      justifyContent: 'center',
    },
    accountItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      alignItems: 'center',
      minWidth: '45%',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedAccountItem: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    accountEmoji: {
      fontSize: 24,
      marginBottom: theme.spacing.xs,
    },
    accountName: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
    },
    accountBalance: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      justifyContent: 'center',
    },
    categoryItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      alignItems: 'center',
      minWidth: '30%',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedCategoryItem: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    categoryIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xs,
    },
    categoryName: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.text,
      textAlign: 'center',
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      margin: theme.spacing.md,
      alignItems: 'center',
      opacity: 1,
    },
    disabledButton: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  const types: { type: TransactionType; label: string }[] = [
    { type: 'expense', label: 'Expense' },
    { type: 'income', label: 'Income' },
    { type: 'transfer', label: 'Transfer' },
  ];

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
        <Text style={styles.headerTitle}>Add Transaction</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {/* Transaction Type Selector */}
        <View style={styles.typeSelector}>
          {types.map((type) => (
            <TouchableOpacity
              key={type.type}
              style={[
                styles.typeButton,
                selectedType === type.type && styles.activeTypeButton,
              ]}
              onPress={() => setSelectedType(type.type)}
            >
              <Ionicons
                name={getTypeIcon(type.type)}
                size={18}
                color={selectedType === type.type ? 'white' : theme.colors.textSecondary}
              />
              <Text style={[
                styles.typeButtonText,
                selectedType === type.type && styles.activeTypeButtonText,
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amount</Text>
          <TextInput
            style={[styles.input, styles.amountInput]}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
            value={amount}
            onChangeText={(text) => setAmount(formatAmountInput(text))}
            keyboardType="numeric"
          />
        </View>

        {/* Title Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter transaction title"
            placeholderTextColor={theme.colors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Add a note..."
            placeholderTextColor={theme.colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Account Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedType === 'transfer' ? 'From Account' : 'Account'}
          </Text>
          <View style={styles.accountGrid}>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountItem,
                  selectedAccount?.id === account.id && styles.selectedAccountItem,
                ]}
                onPress={() => setSelectedAccount(account)}
              >
                <Text style={styles.accountEmoji}>
                  {account.type === 'cash' ? account.emoji : '💳'}
                </Text>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.accountBalance}>
                  {formatCurrency(account.balance)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* To Account Selection (for transfers) */}
        {selectedType === 'transfer' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>To Account</Text>
            <View style={styles.accountGrid}>
              {accounts
                .filter((account) => account.id !== selectedAccount?.id)
                .map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.accountItem,
                      toAccount?.id === account.id && styles.selectedAccountItem,
                    ]}
                    onPress={() => setToAccount(account)}
                  >
                    <Text style={styles.accountEmoji}>
                      {account.type === 'cash' ? account.emoji : '💳'}
                    </Text>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountBalance}>
                      {formatCurrency(account.balance)}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        )}

        {/* Category Selection */}
        {selectedType !== 'transfer' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    selectedCategory?.id === category.id && styles.selectedCategoryItem,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                    <Ionicons name={category.icon as any} size={20} color={category.color} />
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={styles.submitButtonText}>
          {isLoading ? 'Adding...' : 'Add Transaction'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
} 