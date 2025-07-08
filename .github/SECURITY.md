# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the **latest minor version** of FinancAAR. Older versions may or may not receive back-ported fixes.

| Version | Supported |
|---------|-----------|
| 3.x     | ✅ |
| < 3.0   | ❌ |

## Reporting a Vulnerability

If you discover a security vulnerability **please DO NOT create a public issue**.
Instead, report it privately so we can address it promptly and responsibly.

1. Email **security@financaar.app** with the subject line `Security Disclosure <short summary>`.
2. Include detailed reproduction steps or a proof-of-concept exploit.
3. Indicate the version of FinancAAR you tested against and any relevant environment details.

We aim to acknowledge receipt within **72 hours** and provide a status update within **7 calendar days**.

## Disclosure Process

1. **Investigation** – We reproduce the issue and assess impact/severity.
2. **Patch Development** – A fix is developed and regression tests are added.
3. **Coordinated Release** – We publish an update and credit the reporter (*optional anonymisation*).
4. **Public Disclosure** – After users have had reasonable time to update (typically 30 days), details are posted in our advisory tracker.

## Scope

This policy covers the **FinancAAR Mobile** application and its source code. It does **not** cover third-party dependencies; vulnerabilities in third-party libraries should be reported upstream.

## Exclusions

The following are generally **out of scope**:

* UI/UX bugs that do not impact security.
* Denial of service attacks requiring privileged or physical access.
* Vulnerabilities in platforms or operating systems (Android/iOS) themselves.

## Hall of Fame

We gratefully acknowledge researchers who responsibly disclose security vulnerabilities. If you'd like recognition, please let us know in your initial report.

---

*Last updated: {{DATE}}* 