# UTXO Pilot — v0.1.0

> A local-first Bitcoin UTXO hygiene and fee planning tool.  
> Watch-only. No keys. No cloud. No telemetry.

---

## What it does

UTXO Pilot helps self-custody Bitcoin users plan spends and consolidations *before* they open their actual wallet. It imports your extended public key (xpub / ypub / zpub), syncs your UTXOs from an Esplora-compatible endpoint, and lets you model coin selection strategies without ever touching private keys.

**It cannot sign or broadcast transactions.** It is a read-only planning tool.

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

### 2. Copy the environment file

```powershell
Copy-Item .env.example packages\backend\.env
```

The defaults work out of the box. Edit `packages\backend\.env` if you want to change the port or DB path.

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
│   │   │   ├── routes/       # API endpoints
│   │   │   └── services/     # derivation, esplora, coin selection
│   │   ├── fixtures/         # Dev seed data
│   │   └── data/             # SQLite file created at runtime
│   └── frontend/             # React + Vite
│       └── src/
│           ├── api/          # API client
│           ├── components/   # Shared UI components
│           ├── pages/        # Route pages
│           └── store/        # Zustand stores
├── .env.example
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

## Supported wallet formats (v0.1)

| Format | Script type | BIP |
|--------|-------------|-----|
| `zpub` | P2WPKH (native segwit) | BIP84 |
| `ypub` | P2SH-P2WPKH (wrapped segwit) | BIP49 |
| `xpub` | P2PKH (legacy) | BIP44 |

Taproot (`xpub` with BIP86) and descriptors are planned for v0.2.

---

## Troubleshooting

**`better-sqlite3` fails to install on Windows**  
Make sure you have the [Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) installed, or use `npm install --ignore-scripts` and then `npx @mapbox/node-pre-gyp install --fallback-to-build`.

**Sync returns no UTXOs**  
Check that your Esplora endpoint is reachable via *Settings → Data Source → Test connection*. If you used a testnet zpub, note that v0.1 is mainnet only.

**Port 3001 is already in use**  
Change `PORT=3002` in `packages/backend/.env`.

---

## Roadmap (planned)

- [ ] Taproot (P2TR) support
- [ ] Descriptor wallets
- [ ] PSBT export (view-only)
- [ ] Tauri desktop packaging
- [ ] Multi-wallet label sync (BIP329)
- [ ] Lightning channel awareness

---

## License

MIT — use freely, no warranty.
