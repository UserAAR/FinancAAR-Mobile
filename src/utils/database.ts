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
    } catch (error) {
      console.error('Error initializing database:', error);
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
        date TEXT NOT NULL,
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
        { name: 'Other Income', icon: 'add-circle', color: '#9C27B0' },
      ];

      // Default expense categories
      const expenseCategories = [
        { name: 'Food & Dining', icon: 'restaurant', color: '#FF5722' },
        { name: 'Shopping', icon: 'bag', color: '#795548' },
        { name: 'Transportation', icon: 'car', color: '#607D8B' },
        { name: 'Bills & Utilities', icon: 'flash', color: '#FF9800' },
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

  // Transaction operations
  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<string> {
    const id = this.generateId();
    const now = new Date().toISOString();

    // Start transaction
    this.ensureDatabase().execSync('BEGIN TRANSACTION');

    try {
      // Insert transaction
      this.ensureDatabase().runSync(
        `INSERT INTO transactions (id, type, amount, title, description, category_id, account_id, to_account_id, date, created_at, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          transaction.type,
          transaction.amount,
          transaction.title,
          transaction.description || null,
          transaction.categoryId,
          transaction.accountId,
          transaction.toAccountId || null,
          transaction.date.toISOString(),
          now,
          transaction.status
        ]
      );

      // Update account balances if transaction is successful
      if (transaction.status === 'success') {
        const account = this.getAccount(transaction.accountId);
        if (!account) {
          throw new Error('Account not found');
        }

        let newBalance: number;
        if (transaction.type === 'income') {
          newBalance = account.balance + transaction.amount;
        } else if (transaction.type === 'expense' || transaction.type === 'debt_payment') {
          newBalance = account.balance - transaction.amount;
          if (newBalance < 0) {
            // Allow negative balance but mark transaction as failed
            this.ensureDatabase().runSync('UPDATE transactions SET status = ? WHERE id = ?', ['failed', id]);
          }
        } else if (transaction.type === 'transfer' && transaction.toAccountId) {
          // Deduct from source account
          newBalance = account.balance - transaction.amount;
          if (newBalance < 0) {
            throw new Error('Insufficient balance for transfer');
          }
          this.updateAccountBalance(transaction.accountId, newBalance);

          // Add to destination account
          const toAccount = this.getAccount(transaction.toAccountId);
          if (!toAccount) {
            throw new Error('Destination account not found');
          }
          this.updateAccountBalance(transaction.toAccountId, toAccount.balance + transaction.amount);
        } else {
          newBalance = account.balance;
        }

        if (transaction.type !== 'transfer') {
          this.updateAccountBalance(transaction.accountId, newBalance);
        }
      }

      this.ensureDatabase().execSync('COMMIT');
      return id;
    } catch (error) {
      this.ensureDatabase().execSync('ROLLBACK');
      throw error;
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
      `INSERT INTO debts (id, type, person_name, amount, description, date, due_date, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        debt.type,
        debt.personName,
        debt.amount,
        debt.description || null,
        debt.date.toISOString(),
        debt.dueDate?.toISOString() || null,
        debt.status,
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

    query += ' ORDER BY created_at DESC';

    const debts = this.ensureDatabase().getAllSync(query, params) as DatabaseDebt[];
    return debts.map(d => ({
      id: d.id,
      type: d.type as DebtType,
      personName: d.person_name,
      amount: d.amount,
      description: d.description,
      date: new Date(d.date),
      dueDate: d.due_date ? new Date(d.due_date) : undefined,
      status: d.status as 'active' | 'closed',
      createdAt: new Date(d.created_at),
      updatedAt: new Date(d.updated_at),
    }));
  }

  updateDebtStatus(debtId: string, status: 'active' | 'closed'): void {
    this.ensureDatabase().runSync(
      'UPDATE debts SET status = ?, updated_at = ? WHERE id = ?',
      [status, new Date().toISOString(), debtId]
    );
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

  // Analytics operations
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
    this.ensureDatabase().execSync('DELETE FROM transactions');
    this.ensureDatabase().execSync('DELETE FROM debt_payments');
    this.ensureDatabase().execSync('DELETE FROM debts');
    this.ensureDatabase().execSync('DELETE FROM accounts');
    this.ensureDatabase().execSync('DELETE FROM app_settings');
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

    return {
      cash: result.cash || 0,
      cards: result.cards || 0,
      total: result.total || 0,
    };
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
}

// Export both class and singleton instance
export { DatabaseService };
export const database = new DatabaseService(); 