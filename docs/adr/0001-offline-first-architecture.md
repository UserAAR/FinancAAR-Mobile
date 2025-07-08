# ADR 0001: Adopt an Offline-First Architecture

Date: {{DATE}}

## Status

Accepted

## Context

FinancAAR is designed to be a privacy-focused personal finance manager. Users must be able to record transactions and view analytics **without an internet connection**. Storing sensitive financial data on external servers introduces compliance, security, and trust issues.

## Decision

1. **All user data is stored locally** on the device using SQLite.
2. **No remote API calls** are made by default. External services (e.g., push notifications) are optional and must not transmit personal data.
3. **Critical secrets** (PIN) are kept in `expo-secure-store`, separate from the main DB.
4. Future cloud sync will be **opt-in** and use end-to-end encryption; local functionality remains fully operational when disabled.

## Consequences

### Positive

* Users retain full control of their data; no backend infrastructure costs.
* The app remains fully functional offline (e.g., on flights, in rural areas).
* Compliance burden (GDPR, CCPA) is lower because no personal data is stored server-side.

### Negative

* Cross-device sync is not available out-of-the-box.
* Larger APK size due to embedded SQLite engine and export libraries.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Firebase/Firestore | Real-time sync, less client logic | Requires internet, stores data remotely |
| Custom REST API | Full control over backend | High maintenance, hosting costs, security surface |

## Related Decisions

* ADR-0002 – Secure Storage of Authentication Secrets (planned)
* ADR-0003 – Opt-in End-to-End Encrypted Sync (planned) 