# UTXO Pilot — v0.1.0

> A local-first Bitcoin UTXO hygiene and fee planning tool.  
> Watch-only. No keys. No cloud. No telemetry.

---

## What it does

UTXO Pilot helps self-custody Bitcoin users plan spends and consolidations *before* they open their actual wallet. It imports your extended public key (xpub / ypub / zpub), syncs your UTXOs from an Esplora-compatible endpoint, and lets you model coin selection strategies without ever touching private keys.

**It cannot sign or broadcast transactions.** It is a read-only planning tool.

Key features:
- UTXO Explorer with filtering, sorting, and manual labels (BIP329 import supported)
- Spend Planner with fee-first and privacy-first coin selection modes
- Consolidation Planner with fee comparison across urgency tiers
- Live fee rate panel and fee rate history chart (1H / 1D / 1W / 1M / 1Y)
- Fiat currency conversion (21 currencies) shown alongside all BTC and sat amounts
- JSON and CSV plan export with a signing checklist
- Taproot (P2TR / BIP86) support including Ledger xpub conversion
- In-app Getting Started guide and bug report form (GitHub Issues)

---

## Requirements

- **Node.js 18+** (LTS recommended) — [nodejs.org](https://nodejs.org)
- **npm 9+** (bundled with Node)
- Windows 10 / 11 (or macOS / Linux)
- Internet connection (or a self-hosted Esplora node)

---

## Quick start (Windows)

Open **PowerShell** or **Windows Terminal** in the project root folder.

### 1. Install dependencies

```powershell
npm install
```

This installs packages for both the backend and frontend workspaces.

### 2. Environment file

A `.env` file is included in `packages\backend\` with sensible defaults. No changes are needed to get started. You can edit it if you want to change the port or database path.

### 3. (Optional) Seed dev data

If you want to explore the UI without a real wallet, seed mock data:

```powershell
npm run seed --workspace=packages/backend
```

This creates a demo wallet with fake UTXOs so every screen has data to show.

### 4. Start the app

```powershell
npm run dev
```

This starts both servers in parallel:

| Server   | URL                       |
|----------|---------------------------|
| Frontend | http://localhost:5173      |
| Backend  | http://localhost:3001      |

Open **http://localhost:5173** in your browser.

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
│           │                 # PlanReview, Settings, Setup, WhyUTXOPilot, Feedback
│           ├── store/        # Zustand stores (wallet, plan)
│           ├── currencies.ts # Supported fiat currencies + formatting helpers
│           └── config.ts     # GitHub repo URL (update before deploying)
├── .gitignore
└── README.md
```

---

## API reference (brief)

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
| GET    | /plans/:id | Plan detail |
| GET    | /plans/:id/export?format=json | Export plan as JSON |
| GET    | /plans/:id/export?format=csv | Export plan as CSV |
| GET    | /settings | App settings |
| PUT    | /settings | Update settings |
| POST   | /settings/test-esplora | Test Esplora connectivity |
| POST   | /convert-pub | Convert xpub → zpub / ypub, or preview Taproot addresses |

---

## Using your own Esplora node (recommended for privacy)

In the frontend go to **Data Source → Custom / self-hosted** and enter your node's base URL:

```
http://localhost:3002
# or
http://192.168.1.10:3002
```

Compatible backends: [esplora](https://github.com/Blockstream/esplora), [mempool.space](https://github.com/mempool/mempool), any Esplora-compatible API.

---

## Fiat currency display

Go to **⚙️ Settings → 💱 Fiat currency** and select from 21 supported currencies (USD, EUR, GBP, CAD, AUD, CHF, JPY, and more). Once saved, approximate fiat values appear alongside all BTC and sat amounts on the Dashboard, UTXO Explorer, Spend Planner, and Consolidation Planner.

Prices are fetched from mempool.space and cached for 5 minutes. No API key is required.

---

## Importing BIP329 labels

You can export labels from Sparrow Wallet, Specter Desktop, or other BIP329-compatible wallets as a `.jsonl` file, then import them in the UTXO Explorer screen. Labels are stored only in the local SQLite database.

---

## Privacy

- xpubs are stored in the local SQLite database only.
- When using a **public Esplora endpoint**, your addresses are sent to a third-party server. A yellow warning banner is shown at all times.
- xpubs and addresses are **not logged** in server logs.
- No telemetry, no analytics, no accounts.

---

## Security notes

- **Never enter a seed phrase or private key.** UTXO Pilot only accepts extended public keys.
- The backend only listens on `127.0.0.1` — it is not accessible from other machines.
- The SQLite database is stored at `packages/backend/data/utxo-pilot.db` by default.

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

## Troubleshooting

**`better-sqlite3` fails to install on Windows**  
Make sure you have the [Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) installed, or use `npm install --ignore-scripts` and then `npx @mapbox/node-pre-gyp install --fallback-to-build`.

**Sync returns no UTXOs**  
Check that your Esplora endpoint is reachable via *Settings → Data Source → Test connection*. If you used a testnet zpub, note that v0.1 is mainnet only.

**Ledger shows 0 balance after sync**  
Ledger Live exports `xpub` version bytes even for Native SegWit and Taproot accounts. On the Import Wallet page, paste your xpub and use the yellow converter panel to convert it to `zpub` (for Native SegWit / `bc1q…` addresses) or enable Taproot mode (for `bc1p…` addresses). Verify the first derived address matches your Ledger Receive address before importing.

**Port 3001 is already in use**  
Change `PORT=3002` in `packages/backend/.env`.

---

## Roadmap

- [x] Taproot (P2TR / BIP86) support
- [ ] Descriptor wallets
- [ ] PSBT export (view-only)
- [ ] Tauri desktop packaging
- [ ] Multi-wallet label sync (BIP329)
- [ ] Lightning channel awareness

---

## Feedback & bug reports

Use the in-app feedback form (sidebar → 🐛 Feedback & Bugs) to submit bug reports and feature requests directly to GitHub Issues.

GitHub repository: [github.com/ramcone/utxo-pilot](https://github.com/ramcone/utxo-pilot)

---

## Configuring the GitHub feedback link

Open `packages/frontend/src/config.ts` and confirm the repo is set correctly:

```ts
export const GITHUB_REPO = 'ramcone/utxo-pilot';
```

---

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE) for details.
