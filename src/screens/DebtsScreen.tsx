import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert, useToast } from '../hooks/useNotification';
import { formatCurrency } from '../utils/currency';
import { database } from '../utils/database';
import { Debt, DebtType, Account } from '../types';

export default function DebtsScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const alert = useAlert();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'got' | 'gave'>('got');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDebt, setNewDebt] = useState({
    personName: '',
    amount: '',
    description: '',
    accountId: '',
    dueDate: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const debtData = database.getDebts(activeTab);
      const accountData = database.getAccounts();
      setDebts(debtData);
      setAccounts(accountData);
      
      // Set default account if not selected
      if (!newDebt.accountId && accountData.length > 0) {
        setNewDebt(prev => ({ ...prev, accountId: accountData[0].id }));
      }
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

  const handleAddDebt = async () => {
    if (!newDebt.personName.trim() || !newDebt.amount.trim() || !newDebt.accountId) {
      alert.error('Missing Information', 'Please fill in person name, amount, and select an account');
      return;
    }

    const amount = parseFloat(newDebt.amount);
    if (isNaN(amount) || amount <= 0) {
      alert.error('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    try {
      await database.createDebtWithTransaction({
        type: activeTab,
        personName: newDebt.personName.trim(),
        amount: amount,
        description: newDebt.description.trim() || undefined,
        accountId: newDebt.accountId,
        dueDate: newDebt.dueDate ? new Date(newDebt.dueDate) : undefined,
      });

      setNewDebt({
        personName: '',
        amount: '',
        description: '',
        accountId: accounts.length > 0 ? accounts[0].id : '',
        dueDate: '',
      });
      setShowAddModal(false);
      toast.success('Success!', `${activeTab === 'got' ? 'Borrowed money added to account' : 'Lent money deducted from account'}`);
      await loadData();
    } catch (error) {
      console.error('Error creating debt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('INSUFFICIENT_FUNDS')) {
        alert.error('Insufficient Funds', errorMessage.split(': ')[1] || 'Not enough money in selected account');
      } else if (errorMessage.includes('ACCOUNT_NOT_FOUND')) {
        alert.error('Account Error', 'Selected account not found. Please select a different account.');
      } else {
        alert.error('Error', 'Failed to create debt');
      }
    }
  };

  const handleDebtPress = (debt: Debt) => {
    if (debt.status === 'completed') {
      // Show delete option for completed debts
      alert.confirm(
        'Delete Debt Record',
        'This debt is completed. Do you want to delete this record permanently?',
        () => {
          // Ask for confirmation with password-like verification
          alert.confirm(
            'Confirm Deletion',
            'Are you absolutely sure? This action cannot be undone.',
            () => {
              try {
                database.deleteDebt(debt.id);
                toast.success('Deleted!', 'Debt record has been deleted');
                loadData();
              } catch (error) {
                alert.error('Error', 'Failed to delete debt record');
              }
            },
            undefined,
            'Yes, Delete',
            'Cancel'
          );
        },
        undefined,
        'Delete',
        'Cancel'
      );
    } else {
      // Navigate to debt detail screen for active debts
      navigation.navigate('DebtDetail', { debtId: debt.id });
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const getTotalAmount = () => {
    return debts
      .filter(debt => debt.status === 'active')
      .reduce((sum, debt) => sum + debt.amount, 0);
  };

  const getSelectedAccount = () => {
    return accounts.find(acc => acc.id === newDebt.accountId);
  };

  const renderAccountSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {activeTab === 'got' ? 'Add money to account' : 'Take money from account'}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScrollView}>
        {accounts.map((account) => (
          <TouchableOpacity
            key={account.id}
            style={[
              styles.accountOption,
              newDebt.accountId === account.id && styles.selectedAccountOption,
            ]}
            onPress={() => setNewDebt(prev => ({ ...prev, accountId: account.id }))}
          >
            <Text style={styles.accountEmoji}>
              {account.type === 'cash' ? account.emoji : '💳'}
            </Text>
            <Text style={[
              styles.accountName,
              newDebt.accountId === account.id && styles.selectedAccountText
            ]}>
              {account.name}
            </Text>
            <Text style={[
              styles.accountBalance,
              newDebt.accountId === account.id && styles.selectedAccountText
            ]}>
              {formatCurrency(account.balance)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderDebtItem = (debt: Debt) => {
    const account = accounts.find(acc => acc.id === debt.accountId);
    
    return (
      <TouchableOpacity 
        key={debt.id} 
        style={[
          styles.debtItem,
          debt.status === 'completed' && styles.completedDebtItem
        ]}
        onPress={() => handleDebtPress(debt)}
      >
        <View style={styles.debtHeader}>
          <View style={styles.debtInfo}>
            <Text style={styles.personName}>{debt.personName}</Text>
            <Text style={styles.debtAmount}>
              {formatCurrency(debt.amount)}
            </Text>
            {account && (
              <Text style={styles.accountInfo}>
                via {account.type === 'cash' ? account.emoji : '💳'} {account.name}
              </Text>
            )}
          </View>
          <View style={styles.debtActions}>
            <View style={[
              styles.statusBadge,
              debt.status === 'active' 
                ? { backgroundColor: theme.colors.warning + '20' }
                : { backgroundColor: theme.colors.success + '20' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: debt.status === 'active' ? theme.colors.warning : theme.colors.success }
              ]}>
                {debt.status === 'active' ? 'Active' : 'Completed'}
              </Text>
            </View>
            {debt.status === 'active' ? (
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            ) : (
              <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
            )}
          </View>
        </View>
        
        {debt.description && (
          <Text style={styles.debtDescription}>{debt.description}</Text>
        )}
        
        <View style={styles.debtFooter}>
          <Text style={styles.debtDate}>
            Created: {formatDate(debt.date)}
          </Text>
          {debt.dueDate && (
            <Text style={styles.dueDate}>
              Due: {formatDate(debt.dueDate)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
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
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.xs,
      marginBottom: theme.spacing.lg,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      borderRadius: theme.borderRadius.sm,
    },
    activeTab: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    activeTabText: {
      color: 'white',
    },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
    },
    summaryTitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    summaryAmount: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    content: {
      flex: 1,
      padding: theme.spacing.lg,
    },
    addButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    addButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    debtItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    completedDebtItem: {
      opacity: 0.7,
      borderColor: theme.colors.success + '30',
    },
    debtHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },
    debtInfo: {
      flex: 1,
    },
    personName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    debtAmount: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primary,
      marginBottom: theme.spacing.xs,
    },
    accountInfo: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    debtActions: {
      alignItems: 'flex-end',
      gap: theme.spacing.sm,
    },
    statusBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    debtDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    debtFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    debtDate: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    dueDate: {
      fontSize: 12,
      color: theme.colors.warning,
      fontWeight: '500',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
    },
    emptyIcon: {
      marginBottom: theme.spacing.lg,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    emptyDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      width: '90%',
      maxWidth: 400,
      padding: theme.spacing.lg,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
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
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    accountScrollView: {
      maxHeight: 100,
    },
    accountOption: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      alignItems: 'center',
      marginRight: theme.spacing.sm,
      minWidth: 100,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedAccountOption: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    accountEmoji: {
      fontSize: 20,
      marginBottom: theme.spacing.xs,
    },
    accountName: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    accountBalance: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    selectedAccountText: {
      color: theme.colors.primary,
    },
    modalActions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
    },
    modalButton: {
      flex: 1,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.colors.border,
    },
    confirmButton: {
      backgroundColor: theme.colors.primary,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: theme.colors.text,
    },
    confirmButtonText: {
      color: 'white',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debts</Text>
        
        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'got' && styles.activeTab]}
            onPress={() => setActiveTab('got')}
          >
            <Text style={[styles.tabText, activeTab === 'got' && styles.activeTabText]}>
              Borrowed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'gave' && styles.activeTab]}
            onPress={() => setActiveTab('gave')}
          >
            <Text style={[styles.tabText, activeTab === 'gave' && styles.activeTabText]}>
              Lent
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            Total {activeTab === 'got' ? 'Borrowed' : 'Lent'}
          </Text>
          <Text style={styles.summaryAmount}>
            {formatCurrency(getTotalAmount())}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Add Button */}
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addButtonText}>
            + Add {activeTab === 'got' ? 'Borrowed Money' : 'Lent Money'}
          </Text>
        </TouchableOpacity>

        {/* Debts List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Loading...</Text>
            </View>
          ) : debts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons 
                name="document-text-outline" 
                size={64} 
                color={theme.colors.textSecondary} 
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>
                No {activeTab === 'got' ? 'borrowed' : 'lent'} money
              </Text>
              <Text style={styles.emptyDescription}>
                {activeTab === 'got' 
                  ? "When you borrow money, it will appear here and be added to your selected account."
                  : "When you lend money, it will appear here and be deducted from your selected account."
                }
              </Text>
            </View>
          ) : (
            debts
              .sort((a, b) => {
                // First, separate by status: active first, then completed
                if (a.status !== b.status) {
                  return a.status === 'active' ? -1 : 1;
                }
                
                // Within the same status, sort by date (newest first)
                return new Date(b.date).getTime() - new Date(a.date).getTime();
              })
              .map(renderDebtItem)
          )}
        </ScrollView>
      </View>

      {/* Add Debt Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Add {activeTab === 'got' ? 'Borrowed' : 'Lent'} Money
            </Text>

            {/* Person Name */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Person Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter person's name"
                placeholderTextColor={theme.colors.textSecondary}
                value={newDebt.personName}
                onChangeText={(text) => setNewDebt(prev => ({ ...prev, personName: text }))}
              />
            </View>

            {/* Amount */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                value={newDebt.amount}
                onChangeText={(text) => setNewDebt(prev => ({ ...prev, amount: text.replace(/[^0-9.]/g, '') }))}
                keyboardType="numeric"
              />
            </View>

            {/* Account Selection */}
            {renderAccountSelector()}

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Add a note..."
                placeholderTextColor={theme.colors.textSecondary}
                value={newDebt.description}
                onChangeText={(text) => setNewDebt(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddDebt}
              >
                <Text style={[styles.modalButtonText, styles.confirmButtonText]}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 