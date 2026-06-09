# UTXO Pilot — Roadmap

This document outlines what has been shipped and what is planned. Priorities may shift based on community feedback.

Have a feature request? Open an issue at [github.com/ramcone/utxo-pilot/issues](https://github.com/ramcone/utxo-pilot/issues) or use the in-app feedback form.

---

## v0.1 — Foundation ✅ Released

The first public release. A fully functional local-first UTXO planning tool.

**Wallet support**
- [x] xpub / ypub / zpub import
- [x] Native SegWit (P2WPKH / bc1q), Wrapped SegWit (P2SH-P2WPKH / 3…), Legacy (P2PKH / 1…)
- [x] Taproot (P2TR / BIP86 / bc1p)
- [x] Built-in xpub → zpub / ypub / Taproot converter (for Ledger users)
- [x] HD wallet address derivation with configurable gap limit

**UTXO management**
- [x] UTXO Explorer with filtering, sorting, and labeling
- [x] BIP329 JSONL label import
- [x] Spend Planner (fee-first and privacy-first coin selection)
- [x] Consolidation Planner (batch small UTXOs)
- [x] Plan History (browse past plans)
- [x] JSON and CSV plan export with signing checklist

**Data and display**
- [x] Live fee rates from mempool.space
- [x] Fee rate history chart (1H / 1D / 1W / 1M / 1Y)
- [x] Fiat currency conversion — 21 currencies
- [x] Public Esplora privacy warning banner
- [x] Rate limiting protection (300ms delay + auto-retry on 429)

**App**
- [x] In-app Getting Started guide
- [x] Why UTXO Pilot page
- [x] In-app bug report / feature request form (GitHub Issues)
- [x] Settings: thresholds, data source, fiat currency
- [x] Local SQLite database with auto-migration
- [x] One-click demo mode — 34 realistic UTXOs across 5 accumulation patterns, no xpub needed
- [x] Spend Planner unit selector — enter amounts in sats, BTC, or fiat currency
- [x] Dashboard small UTXO threshold slider
- [x] Fiat values on plan review summaries (send amount, output, fee)
- [x] Plan History — browse all past spend and consolidation plans
- [x] Screenshots in README
- [x] Trust files — SECURITY.md, PRIVACY.md, CONTRIBUTING.md, DISCLAIMER.md, ROADMAP.md

---

## v0.2 — Depth and usability

Focus: richer data, better UX, packaging.

**Wallet**
- [ ] Descriptor wallet support (output descriptors)
- [ ] Multisig xpub import (basic)
- [ ] Address book — label individual addresses across wallets

**Planning**
- [ ] PSBT export — generate a Partially Signed Bitcoin Transaction file for signing in Sparrow, Coldcard, etc.
- [ ] Batch spend planning — plan multiple outputs in one transaction
- [ ] Custom coin selection — manually pin or exclude specific UTXOs from a plan

**Display**
- [ ] Transaction history view per wallet
- [ ] UTXO age heatmap / visual breakdown
- [ ] Improved fee chart with block-by-block detail

**App**
- [ ] Tauri desktop packaging — native .exe (Windows), .dmg (macOS), .AppImage (Linux)
- [ ] Dark / light theme toggle
- [ ] macOS and Linux installation testing and documentation

---

## v0.3 — Privacy and advanced features

Focus: privacy tooling, multi-wallet, and node integration.

**Privacy**
- [ ] Coin control warnings — flag when a plan would merge UTXOs from different labelled histories
- [ ] Address reuse detection
- [ ] Whirlpool / PayJoin awareness (detection only, not participation)

**Multi-wallet**
- [ ] Multi-wallet unified dashboard — see total balance and UTXOs across all wallets
- [ ] Multi-wallet BIP329 label sync

**Node integration**
- [ ] Electrum server support as a data source
- [ ] Bitcoin Core RPC support (read-only)
- [ ] Lightning channel awareness — flag UTXOs tied to channels

**Export**
- [ ] Coldcard-compatible JSON export
- [ ] Sparrow Wallet plan import format

---

## Beyond v0.3 — Longer term ideas

These are not committed — they depend on demand and feasibility:

- Watch-only multisig coordinator (no signing)
- Mobile companion app (iOS/Android, read-only)
- Tor / proxy support for Esplora requests
- Localisation / translations
- Plugin system for custom coin selection strategies

---

## What will never be added

To preserve the core design principles of UTXO Pilot:

- ❌ Private key or seed phrase input of any kind
- ❌ Transaction signing
- ❌ Transaction broadcasting
- ❌ Cloud accounts or remote data storage
- ❌ Telemetry or analytics
