# UTXO Pilot — v0.1.0

> A local-first Bitcoin UTXO hygiene and fee planning tool.  
> Watch-only. No keys. No cloud. No telemetry.

GitHub: [github.com/ramcone/utxo-pilot](https://github.com/ramcone/utxo-pilot)  
License: GNU General Public License v3.0

[PRIVACY.md](PRIVACY.md) · [SECURITY.md](SECURITY.md) · [DISCLAIMER.md](DISCLAIMER.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [ROADMAP.md](ROADMAP.md)

---

## What it does

UTXO Pilot helps self-custody Bitcoin users plan spends and consolidations *before* they open their actual wallet. It imports your extended public key (xpub / ypub / zpub), syncs your UTXOs from an Esplora-compatible endpoint, and lets you model coin selection strategies without ever touching private keys.

**It cannot sign or broadcast transactions.** It is a read-only planning tool.

Key features:
- UTXO Explorer with filtering, sorting, and manual labels (BIP329 import supported)
- Spend Planner with fee-first and privacy-first coin selection modes; enter amounts in sats, BTC, or your chosen fiat currency
- Consolidation Planner with fee comparison across urgency tiers
- Plan History — browse all previously generated spend and consolidation plans
- Live fee rate panel and fee rate history chart (1H / 1D / 1W / 1M / 1Y)
- Fiat currency conversion (21 currencies) shown alongside all BTC and sat amounts, including on plan summaries
- JSON and CSV plan export with a signing checklist
- Taproot (P2TR / BIP86) support including Ledger xpub conversion
- One-click demo mode with 34 realistic pre-loaded UTXOs — no xpub needed
- In-app Getting Started guide and bug report form (GitHub Issues)

---

## Who is it for?

UTXO Pilot is built for **Bitcoin self-custody users** — anyone who holds their own keys using a hardware wallet (Ledger, Trezor, Coldcard, Foundation Passport, etc.) and wants more visibility and control over how their funds are structured and spent.

It is especially useful if you:
- Hold Bitcoin across multiple UTXOs accumulated over time
- Want to minimise transaction fees without guessing which coins to use
- Care about privacy and want to avoid mixing coin histories
- Have small or dust UTXOs you want to consolidate during low-fee periods
- Use Sparrow Wallet, Specter Desktop, or a hardware wallet and want a dedicated planning layer

---

## What it does not do

UTXO Pilot is intentionally limited by design:

- ❌ Does **not** accept seed phrases or private keys — ever
- ❌ Does **not** sign transactions
- ❌ Does **not** broadcast transactions to the Bitcoin network
- ❌ Does **not** send your data to any server or cloud
- ❌ Does **not** require an account or login
- ❌ Does **not** collect telemetry or analytics

It is a **read-only planning tool**. You plan here, then execute in your actual wallet.

---

## Security model

UTXO Pilot can only ever see what your extended public key reveals — your addresses and balances. That is the same information visible to anyone on the blockchain. There is nothing for an attacker to steal.

- **No private key input** — the app does not have fields for seeds or private keys and will reject anything that looks like one
- **No network exposure** — the backend only listens on `127.0.0.1` (your own machine). It is not reachable from the internet or your local network
- **No cloud** — all data is written to a local SQLite file on your machine and goes nowhere else
- **Open source** — the full source code is on GitHub and can be audited by anyone

The worst-case outcome of using UTXO Pilot is that someone learns your Bitcoin balance — the same information already public on the blockchain.

---

## Privacy warnings

- **Public Esplora endpoints** (Blockstream, mempool.space) receive your wallet addresses when you sync. UTXO Pilot shows a persistent yellow warning banner whenever a public endpoint is active.
- xpubs are stored in the local SQLite database only and are not logged in server logs.
- For maximum privacy, run your own Esplora or mempool.space node and set it as your data source under **Settings → Data Source**.
- Fee rate data and BTC price data are fetched from mempool.space. These requests do not include any wallet information.
- No telemetry, no analytics, no accounts.

---

## Demo mode

Not ready to import your real wallet? Try demo mode first — no xpub required.

**Option 1 — one click from the app:**  
Open the app, and on the Welcome screen click **🎮 Try Demo Mode →**. The demo wallet loads instantly and you land directly on the Dashboard.

**Option 2 — from the terminal:**

```bash
npm run seed --workspace=packages/backend
```

Then open the app and select **Demo Wallet — Sample Data** from the wallet picker.

The demo wallet contains **34 realistic fake UTXOs** across five common accumulation patterns:

| Label | Pattern | UTXOs |
|-------|---------|-------|
| Strike - DCA | Small weekly buys over 12 weeks | 12 |
| Coinbase - DCA | Medium monthly exchange withdrawals | 6 |
| Mining | Tiny pool payouts | 10 |
| Business income | Larger irregular payments | 4 |
| Cold storage | Long-term savings UTXOs | 2 |

Every screen — Dashboard, UTXO Explorer, Spend Planner, Consolidation Planner, Plan History — has realistic data to explore. Sync is disabled in demo mode (there is no real wallet to query).

Delete the demo wallet from **Settings → Manage Wallets** when you are ready to import your own.

---

## Screenshots

> Screenshots will be added in a future update. In the meantime, run the app in demo mode (`npm run seed`) to explore the full UI with sample data.

---

## Installation

### Requirements

- **Node.js 18+** (LTS recommended) — [nodejs.org](https://nodejs.org)
- **npm 9+** (bundled with Node)
- Windows 10/11, macOS, or Linux
- Internet connection (or a self-hosted Esplora node)

### Steps

**1. Clone the repository**

```bash
git clone https://github.com/ramcone/utxo-pilot.git
cd utxo-pilot
```

**2. Install dependencies**

```bash
npm install
```

**3. Environment file**

A `.env` file is included in `packages/backend/` with sensible defaults. No changes are needed to get started. Edit it if you want to change the port or database path.

**4. (Optional) Seed demo data**

```bash
npm run seed --workspace=packages/backend
```

**5. Start the app**

```bash
npm run dev
```

| Server   | URL                  |
|----------|----------------------|
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:3001 |

Open **http://localhost:5173** in your browser.

> **Windows note:** Use PowerShell or Windows Terminal. If `better-sqlite3` fails to install, see the Troubleshooting section below.

---

## First-time setup flow

The app includes a built-in **Getting Started** guide (sidebar → ⚡ Getting Started) that tracks your progress through each step. In brief:

1. **Import a wallet** → Paste your `zpub` (native segwit, recommended), `ypub`, or `xpub`.
2. **Configure data source** → Choose Blockstream, mempool.space, or your own node.
3. **Sync** → Click "Sync Now" on the Dashboard to fetch addresses and UTXOs.
4. **Explore** → Browse the UTXO Explorer, add labels, filter by amount.
5. **Plan** → Use Spend Planner or Consolidation Planner.
6. **Export** → Download the plan as JSON or CSV, then recreate it in your hardware wallet.

---

## Supported wallet formats

| Format | Script type | BIP | Address format |
|--------|-------------|-----|----------------|
| `zpub` | P2WPKH (native segwit) | BIP84 | `bc1q…` |
| `ypub` | P2SH-P2WPKH (wrapped segwit) | BIP49 | `3…` |
| `xpub` | P2PKH (legacy) | BIP44 | `1…` |
| `xpub` + Taproot flag | P2TR (Taproot) | BIP86 | `bc1p…` |

**Ledger note:** Ledger Live exports `xpub` version bytes for all account types including Native SegWit and Taproot. Use the built-in converter on the Import Wallet page to get the correct key format — it derives the first address so you can verify it matches your wallet before importing.

Descriptors are planned for a future release.

---

## Fiat currency display

Go to **⚙️ Settings → 💱 Fiat currency** and select from 21 supported currencies (USD, EUR, GBP, CAD, AUD, CHF, JPY, and more). Once saved, approximate fiat values appear alongside all BTC and sat amounts throughout the app including on plan summaries.

Prices are fetched from mempool.space and cached for 5 minutes. No API key is required.

---

## Importing BIP329 labels

Export labels from Sparrow Wallet, Specter Desktop, or any BIP329-compatible wallet as a `.jsonl` file, then import them in the UTXO Explorer screen. Labels are stored only in the local SQLite database.

---

## Project structure

```
utxo-pilot/
├── packages/
│   ├── backend/              # Fastify API + SQLite
│   │   ├── src/
│   │   │   ├── db/           # Database init + migrations
│   │   │   ├── routes/       # wallets, sync, utxos, fees, feeHistory, price,
│   │   │   │                 # labels, plans, export, settings, convert
│   │   │   └── services/     # derivation, esplora, coinSelection, consolidation
│   │   ├── fixtures/         # Dev seed data
│   │   └── data/             # SQLite file created at runtime (git-ignored)
│   └── frontend/             # React + Vite
│       └── src/
│           ├── api/          # API client
│           ├── components/   # Layout, FeePanel, FeeRateChart, FiatValue,
│           │                 # UTXOTable, PrivacyWarning
│           ├── hooks/        # useBTCPrice
│           ├── pages/        # Welcome, ImportWallet, DataSource, Dashboard,
│           │                 # UTXOExplorer, SpendPlanner, ConsolidationPlanner,
│           │                 # PlanReview, PlanHistory, Settings, Setup, WhyUTXOPilot, Feedback
│           ├── store/        # Zustand stores (wallet, plan)
│           ├── currencies.ts # Supported fiat currencies + formatting helpers
│           └── config.ts     # GitHub repo URL (update before deploying)
├── .gitignore
└── README.md
```

---

## Known limitations

- **Mainnet only** — testnet is not supported in v0.1
- **No descriptor wallet support** — only xpub/ypub/zpub formats; descriptor wallets are planned
- **No PSBT export** — plans are exported as JSON/CSV for manual recreation; PSBT support is on the roadmap
- **Public Esplora rate limiting** — rapid syncing on large wallets will trigger rate limits on Blockstream and mempool.space public endpoints. The app handles this automatically with retries, but syncing a large wallet may take several minutes
- **No multi-wallet view** — each wallet is managed independently; a unified multi-wallet dashboard is planned
- **Gap limit** — the default scan depth is 20 consecutive unused addresses. Wallets with unusual derivation patterns may need a higher gap limit (adjustable in Settings)

---

## Roadmap

- [x] Taproot (P2TR / BIP86) support
- [x] Fiat currency conversion (21 currencies)
- [x] Plan History
- [x] Fee rate history chart
- [x] Demo mode — one-click, 34 realistic UTXOs, no xpub needed
- [x] Spend Planner — enter amounts in sats, BTC, or fiat currency
- [x] Trust files — SECURITY.md, PRIVACY.md, CONTRIBUTING.md, DISCLAIMER.md
- [ ] Screenshots in README
- [ ] Descriptor wallets
- [ ] PSBT export (view-only)
- [ ] Tauri desktop packaging (.exe / .dmg)
- [ ] Multi-wallet label sync (BIP329)
- [ ] Multi-wallet unified dashboard
- [ ] Lightning channel awareness

---

## Contributing

Contributions are welcome. UTXO Pilot is open source under GPLv3.

**To contribute:**

1. Fork the repository on GitHub
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test with `npm run dev` and the seed data (`npm run seed --workspace=packages/backend`)
5. Open a pull request with a clear description of what changed and why

**Bug reports and feature requests:**  
Use the in-app feedback form (sidebar → 🐛 Feedback & Bugs) or open an issue directly at [github.com/ramcone/utxo-pilot/issues](https://github.com/ramcone/utxo-pilot/issues).

**Please do not submit pull requests that:**
- Add private key handling, signing, or broadcasting of any kind
- Add cloud storage, telemetry, or external accounts
- Break the local-first, watch-only design principles

---

## Troubleshooting

**`better-sqlite3` fails to install on Windows**  
Make sure you have the [Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) installed, or use `npm install --ignore-scripts` and then `npx @mapbox/node-pre-gyp install --fallback-to-build`.

**Sync returns no UTXOs**  
Check that your Esplora endpoint is reachable via *Settings → Data Source → Test connection*. If you used a testnet zpub, note that v0.1 is mainnet only.

**Sync is slow or shows "Rate limited — waiting 10s…"**  
Public Esplora endpoints (Blockstream, mempool.space) rate-limit rapid requests. UTXO Pilot adds a 300ms delay between address requests and automatically retries after 10 seconds if rate-limited. For a wallet with many addresses this is expected behaviour — let it complete. For faster syncing, run your own Esplora node and set it as your data source.

**Ledger shows 0 balance after sync**  
Ledger Live exports `xpub` version bytes even for Native SegWit and Taproot accounts. On the Import Wallet page, paste your xpub and use the yellow converter panel to convert it to `zpub` (for Native SegWit / `bc1q…` addresses) or enable Taproot mode (for `bc1p…` addresses). Verify the first derived address matches your Ledger Receive address before importing.

**Port 3001 is already in use**  
Change `PORT=3002` in `packages/backend/.env`.

---

## API reference

All endpoints are under `http://localhost:3001/api`.

| Method | Path | Description |
|--------|------|-------------|
| GET    | /wallets | List wallets |
| POST   | /wallets | Import wallet (name + pub) |
| DELETE | /wallets/:id | Remove wallet + all data |
| GET    | /wallets/:id | Wallet detail + stats |
| POST   | /wallets/:id/sync | Trigger address sync |
| GET    | /wallets/:id/sync/status | Sync progress |
| GET    | /wallets/:id/utxos | UTXO list (filterable) |
| GET    | /wallets/:id/balance | Balance summary |
| GET    | /fees | Current fee rates |
| GET    | /fees/history?range=1h\|1d\|1w\|1m\|1y | Fee rate history chart data |
| GET    | /price?currency=USD | Live BTC price in the given fiat currency |
| GET    | /wallets/:id/labels | Labels list |
| POST   | /wallets/:id/labels | Upsert a label |
| POST   | /wallets/:id/labels/import | Import BIP329 JSONL |
| POST   | /wallets/:id/plans/spend | Create spend plan |
| POST   | /wallets/:id/plans/consolidation | Create consolidation plan |
| GET    | /wallets/:id/plans | List plans for a wallet |
| GET    | /plans/:id | Plan detail |
| GET    | /plans/:id/export?format=json | Export plan as JSON |
| GET    | /plans/:id/export?format=csv | Export plan as CSV |
| GET    | /settings | App settings |
| PUT    | /settings | Update settings |
| POST   | /settings/test-esplora | Test Esplora connectivity |
| POST   | /convert-pub | Convert xpub → zpub / ypub, or preview Taproot addresses |
| POST   | /demo/seed | Seed the demo wallet (idempotent — safe to call multiple times) |

---

## Feedback & bug reports

Use the in-app feedback form (sidebar → 🐛 Feedback & Bugs) to submit bug reports and feature requests directly to GitHub Issues.

GitHub repository: [github.com/ramcone/utxo-pilot](https://github.com/ramcone/utxo-pilot)

---

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE) for details.
