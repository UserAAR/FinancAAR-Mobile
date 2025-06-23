import * as SQLite from 'expo-sqlite';
import {
  Account,
  CardAccount,
  Transaction,
  Category,
  Debt,
  DebtPayment,
  DatabaseAccount,
  DatabaseTransaction,
  DatabaseCategory,
  DatabaseDebt,
  TransactionType,
  CategoryType,
  DebtType,
} from '../types';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  constructor() {
    try {
      this.db = SQLite.openDatabaseSync('financaar.db');
      this.initializeTables();
      this.insertDefaultCategories();
      this.fixInvalidIcons();
      this.removeBillsUtilitiesCategory();
      this.updateDebtsTable();
    } catch (error) {
      // Re-throw to handle at app level
      throw error;
    }
  }

  private ensureDatabase(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database is not initialized');
    }
    return this.db;
  }

  private initializeTables() {
    const db = this.ensureDatabase();
    
    // Accounts table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        balance REAL NOT NULL DEFAULT 0,
        type TEXT NOT NULL CHECK (type IN ('cash', 'card')),
        color TEXT,
        emoji TEXT,
        description TEXT,
        last_four_digits TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Categories table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Transactions table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'debt_payment')),
        amount REAL NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        to_account_id TEXT,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
        FOREIGN KEY (category_id) REFERENCES categories (id),
        FOREIGN KEY (account_id) REFERENCES accounts (id),
        FOREIGN KEY (to_account_id) REFERENCES accounts (id)
      );
    `);

    // Debts table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS debts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('got', 'gave')),
        person_name TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        account_id TEXT NOT NULL,
        date TEXT NOT NULL,
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
        transaction_id TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (id),
        FOREIGN KEY (transaction_id) REFERENCES transactions (id)
      );
    `);

    // Debt payments table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS debt_payments (
        id TEXT PRIMARY KEY,
        debt_id TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        account_id TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (debt_id) REFERENCES debts (id),
        FOREIGN KEY (account_id) REFERENCES accounts (id)
      );
    `);

    // App settings table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
    `);
  }

  private insertDefaultCategories() {
    const db = this.ensureDatabase();
    
    const existingCategories = db.getFirstSync(
      'SELECT COUNT(*) as count FROM categories'
    ) as { count: number };

    if (existingCategories.count === 0) {
      // Default income categories
      const incomeCategories = [
        { name: 'Salary', icon: 'wallet', color: '#4CAF50' },
        { name: 'Business', icon: 'briefcase', color: '#2196F3' },
        { name: 'Investment', icon: 'cash', color: '#FF9800' },
        { name: 'Gift', icon: 'gift', color: '#E91E63' },
        { name: 'Freelance', icon: 'laptop', color: '#673AB7' },
        { name: 'Other Income', icon: 'add-circle', color: '#9C27B0' },
      ];

      // Default expense categories
      const expenseCategories = [
        { name: 'Food & Dining', icon: 'restaurant', color: '#FF5722' },
        { name: 'Shopping', icon: 'bag', color: '#795548' },
        { name: 'Transportation', icon: 'car', color: '#607D8B' },
        { name: 'Entertainment', icon: 'film', color: '#9C27B0' },
        { name: 'Healthcare', icon: 'heart', color: '#F44336' },
        { name: 'Education', icon: 'book', color: '#2196F3' },
        { name: 'Travel', icon: 'airplane', color: '#00BCD4' },
        { name: 'Home', icon: 'home', color: '#4CAF50' },
        { name: 'Other Expense', icon: 'remove-circle', color: '#9E9E9E' },
      ];

      // Insert income categories
      for (const category of incomeCategories) {
        const id = this.generateId();
        db.runSync(
          'INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)',
          [id, category.name, 'income', category.icon, category.color]
        );
      }

      // Insert expense categories
      for (const category of expenseCategories) {
        const id = this.generateId();
        db.runSync(
          'INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)',
          [id, category.name, 'expense', category.icon, category.color]
        );
      }
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private convertDatabaseAccount(dbAccount: DatabaseAccount): Account {
    const baseAccount = {
      id: dbAccount.id,
      name: dbAccount.name,
      balance: dbAccount.balance,
      emoji: dbAccount.emoji,
      description: dbAccount.description,
      createdAt: new Date(dbAccount.created_at),
      updatedAt: new Date(dbAccount.updated_at),
    };

    if (dbAccount.type === 'cash') {
      return {
        ...baseAccount,
        type: 'cash',
      };
    } else {
      return {
        ...baseAccount,
        type: 'card',
        color: dbAccount.color || '#4CAF50',
        lastFourDigits: dbAccount.last_four_digits,
      };
    }
  }

  // Account operations
  async createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.generateId();
    const now = new Date().toISOString();

    if (account.type === 'cash') {
      this.ensureDatabase().runSync(
        `INSERT INTO accounts (id, name, balance, type, emoji, description, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, account.name, account.balance, account.type, account.emoji || null, account.description || null, now, now]
      );
    } else {
      const cardAccount = account as Omit<CardAccount, 'id' | 'createdAt' | 'updatedAt'>;
      this.ensureDatabase().runSync(
        `INSERT INTO accounts (id, name, balance, type, color, last_four_digits, emoji, description, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, cardAccount.name, cardAccount.balance, cardAccount.type, cardAccount.color, cardAccount.lastFourDigits || null, cardAccount.emoji || null, cardAccount.description || null, now, now]
      );
    }

    return id;
  }

  getAccounts(): Account[] {
    const accounts = this.ensureDatabase().getAllSync('SELECT * FROM accounts ORDER BY created_at ASC') as DatabaseAccount[];
    return accounts.map(this.convertDatabaseAccount);
  }

  getAccount(id: string): Account | null {
    const account = this.ensureDatabase().getFirstSync('SELECT * FROM accounts WHERE id = ?', [id]) as DatabaseAccount | null;
    return account ? this.convertDatabaseAccount(account) : null;
  }

  updateAccountBalance(accountId: string, newBalance: number): void {
    this.ensureDatabase().runSync(
      'UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?',
      [newBalance, new Date().toISOString(), accountId]
    );
  }

  deleteAccount(id: string): void {
    this.ensureDatabase().runSync('DELETE FROM accounts WHERE id = ?', [id]);
  }

  // Category operations
  getCategories(type?: CategoryType): Category[] {
    let query = 'SELECT * FROM categories';
    const params: any[] = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    query += ' ORDER BY name ASC';

    const categories = this.ensureDatabase().getAllSync(query, params) as DatabaseCategory[];
    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      type: cat.type as CategoryType,
      icon: cat.icon,
      color: cat.color,
      createdAt: new Date(cat.created_at),
    }));
  }

  createCategory(category: Omit<Category, 'id' | 'createdAt'>): string {
    const id = this.generateId();
    this.ensureDatabase().runSync(
      'INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)',
      [id, category.name, category.type, category.icon, category.color]
    );
    return id;
  }

  // Transaction operations with PROPER VALIDATION
  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const id = this.generateId();
    const now = new Date().toISOString();

    // ✅ VALIDATION STEP 1: Basic data validation
    if (!transaction.amount || transaction.amount <= 0) {
      throw new Error('INVALID_AMOUNT: Transaction amount must be greater than 0');
    }

    if (!transaction.title || transaction.title.trim().length === 0) {
      throw new Error('INVALID_TITLE: Transaction title is required');
    }

    if (!transaction.accountId) {
      throw new Error('INVALID_ACCOUNT: Account ID is required');
    }

    if (!transaction.categoryId) {
      throw new Error('INVALID_CATEGORY: Category ID is required');
    }

    // ✅ VALIDATION STEP 2: Check if account exists
    const account = this.getAccount(transaction.accountId);
    if (!account) {
      throw new Error('ACCOUNT_NOT_FOUND: The selected account does not exist');
    }

    // ✅ VALIDATION STEP 3: Check sufficient balance for expenses
    if (transaction.type === 'expense') {
      if (account.balance < transaction.amount) {
        throw new Error(`INSUFFICIENT_FUNDS: Account "${account.name}" has ₼${account.balance.toFixed(2)} but you're trying to spend ₼${transaction.amount.toFixed(2)}`);
      }
    }

    // ✅ VALIDATION STEP 4: Validate transfer transactions
    if (transaction.type === 'transfer') {
      if (!transaction.toAccountId) {
        throw new Error('INVALID_TRANSFER: Destination account is required for transfers');
      }

      if (transaction.accountId === transaction.toAccountId) {
        throw new Error('INVALID_TRANSFER: Cannot transfer to the same account');
      }

      const toAccount = this.getAccount(transaction.toAccountId);
      if (!toAccount) {
        throw new Error('DESTINATION_ACCOUNT_NOT_FOUND: The destination account does not exist');
      }

      if (account.balance < transaction.amount) {
        throw new Error(`INSUFFICIENT_FUNDS: Account "${account.name}" has ₼${account.balance.toFixed(2)} but you're trying to transfer ₼${transaction.amount.toFixed(2)}`);
      }
    }

    // ✅ VALIDATION STEP 5: Validate debt payment
    if (transaction.type === 'debt_payment') {
      if (account.balance < transaction.amount) {
        throw new Error(`INSUFFICIENT_FUNDS: Account "${account.name}" has ₼${account.balance.toFixed(2)} but you're trying to pay ₼${transaction.amount.toFixed(2)} debt`);
      }
    }

    // Start database transaction (atomic operation)
    const db = this.ensureDatabase();
    db.execSync('BEGIN TRANSACTION');

    try {
      // Insert transaction with SUCCESS status (since we validated everything)
      db.runSync(
        `INSERT INTO transactions (id, type, amount, title, description, category_id, account_id, to_account_id, date, created_at, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          transaction.type,
          transaction.amount,
          transaction.title.trim(),
          transaction.description?.trim() || null,
          transaction.categoryId,
          transaction.accountId,
          transaction.toAccountId || null,
          transaction.date.toISOString(),
          now,
          'success'
        ]
      );

      // Update account balances
      if (transaction.type === 'income') {
        const newBalance = account.balance + transaction.amount;
        this.updateAccountBalance(transaction.accountId, newBalance);

      } else if (transaction.type === 'expense' || transaction.type === 'debt_payment') {
        const newBalance = account.balance - transaction.amount;
        this.updateAccountBalance(transaction.accountId, newBalance);

      } else if (transaction.type === 'transfer' && transaction.toAccountId) {
        // Deduct from source account
        const newSourceBalance = account.balance - transaction.amount;
        this.updateAccountBalance(transaction.accountId, newSourceBalance);

        // Add to destination account
        const toAccount = this.getAccount(transaction.toAccountId)!;
        const newDestBalance = toAccount.balance + transaction.amount;
        this.updateAccountBalance(transaction.toAccountId, newDestBalance);
      }

      // Commit the transaction
      db.execSync('COMMIT');
      return id;

    } catch (error) {
      // Rollback on any error
      db.execSync('ROLLBACK');
      throw new Error(`DATABASE_ERROR: Failed to save transaction - ${error}`);
    }
  }

  getTransactions(limit?: number, accountId?: string): Transaction[] {
    let query = `
      SELECT t.*, c.name as category_name 
      FROM transactions t 
      LEFT JOIN categories c ON t.category_id = c.id
    `;
    const params: any[] = [];

    if (accountId) {
      query += ' WHERE t.account_id = ?';
      params.push(accountId);
    }

    query += ' ORDER BY t.date DESC, t.created_at DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    const transactions = this.ensureDatabase().getAllSync(query, params) as DatabaseTransaction[];
    return transactions.map(t => ({
      id: t.id,
      type: t.type as TransactionType,
      amount: t.amount,
      title: t.title,
      description: t.description,
      categoryId: t.category_id,
      accountId: t.account_id,
      toAccountId: t.to_account_id,
      date: new Date(t.date),
      createdAt: new Date(t.created_at),
      status: t.status as 'success' | 'failed',
    }));
  }

  // Debt operations
  createDebt(debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = this.generateId();
    const now = new Date().toISOString();

    this.ensureDatabase().runSync(
      `INSERT INTO debts (id, type, person_name, amount, description, account_id, date, due_date, status, transaction_id, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        debt.type,
        debt.personName,
        debt.amount,
        debt.description || null,
        debt.accountId,
        debt.date.toISOString(),
        debt.dueDate?.toISOString() || null,
        debt.status,
        debt.transactionId || null,
        now,
        now
      ]
    );

    return id;
  }

  getDebts(type?: DebtType): Debt[] {
    let query = 'SELECT * FROM debts';
    const params: any[] = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    // Sort by status first (active first), then by date (newest first)
    query += ' ORDER BY CASE WHEN status = "active" THEN 0 ELSE 1 END, created_at DESC';

    const debts = this.ensureDatabase().getAllSync(query, params) as DatabaseDebt[];
    return debts.map(d => ({
      id: d.id,
      type: d.type as DebtType,
      personName: d.person_name,
      amount: d.amount,
      description: d.description,
      accountId: d.account_id || '',
      date: new Date(d.date),
      dueDate: d.due_date ? new Date(d.due_date) : undefined,
      status: d.status as 'active' | 'completed',
      transactionId: d.transaction_id,
      createdAt: new Date(d.created_at),
      updatedAt: new Date(d.updated_at),
    }));
  }

  updateDebtStatus(debtId: string, status: 'active' | 'completed'): void {
    this.ensureDatabase().runSync(
      'UPDATE debts SET status = ?, updated_at = ? WHERE id = ?',
      [status, new Date().toISOString(), debtId]
    );
  }

  // Enhanced debt operations for new system
  async createDebtWithTransaction(debtData: {
    type: DebtType;
    personName: string;
    amount: number;
    description?: string;
    accountId: string;
    dueDate?: Date;
  }): Promise<string> {
    const db = this.ensureDatabase();
    const debtId = this.generateId();
    const transactionId = this.generateId();
    const now = new Date();

    try {
      // Start transaction
      db.execSync('BEGIN TRANSACTION');

      // Create the main transaction record
      const transactionType = debtData.type === 'got' ? 'borrowed' : 'lent';
      
      db.runSync(
        `INSERT INTO transactions (id, type, amount, title, description, category_id, account_id, date, created_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transactionId,
          transactionType,
          debtData.amount,
          `${debtData.type === 'got' ? 'Borrowed from' : 'Lent to'} ${debtData.personName}`,
          debtData.description || null,
          '', // No category for debt transactions
          debtData.accountId,
          now.toISOString(),
          now.toISOString(),
          'success'
        ]
      );

      // Update account balance
      const account = this.getAccount(debtData.accountId);
      if (!account) {
        throw new Error('ACCOUNT_NOT_FOUND');
      }

      const newBalance = debtData.type === 'got' 
        ? account.balance + debtData.amount  // Borrowed: Add money
        : account.balance - debtData.amount; // Lent: Remove money

      if (newBalance < 0) {
        throw new Error(`INSUFFICIENT_FUNDS: Account "${account.name}" has ₼${account.balance.toFixed(2)} but you're trying to lend ₼${debtData.amount.toFixed(2)}`);
      }

      this.updateAccountBalance(debtData.accountId, newBalance);

      // Create debt record
      db.runSync(
        `INSERT INTO debts (id, type, person_name, amount, description, account_id, date, due_date, status, transaction_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          debtId,
          debtData.type,
          debtData.personName,
          debtData.amount,
          debtData.description || null,
          debtData.accountId,
          now.toISOString(),
          debtData.dueDate?.toISOString() || null,
          'active',
          transactionId,
          now.toISOString(),
          now.toISOString()
        ]
      );

      // Commit transaction
      db.execSync('COMMIT');

      return debtId;
    } catch (error) {
      // Rollback on error
      db.execSync('ROLLBACK');
      throw error;
    }
  }

  async repayDebt(debtId: string, paymentAccountId: string): Promise<void> {
    const db = this.ensureDatabase();
    
    try {
      db.execSync('BEGIN TRANSACTION');

      // Get debt details
      const debt = this.getDebts().find(d => d.id === debtId);
      if (!debt || debt.status !== 'active') {
        throw new Error('DEBT_NOT_FOUND_OR_NOT_ACTIVE');
      }

      // Get payment account
      const paymentAccount = this.getAccount(paymentAccountId);
      if (!paymentAccount) {
        throw new Error('PAYMENT_ACCOUNT_NOT_FOUND');
      }

      const transactionId = this.generateId();
      const now = new Date();

      if (debt.type === 'got') {
        // Repaying borrowed money - remove from account
        const newBalance = paymentAccount.balance - debt.amount;
        
        if (newBalance < 0) {
          throw new Error(`INSUFFICIENT_FUNDS: Account "${paymentAccount.name}" has ₼${paymentAccount.balance.toFixed(2)} but you need ₼${debt.amount.toFixed(2)} to repay`);
        }

        this.updateAccountBalance(paymentAccountId, newBalance);

        // Create repayment transaction
        db.runSync(
          `INSERT INTO transactions (id, type, amount, title, description, category_id, account_id, date, created_at, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            transactionId,
            'expense',
            debt.amount,
            `Repaid debt to ${debt.personName}`,
            debt.description || null,
            '', // No category for debt transactions
            paymentAccountId,
            now.toISOString(),
            now.toISOString(),
            'success'
          ]
        );
      } else {
        // Receiving lent money back - add to account
        const newBalance = paymentAccount.balance + debt.amount;
        this.updateAccountBalance(paymentAccountId, newBalance);

        // Create repayment transaction
        db.runSync(
          `INSERT INTO transactions (id, type, amount, title, description, category_id, account_id, date, created_at, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            transactionId,
            'income',
            debt.amount,
            `Received debt repayment from ${debt.personName}`,
            debt.description || null,
            '', // No category for debt transactions  
            paymentAccountId,
            now.toISOString(),
            now.toISOString(),
            'success'
          ]
        );
      }

      // Update debt status to completed
      this.updateDebtStatus(debtId, 'completed');

      db.execSync('COMMIT');
    } catch (error) {
      db.execSync('ROLLBACK');
      throw error;
    }
  }

  deleteDebt(debtId: string): void {
    const db = this.ensureDatabase();
    
    try {
      db.execSync('BEGIN TRANSACTION');

      // Get debt details including transaction_id
      const debtRecord = db.getFirstSync('SELECT transaction_id FROM debts WHERE id = ?', [debtId]) as { transaction_id?: string } | null;
      
      // Delete the debt record
      db.runSync('DELETE FROM debts WHERE id = ?', [debtId]);

      // If there's a linked transaction, also delete it
      if (debtRecord?.transaction_id) {
        db.runSync('DELETE FROM transactions WHERE id = ?', [debtRecord.transaction_id]);
      }

      db.execSync('COMMIT');
    } catch (error) {
      db.execSync('ROLLBACK');
      throw error;
    }
  }

  // Settings operations
  setSetting(key: string, value: string): void {
    this.ensureDatabase().runSync(
      'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
      [key, value, new Date().toISOString()]
    );
  }

  getSetting(key: string): string | null {
    const db = this.ensureDatabase();
    const result = db.getFirstSync(
      'SELECT value FROM app_settings WHERE key = ?',
      [key]
    ) as { value: string } | null;
    
    return result ? result.value : null;
  }

  // Setup tracking methods
  setSetupCompleted(): void {
    this.setSetting('setup_completed', 'true');
  }

  isSetupCompleted(): boolean {
    const result = this.getSetting('setup_completed');
    return result === 'true';
  }

  clearSetupFlag(): void {
    const db = this.ensureDatabase();
    db.runSync('DELETE FROM app_settings WHERE key = ?', ['setup_completed']);
  }

  // User profile methods
  setUserName(userName: string): void {
    this.setSetting('user_name', userName);
  }

  getUserName(): string | null {
    return this.getSetting('user_name');
  }

  clearUserName(): void {
    const db = this.ensureDatabase();
    db.runSync('DELETE FROM app_settings WHERE key = ?', ['user_name']);
  }

  // User preferences methods (Best Practice: Store in DB, not storage)
  setUserPreferences(preferences: {
    theme?: 'light' | 'dark' | 'system';
    defaultCurrency?: string;
    notifications?: boolean;
    pinLength?: 4 | 6;
    biometricEnabled?: boolean;
  }): void {
    Object.entries(preferences).forEach(([key, value]) => {
      if (value !== undefined) {
        this.setSetting(`pref_${key}`, String(value));
      }
    });
  }

  getUserPreferences(): {
    theme: 'light' | 'dark' | 'system';
    defaultCurrency: string;
    notifications: boolean;
    pinLength: 4 | 6;
    biometricEnabled: boolean;
  } {
    return {
      theme: (this.getSetting('pref_theme') as 'light' | 'dark' | 'system') || 'system',
      defaultCurrency: this.getSetting('pref_defaultCurrency') || '₼',
      notifications: this.getSetting('pref_notifications') !== 'false', // default true
      pinLength: (parseInt(this.getSetting('pref_pinLength') || '4') as 4 | 6),
      biometricEnabled: this.getSetting('pref_biometricEnabled') === 'true',
    };
  }

  // Security settings (PIN should be in secure storage, but config in DB)
  setPinLength(length: 4 | 6): void {
    this.setSetting('pref_pinLength', String(length));
  }

  getPinLength(): 4 | 6 {
    return (parseInt(this.getSetting('pref_pinLength') || '4') as 4 | 6);
  }

  setBiometricEnabled(enabled: boolean): void {
    this.setSetting('pref_biometricEnabled', String(enabled));
  }

  getBiometricEnabled(): boolean {
    return this.getSetting('pref_biometricEnabled') === 'true';
  }

  // Clear only user preferences, keep system settings
  clearUserPreferences(): void {
    const db = this.ensureDatabase();
    db.runSync('DELETE FROM app_settings WHERE key LIKE ?', ['pref_%']);
  }

  // Analytics operations with mathematically correct calculations
  getMonthlyData(months: number = 6): { month: string; income: number; expense: number; net: number }[] {
    const query = `
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(CASE WHEN type = 'income' AND status = 'success' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' AND status = 'success' THEN amount ELSE 0 END) as expense
      FROM transactions 
      WHERE date >= date('now', '-${months} months')
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month DESC
    `;

    const results = this.ensureDatabase().getAllSync(query) as { month: string; income: number; expense: number }[];
    return results.map(r => ({
      month: r.month,
      income: r.income || 0,
      expense: r.expense || 0,
      net: (r.income || 0) - (r.expense || 0),
    }));
  }

  // NEW: Get current month data specifically for dashboard
  getCurrentMonthData(): { income: number; expense: number; net: number } {
    const query = `
      SELECT 
        SUM(CASE WHEN type = 'income' AND status = 'success' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' AND status = 'success' THEN amount ELSE 0 END) as expense
      FROM transactions 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
    `;

    const result = this.ensureDatabase().getFirstSync(query) as { income: number; expense: number } | null;
    
    const income = result?.income || 0;
    const expense = result?.expense || 0;
    
    return {
      income,
      expense,
      net: income - expense,
    };
  }

  // NEW: Get daily data for detailed charts
  getDailyData(days: number = 30): { date: string; income: number; expense: number; net: number; runningBalance: number }[] {
    const query = `
      SELECT 
        date,
        SUM(CASE WHEN type = 'income' AND status = 'success' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' AND status = 'success' THEN amount ELSE 0 END) as expense
      FROM transactions 
      WHERE date >= date('now', '-${days} days')
      GROUP BY date
      ORDER BY date ASC
    `;

    const results = this.ensureDatabase().getAllSync(query) as { date: string; income: number; expense: number }[];
    const currentBalance = this.getTotalBalance().total;
    let runningBalance = currentBalance;
    
    // Calculate running balance (work backwards from current)
    const dailyData = results.map(r => ({
      date: r.date,
      income: r.income || 0,
      expense: r.expense || 0,
      net: (r.income || 0) - (r.expense || 0),
      runningBalance: 0, // Will calculate below
    }));

    // Calculate running balances working backwards
    for (let i = dailyData.length - 1; i >= 0; i--) {
      dailyData[i].runningBalance = runningBalance;
      if (i > 0) {
        runningBalance -= dailyData[i].net;
      }
    }

    return dailyData;
  }

  // NEW: Get account balance history for accurate net savings calculation
  getAccountBalanceHistory(months: number = 6): { month: string; totalBalance: number }[] {
    // Since we don't have historical balance data, we'll calculate based on transactions
    const monthlyData = this.getMonthlyData(months);
    const currentBalance = this.getTotalBalance().total;
    
    // Work backwards from current balance
    let runningBalance = currentBalance;
    const balanceHistory = [];
    
    for (let i = 0; i < monthlyData.length; i++) {
      const monthData = monthlyData[i];
      balanceHistory.unshift({
        month: monthData.month,
        totalBalance: runningBalance
      });
      // Subtract this month's net to get previous month's balance
      runningBalance = runningBalance - monthData.net;
    }
    
    return balanceHistory.reverse();
  }

  // NEW: Calculate mathematically correct Net Savings
  calculateNetSavings(months: number = 6): { 
    netSavings: number; 
    periodStartBalance: number; 
    periodEndBalance: number;
    totalIncome: number;
    totalExpenses: number;
  } {
    const monthlyData = this.getMonthlyData(months);
    const currentBalance = this.getTotalBalance().total;
    
    const totalIncome = monthlyData.reduce((sum, month) => sum + month.income, 0);
    const totalExpenses = monthlyData.reduce((sum, month) => sum + month.expense, 0);
    
    // Calculate starting balance by working backwards
    const totalNetCashFlow = totalIncome - totalExpenses;
    const periodStartBalance = currentBalance - totalNetCashFlow;
    
    // Net Savings = Change in Net Worth (Assets - Liabilities)
    // Since we don't track liabilities separately, we use total account balance change
    const netSavings = currentBalance - periodStartBalance;
    
    return {
      netSavings,
      periodStartBalance,
      periodEndBalance: currentBalance,
      totalIncome,
      totalExpenses,
    };
  }

  // NEW: Calculate mathematically correct Savings Rate
  calculateSavingsRate(months: number = 6): {
    savingsRate: number;
    netSavings: number;
    totalIncome: number;
    cashFlowSavingsRate: number; // Traditional income-expense calculation for comparison
  } {
    const savingsData = this.calculateNetSavings(months);
    const { netSavings, totalIncome, totalExpenses } = savingsData;
    
    // Proper Savings Rate = Net Savings / Gross Income
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
    
    // Cash Flow Savings Rate (for comparison with traditional methods)
    const cashFlowSavings = totalIncome - totalExpenses;
    const cashFlowSavingsRate = totalIncome > 0 ? (cashFlowSavings / totalIncome) * 100 : 0;
    
    return {
      savingsRate: Math.max(savingsRate, 0), // Ensure non-negative
      netSavings,
      totalIncome,
      cashFlowSavingsRate,
    };
  }

  // NEW: Advanced analytics with multiple time periods
  getAdvancedAnalytics(): {
    threeMonth: any;
    sixMonth: any;
    oneYear: any;
    summary: {
      averageMonthlySavings: number;
      savingsAcceleration: number; // Change in savings rate over time
      financialHealthScore: number; // 0-100 composite score
    };
  } {
    const threeMonthData = this.calculateSavingsRate(3);
    const sixMonthData = this.calculateSavingsRate(6);
    const oneYearData = this.calculateSavingsRate(12);
    
    // Calculate average monthly savings
    const avgMonthlySavings = sixMonthData.netSavings / 6;
    
    // Calculate savings acceleration (improvement over time)
    const savingsAcceleration = threeMonthData.savingsRate - sixMonthData.savingsRate;
    
    // Calculate Financial Health Score (0-100)
    let healthScore = 0;
    
    // Savings Rate contributes 40% of score
    if (sixMonthData.savingsRate >= 20) healthScore += 40;
    else if (sixMonthData.savingsRate >= 15) healthScore += 30;
    else if (sixMonthData.savingsRate >= 10) healthScore += 20;
    else if (sixMonthData.savingsRate >= 5) healthScore += 10;
    
    // Positive net savings contributes 30% of score
    if (sixMonthData.netSavings > 0) healthScore += 30;
    else if (sixMonthData.netSavings >= 0) healthScore += 15;
    
    // Savings trend contributes 20% of score
    if (savingsAcceleration > 0) healthScore += 20;
    else if (savingsAcceleration >= 0) healthScore += 10;
    
    // Account balance contributes 10% of score
    const totalBalance = this.getTotalBalance().total;
    if (totalBalance > 10000) healthScore += 10;
    else if (totalBalance > 5000) healthScore += 7;
    else if (totalBalance > 1000) healthScore += 5;
    else if (totalBalance >= 0) healthScore += 2;
    
    return {
      threeMonth: {
        ...threeMonthData,
        period: '3-month',
      },
      sixMonth: {
        ...sixMonthData,
        period: '6-month',
      },
      oneYear: {
        ...oneYearData,
        period: '1-year',
      },
      summary: {
        averageMonthlySavings: avgMonthlySavings,
        savingsAcceleration,
        financialHealthScore: healthScore,
      },
    };
  }

  // NEW: Daily chart data for detailed visualization
  getDailyChartData(days: number = 30): {
    labels: string[];
    datasets: {
      savingsRates: number[];
      netSavingsScaled: number[];
      incomeProgress: number[];
      expenseProgress: number[];
      targetLine: number[];
      balanceGrowth: number[];
    };
    metadata: {
      maxSavingsRate: number;
      minSavingsRate: number;
      avgSavingsRate: number;
      totalNetSavings: number;
      trendDirection: 'up' | 'down' | 'stable';
      healthTrend: 'improving' | 'declining' | 'stable';
    };
  } {
    const dailyData = this.getDailyData(days);
    
    if (dailyData.length === 0) {
      return {
        labels: [],
        datasets: {
          savingsRates: [],
          netSavingsScaled: [],
          incomeProgress: [],
          expenseProgress: [],
          targetLine: [],
          balanceGrowth: [],
        },
        metadata: {
          maxSavingsRate: 0,
          minSavingsRate: 0,
          avgSavingsRate: 0,
          totalNetSavings: 0,
          trendDirection: 'stable',
          healthTrend: 'stable',
        },
      };
    }

    // Calculate daily savings rates
    const savingsRates = dailyData.map(d => {
      if (d.income === 0 && d.expense === 0) return 0; // No activity day
      const rate = d.income > 0 ? ((d.income - d.expense) / d.income * 100) : -100;
      return Math.max(rate, -100); // Allow negative savings days
    });

    // Calculate cumulative metrics for smooth chart
    const cumulativeIncome: number[] = dailyData.reduce((acc: number[], d, i) => {
      acc.push((acc[i-1] || 0) + d.income);
      return acc;
    }, []);
    
    const cumulativeExpense: number[] = dailyData.reduce((acc: number[], d, i) => {
      acc.push((acc[i-1] || 0) + d.expense);
      return acc;
    }, []);

    // Calculate running savings rate (cumulative)
    const runningSavingsRates = cumulativeIncome.map((income, i) => {
      const expense = cumulativeExpense[i];
      return income > 0 ? ((income - expense) / income * 100) : 0;
    });

    // Net savings scaled for visualization
    const netSavings = dailyData.map(d => d.net);
    const maxAbsNetSavings = Math.max(...netSavings.map(s => Math.abs(s)));
    const netSavingsScaled = netSavings.map(savings => 
      maxAbsNetSavings > 0 ? (savings / maxAbsNetSavings) * 50 : 0
    );

    // Income progress (normalized)
    const maxIncome = Math.max(...cumulativeIncome);
    const incomeProgress = cumulativeIncome.map(income => 
      maxIncome > 0 ? (income / maxIncome) * 100 : 0
    );

    // Balance growth
    const balances = dailyData.map(d => d.runningBalance);
    const maxBalance = Math.max(...balances);
    const minBalance = Math.min(...balances);
    const balanceGrowth = balances.map(balance => 
      maxBalance > minBalance ? ((balance - minBalance) / (maxBalance - minBalance)) * 100 : 50
    );

    // Generate day labels (show only some for readability)
    const labels = dailyData.map((d, i) => {
      const date = new Date(d.date);
      const day = date.getDate();
      // Show every 3rd day or important days
      if (i % 3 === 0 || day === 1 || day === 15) {
        return `${day}`;
      }
      return '';
    });

    // Calculate metadata
    const validRates = runningSavingsRates.filter(r => r !== 0);
    const maxSavingsRate = validRates.length > 0 ? Math.max(...validRates) : 0;
    const minSavingsRate = validRates.length > 0 ? Math.min(...validRates) : 0;
    const avgSavingsRate = validRates.length > 0 ? validRates.reduce((a, b) => a + b, 0) / validRates.length : 0;
    const totalNetSavings = netSavings.reduce((a, b) => a + b, 0);

    // Determine trend
    const recent = runningSavingsRates.slice(-7).filter(r => r !== 0);
    const older = runningSavingsRates.slice(0, 7).filter(r => r !== 0);
    const avgRecent = recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
    const avgOlder = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : 0;
    
    const trendDirection = avgRecent > avgOlder + 2 ? 'up' : 
                          avgRecent < avgOlder - 2 ? 'down' : 'stable';
    
    const healthTrend = avgSavingsRate > 20 && trendDirection === 'up' ? 'improving' :
                       avgSavingsRate < 10 || trendDirection === 'down' ? 'declining' : 'stable';

    return {
      labels,
      datasets: {
        savingsRates: runningSavingsRates, // Use cumulative rates for smooth line
        netSavingsScaled,
        incomeProgress,
        expenseProgress: balanceGrowth, // Use balance growth as expense efficiency proxy
        targetLine: new Array(dailyData.length).fill(20),
        balanceGrowth,
      },
      metadata: {
        maxSavingsRate,
        minSavingsRate,
        avgSavingsRate,
        totalNetSavings,
        trendDirection,
        healthTrend,
      },
    };
  }

  // NEW: Comprehensive chart data generation for advanced analytics
  getAdvancedChartData(months: number = 6): {
    labels: string[];
    datasets: {
      savingsRates: number[];
      netSavingsScaled: number[];
      incomeProgress: number[];
      expenseProgress: number[];
      targetLine: number[];
      balanceGrowth: number[];
    };
    metadata: {
      maxSavingsRate: number;
      minSavingsRate: number;
      avgSavingsRate: number;
      totalNetSavings: number;
      trendDirection: 'up' | 'down' | 'stable';
      healthTrend: 'improving' | 'declining' | 'stable';
    };
  } {
    const monthlyData = this.getMonthlyData(months);
    const currentBalance = this.getTotalBalance().total;
    
    // If no real data, return empty structure - NO sample data
    if (monthlyData.length === 0) {
      return {
        labels: [],
        datasets: {
          savingsRates: [],
          netSavingsScaled: [],
          incomeProgress: [],
          expenseProgress: [],
          targetLine: [],
          balanceGrowth: [],
        },
        metadata: {
          maxSavingsRate: 0,
          minSavingsRate: 0,
          avgSavingsRate: 0,
          totalNetSavings: 0,
          trendDirection: 'stable',
          healthTrend: 'stable',
        },
      };
    }
    
    // Calculate advanced metrics for each month
    const savingsRates = monthlyData.map(d => {
      const rate = d.income > 0 ? ((d.income - d.expense) / d.income * 100) : 0;
      return Math.max(rate, -30); // Only limit negative values, no upper limit
    });
    
    // Calculate net savings with proper scaling
    const netSavings = monthlyData.map(d => d.income - d.expense);
    const maxAbsNetSavings = Math.max(...netSavings.map(s => Math.abs(s)));
    const netSavingsScaled = netSavings.map(savings => 
      maxAbsNetSavings > 0 ? (savings / maxAbsNetSavings) * 30 : 0
    );
    
    // Calculate income progress (normalized to 100 for latest month)
    const incomes = monthlyData.map(d => d.income);
    const maxIncome = Math.max(...incomes);
    const incomeProgress = incomes.map(income => 
      maxIncome > 0 ? (income / maxIncome) * 100 : 0
    );
    
    // Calculate expense efficiency (lower is better, inverted scale)
    const expenses = monthlyData.map(d => d.expense);
    const maxExpense = Math.max(...expenses);
    const expenseProgress = expenses.map(expense => 
      maxExpense > 0 ? 100 - ((expense / maxExpense) * 35) : 100
    );
    
    // Calculate balance growth trend
    let runningBalance = currentBalance;
    const balanceHistory = [];
    
    // Work backwards to estimate balance growth
    for (let i = monthlyData.length - 1; i >= 0; i--) {
      balanceHistory.unshift(runningBalance);
      runningBalance -= netSavings[i];
    }
    
    const maxBalance = Math.max(...balanceHistory);
    const balanceGrowth = balanceHistory.map(balance => 
      maxBalance > 0 ? (balance / maxBalance) * 100 : 0
    );
    
    // Generate clean month labels
    const labels = monthlyData.map(d => {
      const [year, month] = d.month.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthNames[parseInt(month) - 1];
    });
    
    // Calculate metadata
    const maxSavingsRate = Math.max(...savingsRates);
    const minSavingsRate = Math.min(...savingsRates);
    const avgSavingsRate = savingsRates.reduce((a, b) => a + b, 0) / savingsRates.length;
    const totalNetSavings = netSavings.reduce((a, b) => a + b, 0);
    
    // Determine trends
    const recentRates = savingsRates.slice(-3);
    const olderRates = savingsRates.slice(0, 3);
    const avgRecent = recentRates.reduce((a, b) => a + b, 0) / recentRates.length;
    const avgOlder = olderRates.reduce((a, b) => a + b, 0) / olderRates.length;
    
    const trendDirection = avgRecent > avgOlder + 2 ? 'up' : 
                          avgRecent < avgOlder - 2 ? 'down' : 'stable';
    
    const healthTrend = avgSavingsRate > 20 && trendDirection === 'up' ? 'improving' :
                       avgSavingsRate < 10 || trendDirection === 'down' ? 'declining' : 'stable';
    
    return {
      labels,
      datasets: {
        savingsRates,
        netSavingsScaled,
        incomeProgress,
        expenseProgress,
        targetLine: new Array(monthlyData.length).fill(20),
        balanceGrowth,
      },
      metadata: {
        maxSavingsRate,
        minSavingsRate,
        avgSavingsRate,
        totalNetSavings,
        trendDirection,
        healthTrend,
      },
    };
  }

  getCategoryExpenses(months: number = 1): { categoryId: string; categoryName: string; amount: number; color: string }[] {
    const query = `
      SELECT 
        c.id as categoryId,
        c.name as categoryName,
        c.color,
        SUM(t.amount) as amount
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.type = 'expense' 
        AND t.status = 'success'
        AND t.date >= date('now', '-${months} months')
      GROUP BY c.id, c.name, c.color
      ORDER BY amount DESC
    `;

    const results = this.ensureDatabase().getAllSync(query) as { categoryId: string; categoryName: string; amount: number; color: string }[];
    return results;
  }

  getCategoryStats(categoryId: string, months: number = 1): { transactionCount: number; totalAmount: number } {
    const result = this.ensureDatabase().getFirstSync(`
      SELECT 
        COUNT(*) as transactionCount,
        SUM(amount) as totalAmount
      FROM transactions 
      WHERE category_id = ? 
        AND status = 'success'
        AND date >= date('now', '-${months} months')
    `, [categoryId]) as { transactionCount: number; totalAmount: number } | null;

    return {
      transactionCount: result?.transactionCount || 0,
      totalAmount: result?.totalAmount || 0,
    };
  }

  getCategorySpending(months: number = 6): { id: string; name: string; totalSpent: number; color: string; transactionCount: number }[] {
    const query = `
      SELECT 
        c.id,
        c.name,
        c.color,
        COALESCE(SUM(t.amount), 0) as totalSpent,
        COUNT(t.id) as transactionCount
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id 
        AND t.type = 'expense' 
        AND t.status = 'success'
        AND t.date >= date('now', '-${months} months')
      WHERE c.type = 'expense'
      GROUP BY c.id, c.name, c.color
      HAVING totalSpent > 0
      ORDER BY totalSpent DESC
    `;

    const results = this.ensureDatabase().getAllSync(query) as { id: string; name: string; totalSpent: number; color: string; transactionCount: number }[];
    return results;
  }

  // Utility methods
  clearAllData(): void {
    const db = this.ensureDatabase();
    
    // Clear all data tables
    db.execSync('DELETE FROM transactions');
    db.execSync('DELETE FROM debt_payments');
    db.execSync('DELETE FROM debts');
    db.execSync('DELETE FROM accounts');
    db.execSync('DELETE FROM app_settings');
    db.execSync('DELETE FROM categories');
    
    // Reset to fresh state
    this.insertDefaultCategories();
  }

  clearTransactions(): void {
    this.ensureDatabase().execSync('DELETE FROM transactions');
  }

  clearDebts(): void {
    const db = this.ensureDatabase();
    db.execSync('DELETE FROM debt_payments');
    db.execSync('DELETE FROM debts');
  }

  clearCardAccounts(): void {
    const db = this.ensureDatabase();
    // First update transactions to remove reference to deleted accounts
    db.execSync('DELETE FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE type = "card")');
    db.execSync('DELETE FROM transactions WHERE to_account_id IN (SELECT id FROM accounts WHERE type = "card")');
    // Then delete card accounts
    db.execSync('DELETE FROM accounts WHERE type = "card"');
  }

  clearCashAccounts(): void {
    const db = this.ensureDatabase();
    // First update transactions to remove reference to deleted accounts
    db.execSync('DELETE FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE type = "cash")');
    db.execSync('DELETE FROM transactions WHERE to_account_id IN (SELECT id FROM accounts WHERE type = "cash")');
    // Then delete cash accounts
    db.execSync('DELETE FROM accounts WHERE type = "cash"');
  }

  clearAllAccounts(): void {
    const db = this.ensureDatabase();
    // First clear all transactions since they reference accounts
    db.execSync('DELETE FROM transactions');
    db.execSync('DELETE FROM debt_payments');
    // Then delete all accounts
    db.execSync('DELETE FROM accounts');
  }

  clearCategories(): void {
    const db = this.ensureDatabase();
    // First clear all transactions since they reference categories
    db.execSync('DELETE FROM transactions');
    // Then delete all categories
    db.execSync('DELETE FROM categories');
    // Restore default categories
    this.insertDefaultCategories();
  }

  resetCategories(): void {
    const db = this.ensureDatabase();
    db.execSync('DELETE FROM categories');
    this.insertDefaultCategories();
  }

  getTotalBalance(): { cash: number; cards: number; total: number } {
    const result = this.ensureDatabase().getFirstSync(`
      SELECT 
        SUM(CASE WHEN type = 'cash' THEN balance ELSE 0 END) as cash,
        SUM(CASE WHEN type = 'card' THEN balance ELSE 0 END) as cards,
        SUM(balance) as total
      FROM accounts
    `) as { cash: number; cards: number; total: number };

    const balanceData = {
      cash: result?.cash || 0,
      cards: result?.cards || 0,
      total: result?.total || 0,
    };

    return balanceData;
  }

  private fixInvalidIcons() {
    const db = this.ensureDatabase();
    
    // Map of invalid icon names to valid Ionicons names
    const iconMap = {
      'zap': 'flash',
      'coffee': 'cafe',
      'minus-circle': 'remove-circle',
      'shopping-cart': 'bag',
      'map-pin': 'location',
      'dollar-sign': 'cash',
      'plus-circle': 'add-circle',
    };

    // Update categories with invalid icons
    for (const [invalidIcon, validIcon] of Object.entries(iconMap)) {
      db.runSync(
        'UPDATE categories SET icon = ? WHERE icon = ?',
        [validIcon, invalidIcon]
      );
    }
  }

  private removeBillsUtilitiesCategory() {
    const db = this.ensureDatabase();
    
    try {
      // First, check if Bills & Utilities category exists
      const billsCategory = db.getFirstSync(
        'SELECT id FROM categories WHERE name = ? AND type = ?',
        ['Bills & Utilities', 'expense']
      ) as { id: string } | null;

      if (billsCategory) {
        // Get all transactions using this category
        const transactionsWithBills = db.getAllSync(
          'SELECT id FROM transactions WHERE category_id = ?',
          [billsCategory.id]
        ) as { id: string }[];

        // If there are transactions using this category, we need to reassign them
        if (transactionsWithBills.length > 0) {
          // Find "Other Expense" category to reassign transactions
          const otherExpenseCategory = db.getFirstSync(
            'SELECT id FROM categories WHERE name = ? AND type = ?',
            ['Other Expense', 'expense']
          ) as { id: string } | null;

          if (otherExpenseCategory) {
            // Reassign all transactions from Bills & Utilities to Other Expense
            db.runSync(
              'UPDATE transactions SET category_id = ? WHERE category_id = ?',
              [otherExpenseCategory.id, billsCategory.id]
            );
          }
        }

        // Now delete the Bills & Utilities category
        db.runSync('DELETE FROM categories WHERE id = ?', [billsCategory.id]);
      }

      // Also ensure Freelance income category exists for new users
      const freelanceCategory = db.getFirstSync(
        'SELECT id FROM categories WHERE name = ? AND type = ?',
        ['Freelance', 'income']
      ) as { id: string } | null;

      if (!freelanceCategory) {
        const id = this.generateId();
        db.runSync(
          'INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)',
          [id, 'Freelance', 'income', 'laptop', '#673AB7']
        );
      }
    } catch (error) {
      // Silently handle any errors during cleanup
      console.log('Bills & Utilities category cleanup completed');
    }
  }

  private updateDebtsTable() {
    const db = this.ensureDatabase();
    
    try {
      // Check if account_id column exists in debts table
      const debtTableInfo = db.getAllSync('PRAGMA table_info(debts)') as any[];
      const hasAccountId = debtTableInfo.some(col => col.name === 'account_id');
      const hasTransactionId = debtTableInfo.some(col => col.name === 'transaction_id');
      
      if (!hasAccountId || !hasTransactionId) {
        // Add missing columns if they don't exist
        if (!hasAccountId) {
          db.execSync('ALTER TABLE debts ADD COLUMN account_id TEXT');
        }
        if (!hasTransactionId) {
          db.execSync('ALTER TABLE debts ADD COLUMN transaction_id TEXT');
        }
        
        // Update status values from 'closed' to 'completed'
        db.execSync("UPDATE debts SET status = 'completed' WHERE status = 'closed'");
        
        // For existing debts without account_id, set it to first available account
        const firstAccount = db.getFirstSync('SELECT id FROM accounts LIMIT 1') as { id: string } | null;
        if (firstAccount && !hasAccountId) {
          db.runSync('UPDATE debts SET account_id = ? WHERE account_id IS NULL', [firstAccount.id]);
        }
      }

      // Update transactions table to support new debt transaction types
      // SQLite doesn't support modifying CHECK constraints, so we need to recreate the table
      try {
        // Check if the table already supports borrowed/lent types
        db.runSync("INSERT INTO transactions (id, type, amount, title, category_id, account_id, date, status) VALUES ('test_borrowed', 'borrowed', 0, 'test', '', 'test', '2024-01-01', 'success')");
        // If it succeeds, delete the test record
        db.runSync("DELETE FROM transactions WHERE id = 'test_borrowed'");
      } catch (testError) {
        // If it fails, we need to update the table
        console.log('Updating transactions table to support debt types...');
        
        // Create new table with updated constraints
        db.execSync(`
          CREATE TABLE IF NOT EXISTS transactions_new (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'debt_payment', 'borrowed', 'lent')),
            amount REAL NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            category_id TEXT,
            account_id TEXT NOT NULL,
            to_account_id TEXT,
            date TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
            FOREIGN KEY (category_id) REFERENCES categories (id),
            FOREIGN KEY (account_id) REFERENCES accounts (id),
            FOREIGN KEY (to_account_id) REFERENCES accounts (id)
          );
        `);
        
        // Copy data from old table to new table
        db.execSync(`
          INSERT INTO transactions_new (id, type, amount, title, description, category_id, account_id, to_account_id, date, created_at, status)
          SELECT id, type, amount, title, description, category_id, account_id, to_account_id, date, created_at, status
          FROM transactions;
        `);
        
        // Drop old table and rename new table
        db.execSync('DROP TABLE transactions;');
        db.execSync('ALTER TABLE transactions_new RENAME TO transactions;');
        
        // Recreate indexes
        db.execSync('CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);');
        db.execSync('CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);');
        db.execSync('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);');
        
        console.log('Transactions table updated successfully');
      }

      // Update debts table to support 'completed' status
      try {
        // Check if the table already supports 'completed' status
        db.runSync("INSERT INTO debts (id, type, person_name, amount, account_id, date, status, created_at, updated_at) VALUES ('test_completed', 'got', 'test', 0, 'test', '2024-01-01', 'completed', '2024-01-01', '2024-01-01')");
        // If it succeeds, delete the test record
        db.runSync("DELETE FROM debts WHERE id = 'test_completed'");
      } catch (testError) {
        // If it fails, we need to update the debts table
        console.log('Updating debts table to support completed status...');
        
        // Create new debts table with updated constraints
        db.execSync(`
          CREATE TABLE IF NOT EXISTS debts_new (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL CHECK (type IN ('got', 'gave')),
            person_name TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            account_id TEXT NOT NULL,
            date TEXT NOT NULL,
            due_date TEXT,
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
            transaction_id TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (account_id) REFERENCES accounts (id),
            FOREIGN KEY (transaction_id) REFERENCES transactions (id)
          );
        `);
        
        // Copy data from old table to new table, converting 'closed' to 'completed'
        db.execSync(`
          INSERT INTO debts_new (id, type, person_name, amount, description, account_id, date, due_date, status, transaction_id, created_at, updated_at)
          SELECT id, type, person_name, amount, description, 
                 COALESCE(account_id, (SELECT id FROM accounts LIMIT 1)), 
                 date, due_date, 
                 CASE WHEN status = 'closed' THEN 'completed' ELSE status END,
                 transaction_id, created_at, updated_at
          FROM debts;
        `);
        
        // Drop old table and rename new table
        db.execSync('DROP TABLE debts;');
        db.execSync('ALTER TABLE debts_new RENAME TO debts;');
        
        console.log('Debts table updated successfully');
      }
    } catch (error) {
      console.log('Database migration completed with some warnings:', error);
    }
  }

  // Method to get failed transactions for user review
  getFailedTransactions(): Transaction[] {
    const query = `
      SELECT t.*, c.name as category_name 
      FROM transactions t 
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.status = 'failed'
      ORDER BY t.date DESC, t.amount DESC
    `;
    
    const transactions = this.ensureDatabase().getAllSync(query) as any[];
    return transactions.map(t => ({
      id: t.id,
      type: t.type as TransactionType,
      amount: t.amount,
      title: t.title,
      description: t.description,
      categoryId: t.category_id,
      accountId: t.account_id,
      toAccountId: t.to_account_id,
      date: new Date(t.date),
      createdAt: new Date(t.created_at),
      status: t.status as 'success' | 'failed',
    }));
  }
}

// Export both class and singleton instance
export { DatabaseService };
export const database = new DatabaseService(); 