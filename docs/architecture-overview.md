# 📐 Architecture Overview

This document provides a high-level technical overview of the **FinancAAR** mobile application. It is intended for new contributors and stakeholders who need to understand how the app is structured, how data flows, and where key responsibilities live.

---

## 1. High-Level Diagram *(conceptual)*

```
┌───────────────┐    props    ┌────────────────┐
│   Screens     │◀──────────▶│   Components    │
└───────────────┘             └────────────────┘
        ▲
        │ React-Navigation routes
        ▼
┌────────────────────┐  hooks  ┌─────────────────┐
│   Contexts (Auth,  │◀───────▶│  Custom Hooks   │
│   Theme, etc.)     │         └─────────────────┘
└────────────────────┘
        ▲                         ▲
        │ async calls             │ network / native modules
        ▼                         ▼
┌────────────────────┐     ┌─────────────────────┐
│    Services        │     │   Expo Modules      │
│  (Notifications)   │     │  (SecureStore, FS)  │
└────────────────────┘     └─────────────────────┘
        ▲
        │ SQL queries via utils/database.ts
        ▼
┌────────────────────┐
│     SQLite DB      │
└────────────────────┘
```

---

## 2. Layer Responsibilities

| Layer | Responsibilities | Key Folders |
|-------|------------------|-------------|
| **Presentation** | UI rendering & user interaction | `src/screens`, `src/components`, `src/navigation` |
| **State / Context** | Global state (auth, theme), dependency injection | `src/contexts` |
| **Domain / Hooks** | Stateless business logic, reuse across screens | `src/hooks` |
| **Services** | Side-effects, native capabilities (notifications, biometric) | `src/services` |
| **Data** | Persistence, data access objects (DAOs) | `src/utils/database.ts` |

> **Offline-first**: All CRUD operations are performed locally against SQLite; no remote API calls are required. This guarantees privacy and makes the app usable without an internet connection.

---

## 3. Data Flow

1. **User Interaction** – UI components dispatch events.
2. **Context / Hooks** – Business logic executed; may read/write from DB.
3. **Database Layer** – Queries executed via `expo-sqlite`.
4. **Services** – Optional side-effects (e.g., local notifications).
5. **State Update** – React state/contexts updated → UI re-renders.

---

## 4. Navigation Architecture

* **RootNavigator** – Handles onboarding & authentication (PIN setup/login).
* **AppNavigator** – Bottom Tabs; each tab may contain its own Stack.
* **Dynamic theming** – The `ThemeContext` feeds colours into navigation container.

---

## 5. State Management Strategy

* **Context API + Hooks** – Chosen over Redux for simplicity & bundle size.
* **Memoisation** – `useMemo`, `useCallback` used to avoid unnecessary renders.
* **Async Persistence** – Critical secrets (PIN) via `expo-secure-store`; user data via SQLite.

---

## 6. Native Modules & Permissions

| Capability | Module | Platforms |
|------------|--------|-----------|
| Secure Storage | `expo-secure-store` | Android / iOS |
| Biometric Auth | `expo-local-authentication` | Android / iOS |
| File Export | `expo-file-system`, `expo-print`, `expo-sharing` | Android / iOS |
| Notifications | `expo-notifications` | Android / iOS |

---

## 7. Build & Continuous Delivery

* **EAS Build** – Cloud builds for AAB (Android) and IPA (iOS).
* **Semantic Versioning** – Version number lives in `package.json` & `app.json`.
* **Release Automation** – Tagging `main` triggers EAS build and GitHub Release (maintainers only).

---

## 8. Future Improvements

* Modularise DB access into separate repository for re-use.
* Introduce remote sync layer (optional opt-in) using end-to-end encryption.
* Adopt **React Native Reanimated Layout Animations** for smoother transitions.

---

*Document last updated: {{DATE}}* 