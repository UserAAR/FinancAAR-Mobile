<div align="center">

<img src="assets/logo.png" alt="FinancAAR Logo" width="120" />

<br/>

<strong>Offline-first, privacy-focused personal finance manager built with React Native</strong>

<br/><br/>

[![GitHub Stars](https://img.shields.io/github/stars/UserAAR/FinancAAR-Mobile?style=social)](https://github.com/UserAAR/FinancAAR-Mobile/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/UserAAR/FinancAAR-Mobile?style=social)](https://github.com/UserAAR/FinancAAR-Mobile/network/members)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/UserAAR/FinancAAR-Mobile)](https://github.com/UserAAR/FinancAAR-Mobile/issues)

[Wiki](https://github.com/UserAAR/FinancAAR-Mobile/wiki) • [Report Bug](https://github.com/UserAAR/FinancAAR-Mobile/issues) • [Request Feature](https://github.com/UserAAR/FinancAAR-Mobile/issues)

</div>

---

# FinancAAR – Personal Finance Manager 

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
$ git clone https://github.com/UserAAR/FinancAAR-Mobile.git && cd FinancAAR-Mobile

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

FinancAAR is distributed under a **Proprietary License**. You may freely download and use the compiled APK for personal, non-commercial purposes. Any other use—including but not limited to reproducing, modifying, or redistributing the source code—requires prior written permission from **UserAAR**. See [`LICENSE`](LICENSE) for full terms.

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

### Why FinancAAR?

- ✨ **Offline-First Personal Finance** – All data is stored locally using SQLite; no servers, no tracking.
- 🏦 **Unlimited Accounts** – Create as many *Cash* and *Card* accounts as you need with custom colours & emoji icons.
- 💸 **Comprehensive Transactions** – Fast add / edit flow supporting *income*, *expense*, *transfer* and *debt payment* types.
- 🤝 **Debt Management** – Track who you owe (or who owes you), with status updates and visual summaries.
- 📊 **Advanced Analytics** – Interactive charts for the last 7 days, month or any custom range; spot spending trends instantly.
- 🧠 **AI Insights** – AI-powered analysis delivers actionable tips to optimise your budget (processed fully on-device).
- 🔔 **Smart Notifications** – Daily summary & personalised suggestions, scheduled locally so they work even when offline.
- 🔐 **Solid Security** – 4- & 6-digit PIN, plus biometric unlock (Fingerprint / Face ID).
- 📑 **Rich Reporting & Export** – Generate beautifully formatted **CSV**, **XLSX** and **PDF** reports; share via system sheet or save directly to `/Download`.
- 🎨 **Dynamic Theming** – Light, Dark & System modes with instant switching.
- 🚀 **Cross-platform** – Runs smoothly on Android & iOS, thanks to Hermes & Reanimated 3 optimisations.
- 📈 **Financial Health Score** – Composite metric (0-100) based on savings rate, net savings & balance trends.

---

<p align="center">🚀Take charge of your financial journey with <strong>FinancAAR</strong>–where your money is in control and your future is secure💰</p>
