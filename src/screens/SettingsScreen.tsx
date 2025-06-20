import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  FlatList 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useBiometric } from '../hooks/useBiometric';
import { useAlert, useToast, useNotification } from '../hooks/useNotification';
import { database } from '../utils/database';
import { Account, CardAccount } from '../types';
import * as Crypto from 'expo-crypto';

type SettingItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  type: 'navigation' | 'switch' | 'action';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  destructive?: boolean;
  requiresSecurity?: boolean;
};

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { authState, updateAuthSettings, authenticateWithPin } = useAuth();
  const biometric = useBiometric();
  const alert = useAlert();
  const toast = useToast();
  const { showAlert } = useNotification();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [newName, setNewName] = useState(authState.userName);
  const [verificationPin, setVerificationPin] = useState('');
  const [pendingAction, setPendingAction] = useState<() => void>(() => {});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountBalance, setEditAccountBalance] = useState('');
  const [editAccountColor, setEditAccountColor] = useState('#00D2AA');
  const [newAccountType, setNewAccountType] = useState<'cash' | 'card'>('card');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [newAccountColor, setNewAccountColor] = useState('#00D2AA');
  const [newAccountEmoji, setNewAccountEmoji] = useState('');

  const cardColors = [
    '#00D2AA', '#4CAF50', '#2196F3', '#FF9800', '#E91E63', 
    '#9C27B0', '#607D8B', '#795548', '#FF5722', '#009688'
  ];

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = () => {
    const loadedAccounts = database.getAccounts();
    setAccounts(loadedAccounts);
  };

  const verifyWithBiometric = async (onSuccess: () => void): Promise<void> => {
    try {
      const result = await biometric.authenticate();
      if (result.success) {
        onSuccess();
      } else {
        // Fallback to PIN
        setShowSecurityModal(true);
      }
    } catch (error) {
      alert.error('Authentication Error', 'Failed to authenticate. Please enter your PIN.');
      setShowSecurityModal(true);
    }
  };

  const verifyWithPin = async (): Promise<void> => {
    try {
      const isValid = await authenticateWithPin(verificationPin);
      if (isValid) {
        setShowSecurityModal(false);
        setVerificationPin('');
        pendingAction();
      } else {
        alert.error('Incorrect PIN', 'The PIN you entered is incorrect. Please try again.');
        setVerificationPin('');
      }
    } catch (error) {
      alert.error('Verification Error', 'Failed to verify PIN. Please try again.');
    }
  };

  const requireSecurity = (action: () => void): void => {
    setPendingAction(() => action);
    
    const canUseBiometric = authState.biometricEnabled && biometric.canUseBiometric;
    
    if (canUseBiometric) {
      verifyWithBiometric(action);
    } else {
      setShowSecurityModal(true);
    }
  };

  const createSecureDeleteAction = (
    title: string,
    message: string,
    deleteAction: () => void,
    successMessage: string
  ) => {
    return () => {
      requireSecurity(() => {
        alert.confirm(
          title,
          message,
          () => {
            try {
              deleteAction();
              toast.success('Data Deleted!', successMessage);
            } catch (error) {
              alert.error('Error', `Failed to ${title.toLowerCase()}`);
            }
          },
          undefined,
          'Delete',
          'Cancel'
        );
      });
    };
  };

  const handleThemeChange = () => {
    showAlert({
      type: 'info',
      title: 'Select Theme',
      message: 'Choose your preferred theme',
      primaryButton: {
        text: 'Light',
        onPress: () => setThemeMode('light'),
      },
      secondaryButton: {
        text: 'More Options',
        onPress: () => {
          setTimeout(() => {
            showAlert({
              type: 'info',
              title: 'Theme Options',
              message: 'Select Dark or System theme',
              primaryButton: {
                text: 'Dark',
                onPress: () => setThemeMode('dark'),
              },
              secondaryButton: {
                text: 'System',
                onPress: () => setThemeMode('system'),
              },
            });
          }, 100);
        },
      },
    });
  };

  const handlePinLengthChange = () => {
    showAlert({
      type: 'info',
      title: 'PIN Length',
      message: 'Choose your preferred PIN length',
      primaryButton: {
        text: '4 digits',
        onPress: async () => {
          try {
            await updateAuthSettings({ pinLength: 4 });
            toast.success('PIN Length Updated', 'Now using 4-digit PIN');
          } catch (error) {
            alert.error('Error', 'Failed to update PIN length');
          }
        },
      },
      secondaryButton: {
        text: '6 digits',
        onPress: async () => {
          try {
            await updateAuthSettings({ pinLength: 6 });
            toast.success('PIN Length Updated', 'Now using 6-digit PIN');
          } catch (error) {
            alert.error('Error', 'Failed to update PIN length');
          }
        },
      },
    });
  };

  const handleChangePin = async () => {
    if (newPin.length !== authState.pinLength) {
      alert.error('Invalid PIN Length', `PIN must be ${authState.pinLength} digits`);
      return;
    }

    if (newPin !== confirmPin) {
      alert.error('PIN Mismatch', 'PINs do not match. Please try again.');
      return;
    }

    try {
      await updateAuthSettings({ pin: newPin });
      setNewPin('');
      setConfirmPin('');
      setShowPinModal(false);
      toast.success('PIN Updated!', 'Your PIN has been changed successfully');
    } catch (error) {
      alert.error('Error', 'Failed to change PIN');
    }
  };

  const handleChangeName = async () => {
    if (!newName.trim()) {
      alert.error('Invalid Name', 'Name cannot be empty');
      return;
    }

    try {
      await updateAuthSettings({ userName: newName.trim() });
      setShowNameModal(false);
      toast.success('Name Updated!', 'Your name has been updated successfully');
    } catch (error) {
      alert.error('Error', 'Failed to update name');
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        await biometric.enable();
      } else {
        await biometric.disable();
      }
      await updateAuthSettings({ biometricEnabled: enabled });
      toast.success('Biometric Settings Updated', `Biometric login ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      alert.error('Error', 'Failed to update biometric settings');
    }
  };

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setEditAccountName(account.name);
    setEditAccountBalance(account.balance.toString());
    setEditAccountColor(account.type === 'card' ? (account as CardAccount).color : '#00D2AA');
    setShowAccountModal(true);
  };

  const handleSaveAccount = async () => {
    if (!selectedAccount || !editAccountName.trim() || !editAccountBalance.trim()) {
      alert.error('Invalid Input', 'Please fill all required fields');
      return;
    }

    const balance = parseFloat(editAccountBalance);
    if (isNaN(balance)) {
      alert.error('Invalid Balance', 'Please enter a valid balance amount');
      return;
    }

    try {
      const db = database as any;
      const now = new Date().toISOString();
      
      if (selectedAccount.type === 'card') {
        db.ensureDatabase().runSync(
          'UPDATE accounts SET name = ?, balance = ?, color = ?, updated_at = ? WHERE id = ?',
          [editAccountName.trim(), balance, editAccountColor, now, selectedAccount.id]
        );
      } else {
        db.ensureDatabase().runSync(
          'UPDATE accounts SET name = ?, balance = ?, updated_at = ? WHERE id = ?',
          [editAccountName.trim(), balance, now, selectedAccount.id]
        );
      }

      setShowAccountModal(false);
      setSelectedAccount(null);
      loadAccounts();
      toast.success('Account Updated!', 'Account has been updated successfully');
    } catch (error) {
      alert.error('Error', 'Failed to update account');
    }
  };

  const handleDeleteAccount = (account: Account) => {
    requireSecurity(() => {
      alert.confirm(
        'Delete Account',
        `This will delete "${account.name}" and all its related transactions. This action cannot be undone.`,
        () => {
          try {
            const db = database as any;
            db.ensureDatabase().execSync('DELETE FROM transactions WHERE account_id = ? OR to_account_id = ?', [account.id, account.id]);
            db.ensureDatabase().runSync('DELETE FROM accounts WHERE id = ?', [account.id]);
            loadAccounts();
            toast.success('Account Deleted!', 'Account has been deleted successfully');
          } catch (error) {
            alert.error('Error', 'Failed to delete account');
          }
        },
        undefined,
        'Delete',
        'Cancel'
      );
    });
  };

  const handleAddAccount = async () => {
    if (!newAccountName.trim() || !newAccountBalance.trim()) {
      alert.error('Invalid Input', 'Please fill all required fields');
      return;
    }

    const balance = parseFloat(newAccountBalance);
    if (isNaN(balance)) {
      alert.error('Invalid Balance', 'Please enter a valid balance amount');
      return;
    }

    try {
      if (newAccountType === 'card') {
        await database.createAccount({
          type: 'card',
          name: newAccountName.trim(),
          balance,
          color: newAccountColor,
          emoji: newAccountEmoji || undefined,
        } as Omit<CardAccount, 'id' | 'createdAt' | 'updatedAt'>);
      } else {
        await database.createAccount({
          type: 'cash',
          name: newAccountName.trim(),
          balance,
          emoji: newAccountEmoji || undefined,
        });
      }

      setShowAddAccountModal(false);
      setNewAccountName('');
      setNewAccountBalance('');
      setNewAccountColor('#00D2AA');
      setNewAccountEmoji('');
      loadAccounts();
      toast.success('Account Added!', 'New account has been created successfully');
    } catch (error) {
      alert.error('Error', 'Failed to create account');
    }
  };

  const getCurrentThemeName = () => {
    switch (themeMode) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'System';
      default: return 'System';
    }
  };

  const settingSections = [
    {
      title: 'Account',
      items: [
        {
          id: 'user-name',
          title: 'Name',
          subtitle: authState.userName,
          icon: 'person',
          type: 'navigation' as const,
          onPress: () => setShowNameModal(true),
        },
      ],
    },
    {
      title: 'Account Management',
      items: [
        {
          id: 'manage-accounts',
          title: 'Manage Accounts',
          subtitle: 'Edit, delete or add cash and card accounts',
          icon: 'wallet',
          type: 'navigation' as const,
          onPress: () => {
            loadAccounts();
            setShowAccountModal(true);
          },
        },
        {
          id: 'add-account',
          title: 'Add New Account',
          subtitle: 'Create new cash or card account',
          icon: 'add-circle',
          type: 'navigation' as const,
          onPress: () => setShowAddAccountModal(true),
        },
        {
          id: 'clear-accounts',
          title: 'Clear All Accounts',
          subtitle: 'Delete all cash and card accounts',
          icon: 'trash',
          type: 'action' as const,
          onPress: createSecureDeleteAction(
            'Clear All Accounts',
            'This will delete all your accounts (cash and cards) and related transactions. This action cannot be undone.',
            () => database.clearAllAccounts(),
            'All accounts have been cleared successfully'
          ),
          destructive: true,
          requiresSecurity: true,
        },
        {
          id: 'clear-card-accounts',
          title: 'Clear Card Accounts',
          subtitle: 'Delete only card accounts and their transactions',
          icon: 'card',
          type: 'action' as const,
          onPress: createSecureDeleteAction(
            'Clear Card Accounts',
            'This will delete all your card accounts and their related transactions. Cash accounts will remain. This action cannot be undone.',
            () => database.clearCardAccounts(),
            'All card accounts have been cleared successfully'
          ),
          destructive: true,
          requiresSecurity: true,
        },
        {
          id: 'clear-cash-accounts',
          title: 'Clear Cash Accounts',
          subtitle: 'Delete only cash accounts and their transactions',
          icon: 'cash',
          type: 'action' as const,
          onPress: createSecureDeleteAction(
            'Clear Cash Accounts',
            'This will delete all your cash accounts and their related transactions. Card accounts will remain. This action cannot be undone.',
            () => database.clearCashAccounts(),
            'All cash accounts have been cleared successfully'
          ),
          destructive: true,
          requiresSecurity: true,
        },
      ],
    },
    {
      title: 'Security',
      items: [
        {
          id: 'pin-length',
          title: 'PIN Length',
          subtitle: `${authState.pinLength} digits`,
          icon: 'keypad',
          type: 'navigation' as const,
          onPress: handlePinLengthChange,
        },
        {
          id: 'change-pin',
          title: 'Change PIN',
          subtitle: 'Update your security PIN',
          icon: 'lock-closed',
          type: 'navigation' as const,
          onPress: () => setShowPinModal(true),
        },
        {
          id: 'biometric',
          title: 'Biometric Login',
          subtitle: 'Use fingerprint or face unlock',
          icon: 'finger-print',
          type: 'switch' as const,
          value: authState.biometricEnabled && biometric.canUseBiometric,
          onToggle: handleBiometricToggle,
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          id: 'theme',
          title: 'Theme',
          subtitle: getCurrentThemeName(),
          icon: 'color-palette',
          type: 'navigation' as const,
          onPress: handleThemeChange,
        },
      ],
    },
    {
      title: 'Data',
      items: [
        {
          id: 'clear-data',
          title: 'Clear All Data',
          subtitle: 'Delete all transactions, accounts, categories and debts',
          icon: 'trash',
          type: 'action' as const,
          onPress: createSecureDeleteAction(
            'Clear All Data',
            'This will delete ALL your data including transactions, accounts, categories, and debts. This action cannot be undone.',
            () => database.clearAllData(),
            'All data has been cleared successfully'
          ),
          destructive: true,
          requiresSecurity: true,
        },
        {
          id: 'clear-transactions',
          title: 'Clear Transactions',
          subtitle: 'Delete all transaction history',
          icon: 'receipt',
          type: 'action' as const,
          onPress: createSecureDeleteAction(
            'Clear Transactions',
            'This will delete all your transaction history. Account balances will remain unchanged. This action cannot be undone.',
            () => database.clearTransactions(),
            'All transactions have been cleared successfully'
          ),
          destructive: true,
          requiresSecurity: true,
        },
        {
          id: 'clear-debts',
          title: 'Clear Debts',
          subtitle: 'Delete all debt records and payments',
          icon: 'people',
          type: 'action' as const,
          onPress: createSecureDeleteAction(
            'Clear Debts',
            'This will delete all your debt records (both borrowed and lent) and payment history. This action cannot be undone.',
            () => database.clearDebts(),
            'All debt records have been cleared successfully'
          ),
          destructive: true,
          requiresSecurity: true,
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={item.onPress}
      disabled={item.type === 'switch'}
    >
      <View style={styles.settingLeft}>
        <View style={[
          styles.iconContainer,
          item.destructive && { backgroundColor: theme.colors.error + '20' }
        ]}>
          <Ionicons 
            name={item.icon as any} 
            size={24} 
            color={item.destructive ? theme.colors.error : theme.colors.primary} 
          />
        </View>
        <View style={styles.settingText}>
          <Text style={[
            styles.settingTitle,
            item.destructive && { color: theme.colors.error }
          ]}>
            {item.title}
          </Text>
          {item.subtitle && (
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {item.type === 'switch' ? (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={item.value ? 'white' : theme.colors.textSecondary}
          />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg + 20,
      paddingBottom: theme.spacing.md,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      backgroundColor: theme.colors.primary + '20',
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
      marginRight: theme.spacing.md,
    },
    settingText: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    settingSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    settingRight: {
      alignItems: 'center',
      justifyContent: 'center',
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
    modalSubtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
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
      textAlign: 'center',
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
    appInfo: {
      alignItems: 'center',
      padding: theme.spacing.lg,
      marginTop: theme.spacing.lg,
    },
    appName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    appVersion: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    accountItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
    },
    accountInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    accountIcon: {
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
      marginRight: theme.spacing.md,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountDetails: {
      flex: 1,
    },
    accountName: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    accountBalance: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.primary,
      marginBottom: theme.spacing.xs,
    },
    accountType: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    accountTypeBadge: {
      backgroundColor: theme.colors.border,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
      alignSelf: 'flex-start',
    },
    accountTypeText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    accountActions: {
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: theme.spacing.xs,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      minWidth: 80,
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    typeSelector: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    typeOption: {
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      marginHorizontal: theme.spacing.xs,
    },
    selectedType: {
      backgroundColor: theme.colors.primary,
    },
    selectedTypeText: {
      fontWeight: 'bold',
      color: 'white',
    },
    typeText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
    },
    colorPicker: {
      flexDirection: 'row',
    },
    colorOption: {
      width: 30,
      height: 30,
      borderRadius: theme.borderRadius.sm,
      marginHorizontal: theme.spacing.xs,
    },
    selectedColor: {
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    accountEmoji: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
    },
    closeButton: {
      padding: theme.spacing.sm,
    },
    accountCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    accountCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: 'white',
      marginLeft: theme.spacing.xs,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginTop: theme.spacing.md,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    addAccountButton: {
      backgroundColor: theme.colors.primary,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      marginTop: theme.spacing.lg,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {settingSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map(renderSettingItem)}
          </View>
        ))}

        <View style={styles.appInfo}>
          <Text style={styles.appName}>FinancAAR</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Change PIN Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Change PIN</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New PIN ({authState.pinLength} digits)</Text>
              <TextInput
                style={styles.input}
                value={newPin}
                onChangeText={setNewPin}
                placeholder="Enter new PIN"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
                secureTextEntry
                maxLength={authState.pinLength}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm PIN</Text>
              <TextInput
                style={styles.input}
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder="Confirm new PIN"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
                secureTextEntry
                maxLength={authState.pinLength}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setNewPin('');
                  setConfirmPin('');
                  setShowPinModal(false);
                }}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleChangePin}
              >
                <Text style={[styles.modalButtonText, styles.confirmButtonText]}>
                  Change PIN
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Name Modal */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Change Name</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Your Name</Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="Enter your name"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setNewName(authState.userName);
                  setShowNameModal(false);
                }}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleChangeName}
              >
                <Text style={[styles.modalButtonText, styles.confirmButtonText]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Security Verification Modal */}
      <Modal
        visible={showSecurityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSecurityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Security Verification</Text>
            
            <View style={[styles.iconContainer, { alignSelf: 'center', marginBottom: theme.spacing.lg, backgroundColor: theme.colors.warning + '20' }]}>
              <Ionicons name="shield-checkmark" size={32} color={theme.colors.warning} />
            </View>

            <Text style={[styles.modalSubtitle, { textAlign: 'center', marginBottom: theme.spacing.lg }]}>
              Enter your PIN to continue with this action
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Enter PIN ({authState.pinLength} digits)</Text>
              <TextInput
                style={styles.input}
                value={verificationPin}
                onChangeText={setVerificationPin}
                placeholder={`Enter ${authState.pinLength}-digit PIN`}
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
                secureTextEntry
                maxLength={authState.pinLength}
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setVerificationPin('');
                  setShowSecurityModal(false);
                }}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={verifyWithPin}
                disabled={verificationPin.length !== authState.pinLength}
              >
                <Text style={[styles.modalButtonText, styles.confirmButtonText]}>
                  Verify
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Account Management Modal */}
      <Modal
        visible={showAccountModal && !selectedAccount}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAccountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '85%', width: '95%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Accounts</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAccountModal(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={accounts}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: theme.spacing.sm }}
              renderItem={({ item }) => (
                <View style={styles.accountCard}>
                  <View style={styles.accountCardContent}>
                    <View style={styles.accountInfo}>
                      <View style={[
                        styles.accountIcon,
                        { 
                          backgroundColor: item.type === 'card' 
                            ? (item as CardAccount).color || theme.colors.primary
                            : theme.colors.primary 
                        }
                      ]}>
                        <Text style={styles.accountEmoji}>
                          {item.emoji || (item.type === 'card' ? '💳' : '💵')}
                        </Text>
                      </View>
                      <View style={styles.accountDetails}>
                        <Text style={styles.accountName}>{item.name}</Text>
                        <Text style={styles.accountBalance}>{item.balance.toFixed(2)} ₼</Text>
                        <View style={styles.accountTypeBadge}>
                          <Text style={styles.accountTypeText}>
                            {item.type === 'card' ? 'Card' : 'Cash'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.accountActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                        onPress={() => handleEditAccount(item)}
                      >
                        <Ionicons name="create-outline" size={18} color="white" />
                        <Text style={styles.actionButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
                        onPress={() => handleDeleteAccount(item)}
                      >
                        <Ionicons name="trash-outline" size={18} color="white" />
                        <Text style={styles.actionButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Ionicons name="wallet-outline" size={48} color={theme.colors.textSecondary} />
                  <Text style={styles.emptyTitle}>No Accounts Found</Text>
                  <Text style={styles.emptySubtitle}>Add your first account to get started</Text>
                </View>
              )}
            />

            <TouchableOpacity
              style={[styles.modalButton, styles.addAccountButton]}
              onPress={() => {
                setShowAccountModal(false);
                setShowAddAccountModal(true);
              }}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={[styles.modalButtonText, { color: 'white', marginLeft: theme.spacing.xs }]}>
                Add New Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Account Modal */}
      <Modal
        visible={showAccountModal && selectedAccount !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowAccountModal(false);
          setSelectedAccount(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Account</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Account Name</Text>
              <TextInput
                style={styles.input}
                value={editAccountName}
                onChangeText={setEditAccountName}
                placeholder="Enter account name"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Balance (₼)</Text>
              <TextInput
                style={styles.input}
                value={editAccountBalance}
                onChangeText={setEditAccountBalance}
                placeholder="Enter balance"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            {selectedAccount?.type === 'card' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Card Color</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.colorPicker}
                  contentContainerStyle={{ alignItems: 'center' }}
                >
                  {cardColors.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        editAccountColor === color && styles.selectedColor
                      ]}
                      onPress={() => setEditAccountColor(color)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAccountModal(false);
                  setSelectedAccount(null);
                }}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSaveAccount}
              >
                <Text style={[styles.modalButtonText, styles.confirmButtonText]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Account Modal */}
      <Modal
        visible={showAddAccountModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddAccountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add New Account</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Account Type</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    newAccountType === 'cash' && styles.selectedType
                  ]}
                  onPress={() => setNewAccountType('cash')}
                >
                  <Text style={[
                    styles.typeText,
                    newAccountType === 'cash' && styles.selectedTypeText
                  ]}>Cash</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    newAccountType === 'card' && styles.selectedType
                  ]}
                  onPress={() => setNewAccountType('card')}
                >
                  <Text style={[
                    styles.typeText,
                    newAccountType === 'card' && styles.selectedTypeText
                  ]}>Card</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Account Name</Text>
              <TextInput
                style={styles.input}
                value={newAccountName}
                onChangeText={setNewAccountName}
                placeholder="Enter account name"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Initial Balance (₼)</Text>
              <TextInput
                style={styles.input}
                value={newAccountBalance}
                onChangeText={setNewAccountBalance}
                placeholder="Enter initial balance"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Emoji (Optional)</Text>
              <TextInput
                style={styles.input}
                value={newAccountEmoji}
                onChangeText={setNewAccountEmoji}
                placeholder="Choose an emoji"
                placeholderTextColor={theme.colors.textSecondary}
                maxLength={1}
              />
            </View>

            {newAccountType === 'card' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Card Color</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.colorPicker}
                  contentContainerStyle={{ alignItems: 'center' }}
                >
                  {cardColors.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        newAccountColor === color && styles.selectedColor
                      ]}
                      onPress={() => setNewAccountColor(color)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddAccountModal(false);
                  setNewAccountName('');
                  setNewAccountBalance('');
                  setNewAccountColor('#00D2AA');
                  setNewAccountEmoji('');
                }}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddAccount}
              >
                <Text style={[styles.modalButtonText, styles.confirmButtonText]}>
                  Add Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
} 