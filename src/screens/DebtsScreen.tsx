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
import { Debt, DebtType } from '../types';

export default function DebtsScreen() {
  const { theme } = useTheme();
  const alert = useAlert();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'got' | 'gave'>('got');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDebt, setNewDebt] = useState({
    personName: '',
    amount: '',
    description: '',
    dueDate: '',
  });

  useEffect(() => {
    loadDebts();
  }, [activeTab]);

  const loadDebts = async () => {
    try {
      setIsLoading(true);
      const debtData = database.getDebts(activeTab);
      setDebts(debtData);
    } catch (error) {
      console.error('Error loading debts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDebts();
    setRefreshing(false);
  };

  const handleAddDebt = async () => {
    if (!newDebt.personName.trim() || !newDebt.amount.trim()) {
      alert.error('Missing Information', 'Please fill in person name and amount');
      return;
    }

    const amount = parseFloat(newDebt.amount);
    if (isNaN(amount) || amount <= 0) {
      alert.error('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    try {
      await database.createDebt({
        type: activeTab,
        personName: newDebt.personName.trim(),
        amount: amount,
        description: newDebt.description.trim() || undefined,
        date: new Date(),
        dueDate: newDebt.dueDate ? new Date(newDebt.dueDate) : undefined,
        status: 'active',
      });

      setNewDebt({
        personName: '',
        amount: '',
        description: '',
        dueDate: '',
      });
      setShowAddModal(false);
      toast.success('Debt Added!', `${activeTab === 'got' ? 'Borrowed' : 'Lent'} amount recorded successfully`);
      await loadDebts();
    } catch (error) {
      console.error('Error creating debt:', error);
      alert.error('Error', 'Failed to create debt');
    }
  };

  const handleMarkPaid = async (debtId: string) => {
    alert.confirm(
      'Mark as Paid',
      'Are you sure you want to mark this debt as paid?',
      async () => {
        try {
          database.updateDebtStatus(debtId, 'closed');
          toast.success('Debt Closed!', 'Debt has been marked as paid');
          await loadDebts();
        } catch (error) {
          console.error('Error updating debt status:', error);
          alert.error('Error', 'Failed to update debt status');
        }
      },
      undefined,
      'Mark as Paid',
      'Cancel'
    );
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

  const renderDebtItem = (debt: Debt) => (
    <View key={debt.id} style={styles.debtItem}>
      <View style={styles.debtHeader}>
        <View style={styles.debtInfo}>
          <Text style={styles.personName}>{debt.personName}</Text>
          <Text style={styles.debtAmount}>
            {formatCurrency(debt.amount)}
          </Text>
        </View>
        <View style={styles.debtActions}>
          <TouchableOpacity
            style={[
              styles.statusBadge,
              debt.status === 'active' 
                ? { backgroundColor: theme.colors.warning + '20' }
                : { backgroundColor: theme.colors.success + '20' }
            ]}
          >
            <Text style={[
              styles.statusText,
              { color: debt.status === 'active' ? theme.colors.warning : theme.colors.success }
            ]}>
              {debt.status === 'active' ? 'Active' : 'Paid'}
            </Text>
          </TouchableOpacity>
          {debt.status === 'active' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleMarkPaid(debt.id)}
            >
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            </TouchableOpacity>
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
      marginBottom: theme.spacing.md,
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
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    activeTabText: {
      color: 'white',
    },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      alignItems: 'center',
    },
    summaryAmount: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: theme.spacing.xs,
    },
    summaryLabel: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    addButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      margin: theme.spacing.md,
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
    debtItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    debtHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    debtActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
      marginRight: theme.spacing.sm,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    actionButton: {
      padding: theme.spacing.xs,
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
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.md,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      margin: theme.spacing.lg,
      width: '90%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    inputContainer: {
      marginBottom: theme.spacing.md,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
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
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: theme.spacing.lg,
    },
    modalButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      marginHorizontal: theme.spacing.xs,
    },
    cancelButton: {
      backgroundColor: theme.colors.surface,
    },
    confirmButton: {
      backgroundColor: theme.colors.primary,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: theme.colors.textSecondary,
    },
    confirmButtonText: {
      color: 'white',
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.emptyState]}>
        <Ionicons name="hourglass" size={64} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>Loading debts...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debts</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'got' && styles.activeTab]}
            onPress={() => setActiveTab('got')}
          >
            <Text style={[styles.tabText, activeTab === 'got' && styles.activeTabText]}>
              I Borrowed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'gave' && styles.activeTab]}
            onPress={() => setActiveTab('gave')}
          >
            <Text style={[styles.tabText, activeTab === 'gave' && styles.activeTabText]}>
              I Lent
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryAmount}>
          {formatCurrency(getTotalAmount())}
        </Text>
        <Text style={styles.summaryLabel}>
          Total {activeTab === 'got' ? 'Borrowed' : 'Lent'}
        </Text>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={24} color="white" />
        <Text style={styles.addButtonText}>
          Add {activeTab === 'got' ? 'Borrowed' : 'Lent'} Amount
        </Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {debts.length > 0 ? (
          debts.map(renderDebtItem)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>
              No {activeTab === 'got' ? 'borrowed' : 'lent'} amounts yet.{'\n'}
              Tap the button above to add one.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Debt Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Add {activeTab === 'got' ? 'Borrowed' : 'Lent'} Amount
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Person Name *</Text>
              <TextInput
                style={styles.input}
                value={newDebt.personName}
                onChangeText={(text) => setNewDebt(prev => ({ ...prev, personName: text }))}
                placeholder="Enter person's name"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Amount *</Text>
              <TextInput
                style={styles.input}
                value={newDebt.amount}
                onChangeText={(text) => setNewDebt(prev => ({ ...prev, amount: text }))}
                placeholder="Enter amount"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.input}
                value={newDebt.description}
                onChangeText={(text) => setNewDebt(prev => ({ ...prev, description: text }))}
                placeholder="Optional description"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
              />
            </View>

            <View style={styles.modalButtons}>
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
                  Add Debt
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 