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
import AppLogo from '../components/AppLogo';
import { useAIApiKey } from '../hooks/useSecureStorage';
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

type AIProvider = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { authState, userPreferences, updateUserPreferences, updateUserName, authenticateWithPin, changePin, resetApp } = useAuth();
  const biometric = useBiometric();
  const alert = useAlert();
  const toast = useToast();
  const { showAlert, hideAlert } = useNotification();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
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
  const [targetPinLength, setTargetPinLength] = useState<4 | 6>(4);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);
  const [newAPIKey, setNewAPIKey] = useState('');
  const [selectedAIProvider, setSelectedAIProvider] = useState<AIProvider | null>(null);
  const [aiKeyState, setAIKeyState] = useAIApiKey();
  const currentAIKey = aiKeyState[1];
  const setCurrentAIKey = (value: string | null) => setAIKeyState(value);

  const aiProviders: AIProvider[] = [
    { id: 'gemini', name: 'Google Gemini', description: 'Google\'s latest AI model', icon: 'diamond' },
    { id: 'chatgpt', name: 'ChatGPT', description: 'OpenAI\'s conversational AI', icon: 'chatbubbles' },
    { id: 'claude', name: 'Anthropic Claude', description: 'Anthropic\'s AI assistant', icon: 'library' },
    { id: 'grok', name: 'Grok (X AI)', description: 'X\'s AI with real-time data', icon: 'flash' },
    { id: 'deepseek', name: 'DeepSeek', description: 'Advanced reasoning AI model', icon: 'telescope' },
    { id: 'mistral', name: 'Mistral AI', description: 'European AI excellence', icon: 'rocket' },
    { id: 'llama', name: 'Meta Llama', description: 'Meta\'s open-source AI', icon: 'layers' },
    { id: 'cohere', name: 'Cohere', description: 'Enterprise AI platform', icon: 'business' },
  ];

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
    setShowThemeModal(true);
  };

  const handleThemeSelect = async (theme: 'light' | 'dark' | 'system') => {
    try {
      setThemeMode(theme);
      await updateUserPreferences({ theme });
      setShowThemeModal(false);
      toast.success('Theme Updated!', `Theme changed to ${theme === 'system' ? 'system default' : theme}`);
    } catch (error) {
      alert.error('Error', 'Failed to update theme');
    }
  };

    const handlePinLengthChange = () => {
    showAlert({
      type: 'info',
      title: 'Change PIN Length',
      message: `Current: ${authState.pinLength} digits. Choose new length:`,
      primaryButton: {
        text: authState.pinLength === 4 ? '6 digits (New)' : '4 digits (New)',
        onPress: () => {
          hideAlert(); // Close PIN length alert first
          handlePinLengthChangeWithNewPin(authState.pinLength === 4 ? 6 : 4);
        },
      },
      secondaryButton: {
        text: 'Cancel',
        onPress: () => hideAlert(),
      },
    });
  };

  const handlePinLengthChangeWithNewPin = (newLength: 4 | 6) => {
    if (newLength === authState.pinLength) {
      toast.info('No Change Needed', `PIN length is already ${newLength} digits`);
      return;
    }

    // Set target PIN length for this change
    setTargetPinLength(newLength);
    
    // Reset PIN change form for new length
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    
    // Small delay to ensure alert is closed before opening modal
    setTimeout(() => {
      setShowPinModal(true);
      toast.info('Set New PIN', `Please set a new ${newLength}-digit PIN`);
    }, 200);
  };

  const handleChangePin = async () => {
    // Validation 1: Current PIN required
    if (!currentPin.trim()) {
      alert.error('Current PIN Required', 'Please enter your current PIN');
      return;
    }

    if (currentPin.length !== authState.pinLength) {
      alert.error('Invalid Current PIN', `Current PIN must be ${authState.pinLength} digits`);
      return;
    }

    // Validation 2: New PIN length
    const targetLength = getTargetPinLength();
    if (newPin.length !== targetLength) {
      alert.error('Invalid PIN Length', `New PIN must be exactly ${targetLength} digits`);
      return;
    }

    // Validation 3: PIN confirmation match
    if (newPin !== confirmPin) {
      alert.error('PIN Mismatch', 'New PIN and confirmation do not match');
      return;
    }

    // Validation 4: New PIN different from current
    if (currentPin === newPin) {
      alert.error('Same PIN', 'New PIN must be different from current PIN');
      return;
    }

    try {
      const success = await changePin(currentPin, newPin);
      
      if (success) {
        // Clear form and reset target length to new PIN length
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setTargetPinLength(newPin.length as 4 | 6); // Reset to new current length
        setShowPinModal(false);
        
        toast.success('PIN Updated!', `Your ${newPin.length}-digit PIN has been changed successfully`);
      } else {
        alert.error('Invalid Current PIN', 'The current PIN you entered is incorrect');
      }
    } catch (error) {
      alert.error('Error', 'Failed to change PIN. Please try again.');
    }
  };

  // Helper to determine target PIN length (for length changes)
  const getTargetPinLength = (): 4 | 6 => {
    // If changing PIN length, use target length, otherwise use current length
    return targetPinLength !== authState.pinLength ? targetPinLength : authState.pinLength;
  };

  const handleChangeName = async () => {
    if (!newName.trim()) {
      alert.error('Invalid Name', 'Name cannot be empty');
      return;
    }

    try {
      await updateUserName(newName.trim());
      setShowNameModal(false);
      toast.success('Name Updated!', 'Your name has been updated successfully');
    } catch (error) {
      alert.error('Error', 'Failed to update name');
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    try {
      if (enabled && !biometric.canUseBiometric) {
        alert.error('Biometric Not Available', 'Biometric authentication is not available on this device');
        return;
      }
      
      if (enabled) {
        // Test biometric authentication before enabling
        const result = await biometric.authenticate();
        if (!result.success) {
          alert.error('Biometric Authentication Failed', 'Please set up biometric authentication in your device settings first');
          return;
        }
      }
      
      await updateUserPreferences({ biometricEnabled: enabled });
      toast.success('Biometric Settings Updated', `Biometric login ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Biometric toggle error:', error);
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

  const handleSaveAPIKey = async () => {
    if (!selectedAIProvider) {
      alert.error('AI Provider Required', 'Please select an AI provider first');
      return;
    }

    if (!newAPIKey.trim()) {
      alert.error('Invalid Key', 'Please enter a valid API key');
      return;
    }

    try {
      setCurrentAIKey(newAPIKey.trim());
      setShowDeveloperModal(false);
      setNewAPIKey('');
      setSelectedAIProvider(null);
      toast.success('API Key Saved!', `Your ${selectedAIProvider.name} API key has been securely stored`);
    } catch (error) {
      alert.error('Error', 'Failed to save API key');
    }
  };

  const handleDeleteAPIKey = () => {
    alert.confirm(
      'Delete API Key',
      'This will remove your stored API key. You won\'t be able to use AI features until you add a new key.',
      () => {
        setCurrentAIKey(null);
        setSelectedAIProvider(null);
        toast.success('API Key Deleted!', 'API key has been removed');
      }
    );
  };

  const handleDeveloperSettings = () => {
    requireSecurity(() => {
      setNewAPIKey(currentAIKey || '');
      setShowDeveloperModal(true);
    });
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
          onPress: () => {
            setTargetPinLength(authState.pinLength); // Reset to current length for normal PIN change
            setShowPinModal(true);
          },
        },
        {
          id: 'biometric',
          title: 'Biometric Login',
          subtitle: biometric.canUseBiometric 
            ? 'Use fingerprint or face unlock' 
            : 'Biometric authentication not available',
          icon: 'finger-print',
          type: 'switch' as const,
          value: userPreferences.biometricEnabled,
          onToggle: biometric.canUseBiometric ? handleBiometricToggle : undefined,
        },
      ],
    },
    {
      title: 'Developer Settings',
      items: [
        {
          id: 'api-configuration',
          title: 'API Configuration',
          subtitle: currentAIKey ? '✓ Custom API configured' : 'Using default AI service',
          icon: 'code-slash',
          type: 'navigation' as const,
          onPress: handleDeveloperSettings,
          requiresSecurity: true,
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
          subtitle: 'Reset app completely - deletes ALL data and returns to setup screen',
          icon: 'trash',
          type: 'action' as const,
          onPress: createSecureDeleteAction(
            'Clear All Data',
            'This will completely reset the app - deleting ALL data (transactions, accounts, settings, PIN) and returning to setup screen. This action cannot be undone.',
            () => resetApp(),
            'App has been completely reset'
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
    disabledButton: {
      backgroundColor: theme.colors.surface,
      opacity: 0.5,
    },
    disabledButtonText: {
      color: theme.colors.textSecondary,
    },
    logoContainer: {
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    // Theme Modal Styles
    themeOptions: {
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
    themeOption: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    selectedThemeOption: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    themeIconContainer: {
      marginBottom: theme.spacing.md,
    },
    themeOptionText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    selectedThemeText: {
      color: theme.colors.primary,
    },
    themeOptionDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    // AI API Key Modal Styles
    apiKeyHelp: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.md,
      lineHeight: 20,
    },
    destructiveButton: {
      backgroundColor: theme.colors.error,
    },
    destructiveButtonText: {
      color: 'white',
    },
    // Developer Settings Styles
    developerInfo: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      alignItems: 'center',
    },
    defaultServiceText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    customAPIText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
    aiProviderScroll: {
      marginTop: theme.spacing.sm,
    },
    aiProviderCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginHorizontal: theme.spacing.xs,
      alignItems: 'center',
      minWidth: 80,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    selectedAIProvider: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    aiProviderName: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.text,
      marginTop: theme.spacing.xs,
      textAlign: 'center',
    },
    selectedAIProviderText: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    // Developer Modal Button Styles
    developerModalButtons: {
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
    },
    fullWidthButton: {
      width: '100%',
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    halfWidthButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      marginHorizontal: theme.spacing.xs,
    },
    actionButtonsRow: {
      flexDirection: 'row',
      width: '100%',
      gap: theme.spacing.sm,
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
          <View style={styles.logoContainer}>
            <AppLogo size="large" variant="text-only" showVersion={false} />
            <Text style={styles.appVersion}>Version 2.1.0</Text>
          </View>
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
            <Text style={styles.modalSubtitle}>
              Enter your current PIN and set a new {getTargetPinLength()}-digit PIN
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Current PIN ({authState.pinLength} digits)</Text>
              <TextInput
                style={styles.input}
                value={currentPin}
                onChangeText={setCurrentPin}
                placeholder={`Enter current ${authState.pinLength}-digit PIN`}
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
                secureTextEntry
                maxLength={authState.pinLength}
                autoFocus
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New PIN ({getTargetPinLength()} digits)</Text>
              <TextInput
                style={styles.input}
                value={newPin}
                onChangeText={setNewPin}
                placeholder={`Enter new ${getTargetPinLength()}-digit PIN`}
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
                secureTextEntry
                maxLength={getTargetPinLength()}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm New PIN</Text>
              <TextInput
                style={styles.input}
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder={`Confirm ${getTargetPinLength()}-digit PIN`}
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
                secureTextEntry
                maxLength={getTargetPinLength()}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setCurrentPin('');
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
                style={[
                  styles.modalButton, 
                  styles.confirmButton,
                  (currentPin.length !== authState.pinLength || 
                   newPin.length !== getTargetPinLength() || 
                   confirmPin.length !== getTargetPinLength()) && styles.disabledButton
                ]}
                onPress={handleChangePin}
                disabled={
                  currentPin.length !== authState.pinLength || 
                  newPin.length !== getTargetPinLength() || 
                  confirmPin.length !== getTargetPinLength()
                }
              >
                <Text style={[
                  styles.modalButtonText, 
                  styles.confirmButtonText,
                  (currentPin.length !== authState.pinLength || 
                   newPin.length !== getTargetPinLength() || 
                   confirmPin.length !== getTargetPinLength()) && styles.disabledButtonText
                ]}>
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

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Theme</Text>
            <Text style={styles.modalSubtitle}>Choose your preferred theme</Text>

            <View style={styles.themeOptions}>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'light' && styles.selectedThemeOption
                ]}
                onPress={() => handleThemeSelect('light')}
              >
                <View style={styles.themeIconContainer}>
                  <Ionicons 
                    name="sunny" 
                    size={32} 
                    color={themeMode === 'light' ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                </View>
                <Text style={[
                  styles.themeOptionText,
                  themeMode === 'light' && styles.selectedThemeText
                ]}>
                  Light
                </Text>
                <Text style={styles.themeOptionDescription}>
                  Bright and clean appearance
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'dark' && styles.selectedThemeOption
                ]}
                onPress={() => handleThemeSelect('dark')}
              >
                <View style={styles.themeIconContainer}>
                  <Ionicons 
                    name="moon" 
                    size={32} 
                    color={themeMode === 'dark' ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                </View>
                <Text style={[
                  styles.themeOptionText,
                  themeMode === 'dark' && styles.selectedThemeText
                ]}>
                  Dark
                </Text>
                <Text style={styles.themeOptionDescription}>
                  Easy on the eyes, saves battery
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'system' && styles.selectedThemeOption
                ]}
                onPress={() => handleThemeSelect('system')}
              >
                <View style={styles.themeIconContainer}>
                  <Ionicons 
                    name="phone-portrait" 
                    size={32} 
                    color={themeMode === 'system' ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                </View>
                <Text style={[
                  styles.themeOptionText,
                  themeMode === 'system' && styles.selectedThemeText
                ]}>
                  System
                </Text>
                <Text style={styles.themeOptionDescription}>
                  Follows your device settings
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={[styles.modalButtonText, styles.cancelButtonText]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Developer Settings Modal */}
      <Modal
        visible={showDeveloperModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeveloperModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView 
            style={styles.modalContainer} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
          >
            <Text style={styles.modalTitle}>API Configuration</Text>
            
            <View style={styles.developerInfo}>
              <View style={[styles.iconContainer, { alignSelf: 'center', backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.defaultServiceText}>
                By default, we use our own AI analysis service for optimal performance and privacy.
              </Text>
              <Text style={styles.customAPIText}>
                If you prefer to use your own API, configure it below. Your API key is stored securely on your device and never shared.
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>AI Provider</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.aiProviderScroll}
                contentContainerStyle={{ paddingHorizontal: theme.spacing.sm }}
              >
                {aiProviders.map((provider) => (
                  <TouchableOpacity
                    key={provider.id}
                    style={[
                      styles.aiProviderCard,
                      selectedAIProvider?.id === provider.id && styles.selectedAIProvider
                    ]}
                    onPress={() => setSelectedAIProvider(provider)}
                  >
                    <Ionicons 
                      name={provider.icon as any} 
                      size={24} 
                      color={selectedAIProvider?.id === provider.id ? theme.colors.primary : theme.colors.textSecondary} 
                    />
                    <Text style={[
                      styles.aiProviderName,
                      selectedAIProvider?.id === provider.id && styles.selectedAIProviderText
                    ]}>
                      {provider.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>API Key</Text>
              <TextInput
                style={styles.input}
                value={newAPIKey}
                onChangeText={setNewAPIKey}
                placeholder="Enter your API key"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.apiKeyHelp}>
              Enter your API key to use AI analysis with your own provider. We encrypt and store your key securely on your device only.
            </Text>

            <View style={styles.developerModalButtons}>
              <TouchableOpacity
                style={[styles.fullWidthButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeveloperModal(false);
                  setNewAPIKey('');
                  setSelectedAIProvider(null);
                }}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <View style={styles.actionButtonsRow}>
                {currentAIKey && (
                  <TouchableOpacity
                    style={[styles.halfWidthButton, styles.destructiveButton]}
                    onPress={handleDeleteAPIKey}
                  >
                    <Ionicons name="trash-outline" size={16} color="white" />
                    <Text style={[styles.modalButtonText, styles.destructiveButtonText, { marginLeft: 6 }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[
                    currentAIKey ? styles.halfWidthButton : styles.fullWidthButton, 
                    styles.confirmButton,
                    (!selectedAIProvider || !newAPIKey.trim()) && styles.disabledButton
                  ]}
                  onPress={handleSaveAPIKey}
                  disabled={!selectedAIProvider || !newAPIKey.trim()}
                >
                  <Ionicons 
                    name="save-outline" 
                    size={16} 
                    color={(!selectedAIProvider || !newAPIKey.trim()) ? theme.colors.textSecondary : "white"} 
                  />
                  <Text style={[
                    styles.modalButtonText, 
                    styles.confirmButtonText, 
                    { marginLeft: 6 },
                    (!selectedAIProvider || !newAPIKey.trim()) && styles.disabledButtonText
                  ]}>
                    Save Config
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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