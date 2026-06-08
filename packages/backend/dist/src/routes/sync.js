"use strict";
/**
 * Sync route — derives addresses and fetches UTXOs/transactions from Esplora.
 * Addresses are never logged.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRoutes = syncRoutes;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const database_js_1 = require("../db/database.js");
const derivation_js_1 = require("../services/derivation.js");
const esplora_js_1 = require("../services/esplora.js");
// In-memory sync state (per wallet id)
const syncState = new Map();
function getClient(db) {
    const url = db.prepare("SELECT value FROM settings WHERE key = 'esplora_url'").get()?.value
        ?? 'https://blockstream.info/api';
    return new esplora_js_1.EsploraClient(url);
}
async function syncRoutes(app) {
    // Get sync status
    app.get('/api/wallets/:id/sync/status', async (req, reply) => {
        const id = parseInt(req.params.id, 10);
        const state = syncState.get(id) ?? { running: false, progress: 'Not synced yet', error: null };
        const db = (0, database_js_1.getDb)();
        const wallet = db.prepare('SELECT synced_at FROM wallets WHERE id = ?').get(id);
        return reply.send({ ...state, synced_at: wallet?.synced_at ?? null });
    });
    // Trigger sync
    app.post('/api/wallets/:id/sync', async (req, reply) => {
        const id = parseInt(req.params.id, 10);
        const db = (0, database_js_1.getDb)();
        const wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(id);
        if (!wallet)
            return reply.status(404).send({ error: 'Wallet not found' });
        if (syncState.get(id)?.running) {
            return reply.status(409).send({ error: 'Sync already running for this wallet' });
        }
        // Kick off async — return immediately
        syncState.set(id, { running: true, progress: 'Starting…', error: null });
        reply.status(202).send({ ok: true, message: 'Sync started' });
        // Run in background (Fastify won't await this)
        runSync(id, wallet, db, getClient(db)).catch((err) => {
            syncState.set(id, { running: false, progress: 'Failed', error: String(err) });
        });
    });
}
async function runSync(walletId, wallet, db, client) {
    const setState = (progress) => syncState.set(walletId, { running: true, progress, error: null });
    // Retrieve the stored normalised xpub
    const xpubRow = db.prepare(`SELECT value FROM settings WHERE key = 'wallet_xpub_${walletId}'`).get();
    if (!xpubRow)
        throw new Error('Stored xpub not found for wallet');
    const xpubNormalized = xpubRow.value;
    const scriptType = wallet.script_type;
    const gapLimit = wallet.gap_limit ?? 20;
    setState('Deriving addresses…');
    // Scan external (0) and change (1) chains using gap limit
    for (const isChange of [false, true]) {
        let gap = 0;
        let index = 0;
        // Find the highest index already known as used to resume from there
        const existing = db.prepare('SELECT MAX(derivation_index) as max_idx FROM addresses WHERE wallet_id = ? AND is_change = ? AND used = 1').get(walletId, isChange ? 1 : 0);
        if (existing.max_idx !== null)
            index = existing.max_idx + 1;
        while (gap < gapLimit) {
            const address = (0, derivation_js_1.deriveAddress)(xpubNormalized, isChange, index, scriptType);
            setState(`Scanning ${isChange ? 'change' : 'external'} #${index}…`);
            // Ensure address is in DB
            db.prepare('INSERT OR IGNORE INTO addresses (wallet_id, address, derivation_index, is_change) VALUES (?, ?, ?, ?)').run(walletId, address, index, isChange ? 1 : 0);
            // Fetch UTXOs — small delay to avoid rate limiting on public endpoints
            await sleep(300);
            let utxos;
            try {
                utxos = await client.getAddressUTXOs(address);
            }
            catch (err) {
                // Retry once on 429
                if (String(err).includes('429')) {
                    setState(`Rate limited — waiting 10s before retrying #${index}…`);
                    await sleep(10000);
                    try {
                        utxos = await client.getAddressUTXOs(address);
                    }
                    catch (err2) {
                        throw new Error(`Esplora request failed: ${err2}`);
                    }
                }
                else {
                    throw new Error(`Esplora request failed: ${err}`);
                }
            }
            if (utxos.length > 0) {
                gap = 0; // reset gap on activity
                db.prepare('UPDATE addresses SET used = 1 WHERE wallet_id = ? AND address = ?').run(walletId, address);
                // Upsert UTXOs
                const upsert = db.prepare(`
          INSERT OR IGNORE INTO utxos (wallet_id, txid, vout, address, amount, block_height, block_time)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
                for (const u of utxos) {
                    upsert.run(walletId, u.txid, u.vout, address, u.value, u.status.block_height ?? null, u.status.block_time ?? null);
                }
                // Fetch transactions
                try {
                    const txs = await client.getAllTransactions(address);
                    const insertTx = db.prepare(`
            INSERT OR IGNORE INTO transactions (wallet_id, txid, block_height, block_time, fee)
            VALUES (?, ?, ?, ?, ?)
          `);
                    for (const tx of txs) {
                        insertTx.run(walletId, tx.txid, tx.status.block_height ?? null, tx.status.block_time ?? null, tx.fee ?? null);
                        // Mark UTXOs spent if they appear as inputs
                        for (const vin of tx.vin) {
                            db.prepare(`
                UPDATE utxos SET spent = 1, spent_txid = ?
                WHERE wallet_id = ? AND txid = ? AND vout = ? AND spent = 0
              `).run(tx.txid, walletId, vin.txid, vin.vout);
                        }
                    }
                }
                catch {
                    // Non-fatal — UTXOs are already saved
                }
            }
            else {
                gap++;
            }
            index++;
        }
    }
    db.prepare('UPDATE wallets SET synced_at = ? WHERE id = ?').run(Date.now(), walletId);
    syncState.set(walletId, { running: false, progress: 'Sync complete', error: null });
}
//# sourceMappingURL=sync.js.map