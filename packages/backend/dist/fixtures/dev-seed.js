"use strict";
/**
 * Dev fixture — seeds the database with a fake wallet and mock UTXOs
 * so you can explore the UI without connecting to an Esplora endpoint.
 *
 * Run: npm run seed --workspace=packages/backend
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const database_js_1 = require("../src/db/database.js");
const db = (0, database_js_1.getDb)();
// A real zpub from a publicly known test/example wallet (Sparrow sample)
// This is safe to include — it is a published test vector, not anyone's real funds.
const SAMPLE_ZPUB = 'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31e3YZkF8VvwVzR9NH4juu';
console.log('Seeding dev database…');
// Insert wallet
let walletId;
try {
    const result = db.prepare(`
    INSERT OR IGNORE INTO wallets (name, original_pub, pub_type, script_type, derivation_path, gap_limit, created_at, synced_at)
    VALUES ('Demo Wallet (testnet sample)', ?, 'zpub', 'p2wpkh', ?, 20, ?, ?)
  `).run(SAMPLE_ZPUB, "m/84'/0'/0'", Date.now(), Date.now());
    walletId = result.lastInsertRowid;
    if (result.changes === 0) {
        walletId = db.prepare("SELECT id FROM wallets WHERE name = 'Demo Wallet (testnet sample)'").get().id;
    }
}
catch (err) {
    console.error('Wallet insert failed:', err);
    process.exit(1);
}
// Store normalised xpub (same as original for xpub type — for demo purposes)
db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(`wallet_xpub_${walletId}`, 'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oijk3WkiGk4Q5TSVxsWbcBH7Xr4kpRba');
// Seed mock UTXOs
const now = Math.floor(Date.now() / 1000);
const mockUTXOs = [
    { txid: 'aaaa'.repeat(16), vout: 0, address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', amount: 5000000, block_height: 840000, block_time: now - 86400 * 30 },
    { txid: 'bbbb'.repeat(16), vout: 1, address: 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3', amount: 1230000, block_height: 841000, block_time: now - 86400 * 14 },
    { txid: 'cccc'.repeat(16), vout: 0, address: 'bc1q0c7y6x7kz0lj5gqq2dk90kl2nxzl04l9whnqcy', amount: 500000, block_height: 842000, block_time: now - 86400 * 7 },
    { txid: 'dddd'.repeat(16), vout: 0, address: 'bc1qa5wkgaew2dkv56kfvj49j0av5nml45x9ek9hz6', amount: 8500, block_height: 842500, block_time: now - 86400 * 3 },
    { txid: 'eeee'.repeat(16), vout: 2, address: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', amount: 3200, block_height: 843000, block_time: now - 86400 * 1 },
    { txid: 'ffff'.repeat(16), vout: 0, address: 'bc1q34aq5gy8hyl6zr73g7z84pnj7n4z0grtv3eqdr', amount: 750, block_height: 843100, block_time: now - 3600 },
    { txid: 'a1b2'.repeat(16), vout: 0, address: 'bc1qh4nqnzxnh82cdy2n9qv7h54m02nk3wpnfyspq4', amount: 2100000, block_height: null, block_time: null }, // unconfirmed
];
const insertUTXO = db.prepare(`
  INSERT OR IGNORE INTO utxos (wallet_id, txid, vout, address, amount, block_height, block_time)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
for (const u of mockUTXOs) {
    insertUTXO.run(walletId, u.txid, u.vout, u.address, u.amount, u.block_height, u.block_time);
}
// Seed mock labels
const insertLabel = db.prepare(`
  INSERT OR REPLACE INTO labels (wallet_id, ref, label_type, name, created_at)
  VALUES (?, ?, 'output', ?, ?)
`);
insertLabel.run(walletId, `${'aaaa'.repeat(16)}:0`, 'Cold storage — main', Date.now());
insertLabel.run(walletId, `${'bbbb'.repeat(16)}:1`, 'Cold storage — main', Date.now());
insertLabel.run(walletId, `${'cccc'.repeat(16)}:0`, 'Coinbase reward', Date.now());
insertLabel.run(walletId, `${'dddd'.repeat(16)}:0`, 'Dust / unknown', Date.now());
// Seed a fee snapshot so the app works offline
db.prepare(`
  INSERT OR IGNORE INTO fee_snapshots (fetched_at, fastest, half_hour, hour, minimum)
  VALUES (?, 25, 12, 6, 2)
`).run(Date.now());
console.log(`Done. Wallet id=${walletId} seeded with ${mockUTXOs.length} UTXOs.`);
//# sourceMappingURL=dev-seed.js.map