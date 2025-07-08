# FinancAAR – Personal Finance Manager (React Native / Expo)

FinancAAR is a cross-platform (Android & iOS) personal-finance manager that helps you **track income & expenses, manage debts, analyse spending trends and generate beautifully formatted financial reports** – all offline and completely private.  
This repository hosts the *production-ready source code* for the mobile client.

---

## ✨ Key Features

| Area | Highlights |
|------|------------|
| **Accounts** | • Unlimited *Cash* and *Card* accounts  
• Custom colours & emoji icons  |
| **Transactions** | • Fast add / edit flow with category selector  
• Supports *income*, *expense*, *transfer*, *debt payment* |
| **Debts** | • Track who you owe & who owes you  
• Status updates (paid / unpaid) |
| **Smart Notifications** | • Daily summary & personalised tips  
• Schedules handled locally (works offline) |
| **Security** | • PIN (4 & 6 digits)  
• Biometric unlock (Fingerprint / Face ID) |
| **Analytics** | • Charts for last 7 days / month / customised ranges  |
| **Financial Reports** | • Multi-select data types (Transactions, Debts, Balances, Categories, Accounts)  
• Preset ranges (1 day, 1 week, 1/3/6 months, all time)  
• Export to **CSV**, **XLSX**, **PDF**  
• Share sheet **or** direct download to `/Download` (Android SAF)  |
| **Theming** | • Light / Dark / System  |
| **Offline-first** | • Local SQLite DB (no remote server needed) |

---

## 🛠️ Tech Stack

* **React Native 0.79** (Hermes)  
* **Expo SDK 53**  
* **TypeScript 5**  
* `expo-file-system`, `expo-print`, `expo-notifications`, `expo-secure-store`, `expo-local-authentication`, `expo-sqlite`  
* **React Navigation 7** (Stack & Bottom Tabs)  
* **Reanimated 3**, **Gesture Handler 2**  
* Charts – `react-native-chart-kit`  
* XLSX – `xlsx 0.18` (SheetJS)  

### Folder Structure (simplified)

```txt
src/
  components/        # Reusable UI elements (AccountCard, Toast…)
  screens/           # App screens, incl. Settings & Reports modal
  navigation/        # React-Navigation stacks & tabs
  contexts/          # Theme & Auth contexts
  hooks/             # Custom hooks (biometric, secure storage, notifications)
  services/          # Local & push notification helpers
  utils/             # DB wrapper, currency helper, exporter (CSV/XLSX/PDF)
  types/             # Global type declarations
```

---

## 🚀 Getting Started

### Prerequisites

* **Node.js ≥20**  
* **Expo CLI** – `npm i -g expo-cli`  
* A physical Android / iOS device **or** simulator/emulator

### Local Setup

```bash
# 1. Clone repo
$ git clone https://github.com/<you>/financaar-app.git && cd financaar-app

# 2. Install deps
$ npm i           # or yarn

# 3. Start dev server
$ npm run start   # Expo dev menu
```

*Press **"a"** to open Android Emulator, **"i"** for iOS Simulator or scan QR with Expo Go.*

### Environment Variables

This project does **not** require remote API keys.  
All storage is local; only system permissions are requested at runtime (Notifications, Storage, Biometric).

---

## 📦 Building for Production

### Android (AAB / APK)

```bash
# Install EAS CLI if needed
yarn global add eas-cli   # or npm i -g eas-cli

# Configure (first time only)
eas build:configure

# Cloud build (AAB)
eas build -p android --profile production
```

The build finishes with a download URL you can attach to a GitHub Release.

### iOS (IPA)

```bash
eas build -p ios --profile production
```

*Requires Apple ID credentials & certificates (managed by EAS).*  

---

## 🗂️ Database Schema

SQLite tables are created automatically on first run.

| Table | Fields (excerpt) |
|-------|------------------|
| **accounts** | id (PK), name, type (cash/card), balance, color, emoji, createdAt |
| **categories** | id (PK), name, type (income/expense) |
| **transactions** | id (PK), amount, type, date, title, categoryId (FK), accountId (FK) |
| **debts** | id (PK), personName, amount, status, date |

See `src/utils/database.ts` for full schema & helper methods.

---

## 🔐 Permissions

| Platform | When | API |
|----------|------|-----|
| Android | Export → Download | `StorageAccessFramework` (WRITE_EXTERNAL_STORAGE fallback API < 33) |
| Android & iOS | Reporting → Share | `expo-sharing` |
| Android & iOS | Biometric Login | `expo-local-authentication` |
| Android & iOS | Notifications | `expo-notifications` (foreground & scheduled) |

All permissions are requested **just-in-time**, with graceful handling if denied.

---

## 🧑‍💻 Contributing

1. Fork & clone repo.  
2. `git checkout -b feat/my-feature`  
3. Commit with conventional-commit messages.  
4. `git push` and open a PR.  
5. CI/Lint must pass before merge.

### Code Style

* **TypeScript strict**  
* ESLint + Prettier configured via Expo defaults.  
* Commit messages follow *Conventional Commits*.

---

## 📝 License

This project is licensed under the **MIT License** – see [`LICENSE`](LICENSE) for details.

---

## 🙏 Acknowledgements

* [Expo](https://expo.dev) – making React Native painless.  
* [SheetJS](https://github.com/SheetJS/sheetjs) for XLSX export.  
* [React Navigation](https://reactnavigation.org) & community libraries.

## 📊 **FINANCIAL CALCULATION METHODOLOGY**

### **Mathematically Proven Formulas Used:**

#### **Net Savings Calculation (Real Wealth Building):**
```
Net Savings = Current Total Assets - Previous Period Total Assets
```
- **Source**: Standard financial accounting principles
- **Why Accurate**: Measures actual wealth accumulation, not just cash flow
- **Implementation**: `database.calculateNetSavings()`

#### **Savings Rate Calculation (Industry Standard):**
```
Savings Rate = (Net Savings / Gross Income) × 100
```
- **Source**: Financial Independence community standards, CFP Board recommendations
- **Why Accurate**: Shows true percentage of income building wealth
- **Implementation**: `database.calculateSavingsRate()`

#### **Cash Flow Savings Rate (Traditional Method):**
```
Cash Flow Rate = ((Income - Expenses) / Income) × 100
```
- **Source**: Traditional budgeting methods
- **Use Case**: Month-to-month spending analysis
- **Limitation**: Doesn't account for asset changes or transfers

#### **Financial Health Score (0-100 Composite):**
```
Health Score = Savings Rate (40%) + Net Savings (30%) + Trend (20%) + Balance (10%)
```
- **Methodology**: Weighted composite based on financial planning best practices
- **Benchmarks**: 
  - 80-100: Excellent financial health
  - 60-79: Good financial health 
  - 40-59: Fair, needs improvement
  - 0-39: Poor, requires immediate attention

### **Data Sources & Accuracy:**
- ✅ **All Account Balances**: Real-time from user's actual accounts
- ✅ **All Transactions**: Complete transaction history
- ✅ **Category Spending**: Accurate categorized expenses
- ✅ **Income Tracking**: All income sources recorded
- ✅ **Time Periods**: 3-month, 6-month, 1-year analysis

### **Mathematical Verification:**
- ✅ **Zero Sum Principle**: All money flows tracked
- ✅ **Double Entry**: Account balance changes = transaction totals
- ✅ **Period Consistency**: Calculations verified across time periods
- ✅ **Industry Standards**: Formulas match financial planning guidelines

---

## Features 