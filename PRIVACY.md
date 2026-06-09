# Privacy Policy — UTXO Pilot

UTXO Pilot is a local-first application. It does not have servers, accounts, or cloud storage. This document explains exactly what data is stored, where it goes, and what risks you should be aware of.

---

## What data is stored locally

All data is stored in a SQLite database on your machine at:

```
packages/backend/data/utxo-pilot.db
```

The following is stored:

| Data | Where | Notes |
|------|-------|-------|
| Extended public key (xpub / ypub / zpub) | Local SQLite | Used to derive addresses |
| Derived wallet addresses | Local SQLite | Generated from your xpub |
| UTXO list (txid, vout, amount, address) | Local SQLite | Fetched from Esplora |
| Transaction metadata (txid, block height, block time) | Local SQLite | Fetched from Esplora |
| Labels you add to UTXOs or transactions | Local SQLite | Stored only locally |
| Spend and consolidation plans | Local SQLite | Stored only locally |
| App settings (thresholds, data source, fiat currency) | Local SQLite | Never transmitted |
| Fee rate snapshots | Local SQLite | From mempool.space, no wallet data included |

**Nothing in this list is ever sent to any external server by UTXO Pilot itself.**

---

## The most important privacy warning

> **UTXO Pilot does not see seed phrases or private keys, but xpubs, ypubs, and zpubs are sensitive metadata.**
>
> Anyone with your extended public key can derive every address your wallet has ever used or will use, and can look up your full transaction history and current balance on the blockchain. An xpub is not a private key — it cannot move your funds — but it reveals your entire financial history to anyone who holds it.
>
> **For maximum privacy, connect UTXO Pilot to your own node, self-hosted Esplora instance, Electrum server, or other trusted backend.** Do not rely on public endpoints if privacy is important to you.

---

## What data leaves your machine

### When syncing via a public Esplora endpoint

When you use the default Blockstream or mempool.space Esplora endpoints, your **wallet addresses** are sent to their servers as part of the sync process. This is unavoidable — to look up UTXOs, the server must know the addresses.

This means:
- Blockstream / mempool.space can see which addresses you queried
- They can correlate those addresses with your IP address
- They cannot see your private keys or move your funds
- They cannot see your labels or plans (those are local only)

UTXO Pilot shows a **persistent yellow warning banner** whenever a public endpoint is active.

### When fetching fee rates

Fee rate data is fetched from mempool.space (`/api/v1/fees/recommended`). This request contains **no wallet information** — it is a general market data request, no different from visiting mempool.space in a browser.

### When fetching BTC price

Fiat price data is fetched from mempool.space (`/api/v1/prices`). This request also contains **no wallet information**.

### When using a self-hosted node

If you configure a self-hosted Esplora or mempool.space instance as your data source, your address queries go only to your own server. No third party sees your addresses. This is the recommended setup for privacy-conscious users.

---

## What data is never transmitted

- Your seed phrase — UTXO Pilot never asks for it and has no field for it
- Your private keys — same as above
- Your xpub / ypub / zpub — stored locally only, never sent to any external server
- Your labels — stored in local SQLite only
- Your spend or consolidation plans — stored in local SQLite only
- Your app settings — stored in local SQLite only

---

## Telemetry and analytics

UTXO Pilot collects **zero telemetry**. There are no:
- Crash reporters
- Usage analytics
- Feature tracking
- Session recording tools
- Third-party SDKs of any kind

---

## Local database security

The SQLite database is stored unencrypted at `packages/backend/data/utxo-pilot.db`. Anyone with access to your machine can read this file. It contains your xpub and derived addresses.

If you share your machine with others or are concerned about physical access, consider:
- Using full-disk encryption (BitLocker on Windows, FileVault on macOS)
- Deleting the database when not in use (`packages/backend/data/`)
- Not using UTXO Pilot on shared or untrusted machines

---

## Network exposure

The UTXO Pilot backend API only listens on `127.0.0.1` (localhost). It is **not** accessible from other machines on your local network or the internet. No firewall rules or port forwarding are needed and none should be added.

---

## Your responsibilities

UTXO Pilot gives you control over your data. In return:

- **Keep your xpub private.** Treat it like sensitive financial information.
- **Use a self-hosted node** if address privacy from third parties matters to you.
- **Protect your machine** with full-disk encryption and a strong login password.
- **Delete the database** if you no longer use the app and want to remove all stored data.

---

## Changes to this document

If this privacy policy changes in a future release, the change will be noted in the release notes. Given that UTXO Pilot is local-first with no accounts, any changes will only ever affect how local data is handled — never introduce cloud storage or external data transmission.
