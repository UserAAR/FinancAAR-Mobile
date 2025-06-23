// Authentication Types (Moved to AuthContext for better encapsulation)
// Legacy types removed - now defined in AuthContext

// Account Types
export interface CashAccount {
  id: string;
  name: string;
  balance: number;
  emoji?: string;
  description?: string;
  type: 'cash';
  createdAt: Date;
  updatedAt: Date;
}

export interface CardAccount {
  id: string;
  name: string;
  balance: number;
  description?: string;
  color: string;
  lastFourDigits?: string;
  emoji?: string;
  type: 'card';
  createdAt: Date;
  updatedAt: Date;
}

export type Account = CashAccount | CardAccount;

// Transaction Types
export type TransactionType = 'income' | 'expense' | 'transfer' | 'debt_payment' | 'borrowed' | 'lent';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  title: string;
  description?: string;
  categoryId: string;
  accountId: string;
  toAccountId?: string; // For transfers
  date: Date;
  createdAt: Date;
  status: 'success' | 'failed';
}

// Category Types
export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  createdAt: Date;
}

// Debt Types
export type DebtType = 'got' | 'gave'; // borrowed or lent

export interface Debt {
  id: string;
  type: DebtType;
  personName: string;
  amount: number;
  description?: string;
  accountId: string; // Added: Which account the money came from/went to
  date: Date;
  dueDate?: Date;
  status: 'active' | 'completed';
  transactionId?: string; // Added: Reference to the transaction created
  createdAt: Date;
  updatedAt: Date;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  date: Date;
  accountId: string;
  description?: string;
  createdAt: Date;
}

// Theme Types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  mode: ThemeMode;
  colors: {
    primary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    error: string;
    warning: string;
    card: string;
    shadow: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  shadows: {
    small: object;
    medium: object;
    large: object;
  };
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Add: undefined;
  Categories: undefined;
  Analytics: undefined;
  Debts: undefined;
  Settings: undefined;
};

export type AuthStackParamList = {
  PinSetup: undefined;
  PinLogin: undefined;
  InitialSetup: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  AccountManagement: undefined;
  PinSettings: undefined;
  ThemeSettings: undefined;
  UserProfile: undefined;
};

// Filter Types
export interface TransactionFilter {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
  period?: 'week' | 'month' | '3months' | '6months' | 'year';
}

// UI State Types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
}

// Settings Types (Moved to AuthContext for better encapsulation)
// Legacy AppSettings removed - now defined in AuthContext as UserPreferences

// Database Types
export interface DatabaseAccount {
  id: string;
  name: string;
  balance: number;
  type: 'cash' | 'card';
  color?: string;
  emoji?: string;
  description?: string;
  last_four_digits?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  title: string;
  description?: string;
  category_id: string;
  account_id: string;
  to_account_id?: string;
  date: string;
  created_at: string;
  status: 'success' | 'failed';
}

export interface DatabaseDebt {
  id: string;
  type: DebtType;
  person_name: string;
  amount: number;
  description?: string;
  account_id: string;
  date: string;
  due_date?: string;
  status: 'active' | 'completed';
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseCategory {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  created_at: string;
}

// Analytics Types
export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategoryExpense {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface CategorySpending {
  id: string;
  name: string;
  totalSpent: number;
  color: string;
  transactionCount: number;
}

export interface AnalyticsData {
  last6Months: MonthlyData[];
  categoryBreakdown: CategoryExpense[];
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  currentMonthIncome: number;
  currentMonthExpense: number;
} 