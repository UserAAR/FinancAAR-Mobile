# 🗂️ Database Schema

FinancAAR uses **SQLite** via Expo's `expo-sqlite` wrapper. All tables are created automatically the first time the app launches. Below is a detailed breakdown of each table and its relationships.

---

## 1. Entity Relationship Diagram *(textual)*

```
accounts ─┬───────────┐               
          │           │               
          │   1      n│               
          ▼           │               
transactions ────▶ categories         
      │               ▲               
      │1            1 │               
      ▼               │               
   debts──────────────┘               
```

*(1 → n arrows indicate one-to-many relationships.)*

---

## 2. Table Definitions

### 2.1 `accounts`

| Column       | Type    | Constraints       | Description                          |
|--------------|---------|-------------------|--------------------------------------|
| `id`         | TEXT    | **PK**, UUID      | Primary key, generated as UUID v4.    |
| `name`       | TEXT    | NOT NULL          | User-friendly account name.           |
| `type`       | TEXT    | CHECK cash/card   | Cash or Card.                         |
| `balance`    | REAL    | DEFAULT 0         | Current balance.                      |
| `color`      | TEXT    | NULLABLE          | Hex colour string (e.g., `#FF8A65`).  |
| `emoji`      | TEXT    | NULLABLE          | Emoji icon (UTF-8).                   |
| `createdAt`  | INTEGER | DEFAULT unixTime  | UTC ms timestamp.                     |

SQL Snippet:

```sql
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('cash','card')),
  balance REAL DEFAULT 0,
  color TEXT,
  emoji TEXT,
  createdAt INTEGER DEFAULT (strftime('%s','now')*1000)
);
```

### 2.2 `categories`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id`   | TEXT | **PK**      | UUID v4     |
| `name` | TEXT | NOT NULL    | Category name |
| `type` | TEXT | income/expense | Distinguishes inflow/outflow |

### 2.3 `transactions`

| Column        | Type    | Constraints              | Description |
|---------------|---------|--------------------------|-------------|
| `id`          | TEXT    | **PK**                   | UUID v4     |
| `amount`      | REAL    | NOT NULL                | Positive number |
| `type`        | TEXT    | CHECK list              | income, expense, transfer, borrowed, lent |
| `date`        | INTEGER | NOT NULL                | Unix ms timestamp |
| `title`       | TEXT    | NOT NULL                | User-defined title |
| `categoryId`  | TEXT    | FK → categories(id)     | Nullable for transfers |
| `accountId`   | TEXT    | FK → accounts(id)       | Origin account |
| `toAccountId` | TEXT    | FK → accounts(id)       | Destination (for transfers) |

### 2.4 `debts`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id`   | TEXT | **PK**      | UUID v4     |
| `personName` | TEXT | NOT NULL | Person involved |
| `amount` | REAL | NOT NULL | Outstanding amount |
| `status` | TEXT | CHECK paid/unpaid | Current status |
| `date` | INTEGER | NOT NULL | Date of borrowing/lending |

---

## 3. Indexes & Performance

* Composite index on `transactions(date)` for fast range queries.
* Foreign key constraints enabled with `PRAGMA foreign_keys = ON`.

---

## 4. Data Lifecycle

* **Soft-delete** not currently implemented; deletion is permanent.
* **Migrations** handled manually in `utils/database.ts` via `user_version` pragma.

---

## 5. Future Work

* Add `budgets` table for envelope budgeting.
* Introduce soft-delete + sync metadata when cloud sync is added.

---

*Document last updated: {{DATE}}* 