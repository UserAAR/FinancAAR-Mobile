import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert, useToast } from '../hooks/useNotification';
import { formatCurrency } from '../utils/currency';
import { database } from '../utils/database';
import { Debt, Account } from '../types';

interface DebtDetailScreenProps {
  navigation: any;
  route: {
    params: {
      debtId: string;
    };
  };
}

export default function DebtDetailScreen({ navigation, route }: DebtDetailScreenProps) {
  const { theme } = useTheme();
  const alert = useAlert();
  const toast = useToast();
  const { debtId } = route.params;
  
  const [debt, setDebt] = useState<Debt | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  useEffect(() => {
    loadDebtDetails();
  }, []);

  const loadDebtDetails = async () => {
    try {
      setIsLoading(true);
      const allDebts = database.getDebts();
      const foundDebt = allDebts.find(d => d.id === debtId);
      const accountData = database.getAccounts();
      
      setDebt(foundDebt || null);
      setAccounts(accountData);
      
      if (accountData.length > 0) {
        setSelectedAccountId(accountData[0].id);
      }
    } catch (error) {
      console.error('Error loading debt details:', error);
      alert.error('Error', 'Failed to load debt details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepayDebt = async () => {
    if (!debt || !selectedAccountId) {
      alert.error('Error', 'Please select an account for repayment');
      return;
    }

    const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
    if (!selectedAccount) {
      alert.error('Error', 'Selected account not found');
      return;
    }

    // Check insufficient funds for borrowed money (we need to pay back)
    if (debt.type === 'got' && selectedAccount.balance < debt.amount) {
      alert.error(
        'Insufficient Funds', 
        `Account "${selectedAccount.name}" has ${formatCurrency(selectedAccount.balance)} but you need ${formatCurrency(debt.amount)} to repay this debt.`
      );
      return;
    }

    const repaymentType = debt.type === 'got' ? 'paying back' : 'collecting';
    const confirmMessage = debt.type === 'got' 
      ? `Pay back ${formatCurrency(debt.amount)} from ${selectedAccount.name} to ${debt.personName}?`
      : `Collect ${formatCurrency(debt.amount)} into ${selectedAccount.name} from ${debt.personName}?`;

    alert.confirm(
      `Confirm ${debt.type === 'got' ? 'Repayment' : 'Collection'}`,
      confirmMessage,
      async () => {
        try {
          await database.repayDebt(debtId, selectedAccountId);
          
          setShowRepayModal(false);
          toast.success(
            'Success!', 
            debt.type === 'got' 
              ? 'Debt repayment completed!' 
              : 'Money collected successfully!'
          );
          
          // Go back to debts screen
          navigation.goBack();
        } catch (error) {
          console.error('Error processing repayment:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          if (errorMessage.includes('INSUFFICIENT_FUNDS')) {
            alert.error('Insufficient Funds', errorMessage.split(': ')[1] || 'Not enough money in selected account');
          } else if (errorMessage.includes('ACCOUNT_NOT_FOUND')) {
            alert.error('Account Error', 'Selected account not found. Please select a different account.');
          } else {
            alert.error('Error', 'Failed to process debt repayment');
          }
        }
      },
      undefined,
      debt.type === 'got' ? 'Pay Back' : 'Collect',
      'Cancel'
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const renderAccountSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {debt?.type === 'got' ? 'Pay from account' : 'Collect to account'}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScrollView}>
        {accounts.map((account) => (
          <TouchableOpacity
            key={account.id}
            style={[
              styles.accountOption,
              selectedAccountId === account.id && styles.selectedAccountOption,
            ]}
            onPress={() => setSelectedAccountId(account.id)}
          >
            <Text style={styles.accountEmoji}>
              {account.type === 'cash' ? account.emoji : '💳'}
            </Text>
            <Text style={[
              styles.accountName,
              selectedAccountId === account.id && styles.selectedAccountText
            ]}>
              {account.name}
            </Text>
            <Text style={[
              styles.accountBalance,
              selectedAccountId === account.id && styles.selectedAccountText
            ]}>
              {formatCurrency(account.balance)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl + 20,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    backButtonText: {
      fontSize: 16,
      color: theme.colors.primary,
      marginLeft: theme.spacing.sm,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      padding: theme.spacing.lg,
    },
    debtCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.lg,
      alignItems: 'center',
    },
    debtType: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    personName: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    amount: {
      fontSize: 36,
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: theme.spacing.lg,
    },
    statusBadge: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.md,
    },
    statusText: {
      fontSize: 14,
      fontWeight: '600',
    },
    detailsSection: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    lastDetailRow: {
      borderBottomWidth: 0,
    },
    detailLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    detailValue: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '500',
      flex: 2,
      textAlign: 'right',
    },
    description: {
      fontSize: 16,
      color: theme.colors.text,
      lineHeight: 24,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    actionButtons: {
      gap: theme.spacing.md,
    },
    repayButton: {
      backgroundColor: theme.colors.success,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      alignItems: 'center',
    },
    repayButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.md,
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
      backgroundColor: theme.colors.success,
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.loadingText}>Loading debt details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!debt) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.loadingText}>Debt not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const originalAccount = accounts.find(acc => acc.id === debt.accountId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          <Text style={styles.backButtonText}>Back to Debts</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Debt Details</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Debt Card */}
        <View style={styles.debtCard}>
          <Text style={styles.debtType}>
            {debt.type === 'got' ? 'You Borrowed' : 'You Lent'}
          </Text>
          <Text style={styles.personName}>{debt.personName}</Text>
          <Text style={styles.amount}>{formatCurrency(debt.amount)}</Text>
          
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

          {debt.description && (
            <Text style={styles.description}>"{debt.description}"</Text>
          )}
        </View>

        {/* Details Section */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date Created</Text>
            <Text style={styles.detailValue}>{formatDate(debt.date)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time Ago</Text>
            <Text style={styles.detailValue}>{getRelativeTime(debt.date)}</Text>
          </View>

          {originalAccount && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Original Account</Text>
              <Text style={styles.detailValue}>
                {originalAccount.type === 'cash' ? originalAccount.emoji : '💳'} {originalAccount.name}
              </Text>
            </View>
          )}

          {debt.dueDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={styles.detailValue}>{formatDate(debt.dueDate)}</Text>
            </View>
          )}

          <View style={[styles.detailRow, styles.lastDetailRow]}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={[
              styles.detailValue,
              { color: debt.status === 'active' ? theme.colors.warning : theme.colors.success }
            ]}>
              {debt.status === 'active' ? 'Active' : 'Completed'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        {debt.status === 'active' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.repayButton} 
              onPress={() => setShowRepayModal(true)}
            >
              <Text style={styles.repayButtonText}>
                {debt.type === 'got' ? '💳 Pay Back' : '💰 Collect Money'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Repayment Modal */}
      <Modal
        visible={showRepayModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRepayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {debt.type === 'got' ? 'Pay Back Debt' : 'Collect Money'}
            </Text>

            {/* Account Selection */}
            {renderAccountSelector()}

            {/* Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount</Text>
                <Text style={styles.detailValue}>{formatCurrency(debt.amount)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Person</Text>
                <Text style={styles.detailValue}>{debt.personName}</Text>
              </View>
              <View style={[styles.detailRow, styles.lastDetailRow]}>
                <Text style={styles.detailLabel}>
                  {debt.type === 'got' ? 'Payment from' : 'Collection to'}
                </Text>
                <Text style={styles.detailValue}>
                  {accounts.find(acc => acc.id === selectedAccountId)?.name || 'Select account'}
                </Text>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRepayModal(false)}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleRepayDebt}
              >
                <Text style={[styles.modalButtonText, styles.confirmButtonText]}>
                  {debt.type === 'got' ? 'Pay Back' : 'Collect'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 