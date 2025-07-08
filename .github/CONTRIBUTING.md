# Contributing to **FinancAAR**

First off, **thank you** for taking the time to contribute! 🎉 
This document lays out a clear and comprehensive guide for getting involved in the project. Whether you're fixing a typo, adding tests, or proposing a brand-new feature, we welcome your participation.

> **TL;DR** –  
> 1. Fork → Branch → Commit (conventional) → PR → Review → Merge 🚀

---

## 📑 Table of Contents

1. [Development Environment](#development-environment)
2. [Branching Strategy](#branching-strategy)
3. [Commit Message Convention](#commit-message-convention)
4. [Pull Request Checklist](#pull-request-checklist)
5. [Coding Standards & Linting](#coding-standards--linting)
6. [Testing](#testing)
7. [Documentation](#documentation)
8. [Release Process](#release-process)
9. [Security Policy](#security-policy)
10. [Style Guide References](#style-guide-references)

---

## Development Environment

1. **Clone the repo** and install dependencies:

   ```bash
   git clone https://github.com/UserAAR/FinancAAR-Mobile.git && cd FinancAAR-Mobile
   npm i  # or yarn
   ```

2. **Run the dev server**:

   ```bash
   npm run start  # Expo dev tools
   ```

3. **Tests & linting**:

   ```bash
   npm run test     # Jest unit tests
   npm run lint     # ESLint analysis
   npm run format   # Prettier formatting
   ```

> **Tip:** Node ≥20 and Expo CLI are required. See `README.md` for full instructions.

---

## Branching Strategy

* **main** – Always deployable; follows *trunk-based development*.
* **feat/**, **fix/**, **chore/** – Short-lived branches cut from `main`.
* **release/** – (Maintainers only) Stabilisation before a production release.

| Prefix  | Purpose                      | Example                         |
| ------- | --------------------------- | -------------------------------- |
| `feat/` | New feature                 | feat/offline-backup             |
| `fix/`  | Bug fix                     | fix/transaction-amount-rounding |
| `docs/` | Docs only changes           | docs/update-readme              |
| `chore/`| Build or maintenance tasks  | chore/dependabot-config         |

> **Delete branches** after merge to keep the repo tidy.

---

## Commit Message Convention

We follow **[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)** so that changelogs and semantic releases can be automated.

```
<type>(<scope>): <subject>

<body>

<footer>
```

* **type** – `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`.
* **scope** – Optional subsystem: `analytics`, `db`, `auth`, etc.
* **subject** – Short imperative description *(≤72 chars)*.

Examples:

```
feat(analytics): add 30-day cash-flow chart
fix(db): ensure foreign keys are enforced
```

---

## Pull Request Checklist

Before requesting a review, ensure:

- [ ] All **unit tests pass** (`npm run test`).
- [ ] `npm run lint` shows **0 errors**.
- [ ] Changes are **self-documented** or docs are updated.
- [ ] You filled out every section of the **PR template**.
- [ ] No sizeable merge conflicts with `main`.

PRs that do not meet these criteria may be marked as **"needs work"**.

---

## Coding Standards & Linting

* **TypeScript strict mode** – No `any` unless unavoidable.
* **ESLint** – Airbnb + React Native plugin.
* **Prettier** – 2-space indent, single quotes.
* **Reanimated** – Wrap animations in `useSharedValue` & `useAnimatedStyle`.
* **Async code** – Prefer `async/await` with proper `try/catch` blocks.

---

## Testing

* **Unit tests** live next to the code file: `currency.test.ts`.
* **Coverage** target ≥60% lines.
* **Mock native modules** via `jest-expo` presets.
* **E2E** tests (Detox) are planned; contributions welcome.

---

## Documentation

* **Code comments** for complex logic.
* Public APIs documented via **TSDoc**.
* User-facing docs go in `/docs` or the **Wiki**.

---

## Release Process

1. Maintainer merges PRs into `main`.
2. Version bump & changelog generated (`npm version`).
3. Tag pushed → EAS Cloud builds triggered.
4. Assets uploaded to GitHub Release.

---

## Security Policy

Please report **security vulnerabilities** privately via `security@financaar.app`. We adhere to *Coordinated Vulnerability Disclosure* principles.

---

## Style Guide References

* JavaScript: Airbnb JavaScript Style Guide
* React: React/JSX Style Guide @ Airbnb
* Git Commit: Conventional Commits 1.0.0

Happy coding! 🚀 