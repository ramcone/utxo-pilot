# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ Yes    |

---

## Reporting a security or privacy issue

If you discover a security vulnerability or privacy concern in UTXO Pilot, **please do not open a public GitHub issue.**

Instead, report it privately by emailing the maintainer or using GitHub's private vulnerability reporting:

**GitHub private disclosure:**  
Go to [github.com/ramcone/utxo-pilot/security/advisories/new](https://github.com/ramcone/utxo-pilot/security/advisories/new) and submit a private advisory.

Please include:
- A clear description of the issue
- Steps to reproduce it
- What data or user could be affected
- Any suggested fix if you have one

You will receive a response within **5 business days**. If the issue is confirmed, a fix will be prioritised and a public disclosure will follow after a patch is released.

---

## Scope

Issues that are in scope for security reports:

- Anything that could expose a user's seed phrase, private key, or extended public key beyond what the user has explicitly shared
- Any way the app could be made to sign or broadcast a transaction without user intent
- Data leaks from the local SQLite database to an external server
- The backend becoming accessible to the network (it should only bind to `127.0.0.1`)
- Injection vulnerabilities in the local API or database layer
- Any mechanism that causes user funds to be at risk

Issues that are out of scope:

- Information already publicly visible on the Bitcoin blockchain
- Issues that require the attacker to already have physical access to the user's machine
- Rate limiting behaviour on public Esplora endpoints (this is a third-party concern)
- Theoretical concerns with no demonstrated impact

---

## Design constraints that reduce attack surface

UTXO Pilot is a read-only planning tool. By design:

- It never accepts seed phrases or private keys — there are no input fields for them
- It cannot sign or broadcast transactions
- The backend API only listens on `127.0.0.1` — it is not reachable from any other machine
- No user data is sent to any external server (except wallet addresses when syncing via a public Esplora endpoint, which is disclosed to the user)
- All persistent data lives in a local SQLite file — no cloud, no remote database

---

## Responsible disclosure

We are committed to working with security researchers. If you report a valid issue responsibly, we will:

- Acknowledge your report promptly
- Keep you updated on the fix progress
- Credit you in the release notes (unless you prefer to remain anonymous)
