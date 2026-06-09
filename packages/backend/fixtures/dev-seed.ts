/**
 * Dev fixture — seeds the database with a realistic demo wallet and mock UTXOs.
 * Covers five common UTXO patterns so every screen has meaningful data to show.
 *
 * Run: npm run seed --workspace=packages/backend
 * Or triggered via POST /api/demo/seed from the frontend.
 */

import 'dotenv/config';
import { getDb } from '../src/db/database.js';

export const DEMO_WALLET_NAME = 'Demo Wallet — Sample Data';

// A publicly known test zpub (Sparrow sample wallet — not real funds)
const SAMPLE_ZPUB =
  'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31e3YZkF8VvwVzR9NH4juu';

// Sample bc1q addresses (valid format, not associated with real funds)
const ADDRESSES = [
  'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0g',
  'bc1q0c7y6x7kz0lj5gqq2dk90kl2nxzl04l9whnqcy',
  'bc1qa5wkgaew2dkv56kfvj49j0av5nml45x9ek9hz6',
  'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu',
  'bc1q34aq5gy8hyl6zr73g7z84pnj7n4z0grtv3eqdr',
  'bc1qh4nqnzxnh82cdy2n9qv7h54m02nk3wpnfyspq4',
  'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
  'bc1q6y8dth5uh0pgn7gkkv9lp0f7kfuysnxmzz3wgt',
  'bc1qnmfmkyl5k8vp8q9dqmkgdwk4jlzxqmkp7ky7rz',
  'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  'bc1qp38nfm4tu8e0kh7z3qj7rkmmsl7pkm5nkrfk6h',
  'bc1qejq7v9j2pjz2vxq0tmfz3x7xdv7kvmsmx8jfgr',
  'bc1qd2tmu5g83s3h0dq6e2fklmlefvt5n5nq0s4kzv',
  'bc1qfj7y2vk72n3yqr6j3m0pl7kzfdxq2n9mzhppf3',
  'bc1qs3y6m8f9kq7x2j6v5z0n0t4y8wqc3r2l7dh5ku',
  'bc1q8kz4r3n7y2p6x5m0j9v4q8w2t6f3c1l0h7e5gu',
  'bc1qp7v3c8m2k6y4z9x0j5n8r1t4w7q2f5l9h0e3du',
  'bc1qm5z9n8y3c7k6x2j4v0t1r8w5q4f9l3h7e2p6bu',
  'bc1qt4z8m9c3y7k5x2j6v0n1r4w8q5f2l9h3e7p0au',
  'bc1qv3y7n9c8k5z4x2j0m6r1t8w4q7f5l2h9e3p4xu',
  'bc1qc8n4z7y9k5m3x2j0v6r1t4w8q5f9l7h2e3p6wu',
  'bc1qr5m8z4y7k9c3x2j0v6n1t4w5q8f2l9h7e3p5vu',
  'bc1qk9z5m4y8c7n3x2j0v6r1t8w4q5f7l2h9e3p4tu',
  'bc1qn8m5z7y4c9k3x2j0v6r1t4w8q5f9l3h2e7p6su',
  'bc1qj6v4z8y5c9m3k2x0n1r7t4w5q8f2l9h3e7p4ru',
  'bc1qg9n4z5y8c7k3m2x0v6r1t4w8q5f2l9h7e3p6qu',
  'bc1qf8m5z4y9c7k3n2x0v6r1t4w8q5f2l9h3e7p5pu',
  'bc1qe7n4z5y8c9k3m2x0v6r1t4w5q8f2l9h3e7p4ou',
  'bc1qd6m4z5y9c8k3n2x0v6r1t4w8q5f2l3h7e9p4nu',
  'bc1qc5n4z8y7c9k3m2x0v6r1t4w5q8f2l9h3e7p4mu',
  'bc1qb4m5z7y8c9k3n2x0v6r1t4w8q5f2l9h3e7p4lu',
  'bc1qa3n4z5y8c7k9m2x0v6r1t4w8q5f2l9h3e7p4ku',
  'bc1q95m4z6y8c7k3n2x0v6r1t4w8q5f2l9h3e7p4ju',
  'bc1q84n4z5y9c8k3m2x0v6r1t4w5q8f2l9h3e7p4iu',
  'bc1q73m5z4y8c9k3n2x0v6r1t4w8q5f2l9h3e7p4hu',
  'bc1q62n4z5y7c9k3m2x0v6r1t4w8q5f2l9h3e7p4gu',
  'bc1q51m4z6y8c7k3n2x0v6r1t4w8q5f2l9h3e7p4fu',
  'bc1q40n4z5y8c9k3m2x0v6r1t4w5q8f2l9h3e7p4eu',
  'bc1q39m5z4y7c9k3n2x0v6r1t4w8q5f2l9h3e7p4du',
];

function txid(seed: string): string {
  return seed.repeat(2).slice(0, 64);
}

export function seedDemoWallet(db: ReturnType<typeof getDb>): number {
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;

  // ── Create or find the demo wallet ──────────────────────────────────────────
  const existing = db.prepare(
    "SELECT id FROM wallets WHERE name = ?"
  ).get(DEMO_WALLET_NAME) as { id: number } | undefined;

  if (existing) return existing.id;

  const walletResult = db.prepare(`
    INSERT INTO wallets (name, original_pub, pub_type, script_type, derivation_path, gap_limit, created_at, synced_at)
    VALUES (?, ?, 'zpub', 'p2wpkh', ?, 20, ?, ?)
  `).run(DEMO_WALLET_NAME, SAMPLE_ZPUB, "m/84'/0'/0'", Date.now(), Date.now());

  const walletId = walletResult.lastInsertRowid as number;

  // ── UTXOs ────────────────────────────────────────────────────────────────────
  //
  // Five UTXO patterns that represent a realistic self-custody user:
  //
  //   1. Strike – DCA        12 small weekly buys
  //   2. Coinbase – DCA       6 medium monthly withdrawals
  //   3. Mining               10 tiny pool payouts
  //   4. Business income       4 larger irregular payments
  //   5. Cold storage          2 large long-term savings UTXOs

  const utxos: Array<{
    txid: string; vout: number; address: string; amount: number;
    block_height: number | null; block_time: number | null; label: string;
  }> = [

    // ── 1. Strike DCA — 12 small weekly buys ──────────────────────────────
    { txid: txid('a1b2c3d4e5f6a1b2'), vout: 0, address: ADDRESSES[0],  amount: 12_400, block_height: 843_801, block_time: now - day * 84, label: 'Strike - DCA' },
    { txid: txid('b2c3d4e5f6a1b2c3'), vout: 0, address: ADDRESSES[1],  amount: 11_800, block_height: 843_902, block_time: now - day * 77, label: 'Strike - DCA' },
    { txid: txid('c3d4e5f6a1b2c3d4'), vout: 0, address: ADDRESSES[2],  amount: 13_100, block_height: 844_010, block_time: now - day * 70, label: 'Strike - DCA' },
    { txid: txid('d4e5f6a1b2c3d4e5'), vout: 0, address: ADDRESSES[3],  amount: 14_200, block_height: 844_118, block_time: now - day * 63, label: 'Strike - DCA' },
    { txid: txid('e5f6a1b2c3d4e5f6'), vout: 0, address: ADDRESSES[4],  amount: 10_950, block_height: 844_223, block_time: now - day * 56, label: 'Strike - DCA' },
    { txid: txid('f6a1b2c3d4e5f6a1'), vout: 0, address: ADDRESSES[5],  amount: 15_600, block_height: 844_330, block_time: now - day * 49, label: 'Strike - DCA' },
    { txid: txid('a1b2c3d4e5f6b2c3'), vout: 0, address: ADDRESSES[6],  amount: 13_750, block_height: 844_441, block_time: now - day * 42, label: 'Strike - DCA' },
    { txid: txid('b2c3d4e5f6a1c3d4'), vout: 0, address: ADDRESSES[7],  amount: 11_300, block_height: 844_553, block_time: now - day * 35, label: 'Strike - DCA' },
    { txid: txid('c3d4e5f6a1b2d4e5'), vout: 0, address: ADDRESSES[8],  amount: 16_100, block_height: 844_661, block_time: now - day * 28, label: 'Strike - DCA' },
    { txid: txid('d4e5f6a1b2c3e5f6'), vout: 0, address: ADDRESSES[9],  amount: 14_800, block_height: 844_772, block_time: now - day * 21, label: 'Strike - DCA' },
    { txid: txid('e5f6a1b2c3d4f6a1'), vout: 0, address: ADDRESSES[10], amount: 12_950, block_height: 844_880, block_time: now - day * 14, label: 'Strike - DCA' },
    { txid: txid('f6a1b2c3d4e5a1b2'), vout: 0, address: ADDRESSES[11], amount: 15_200, block_height: 844_991, block_time: now - day *  7, label: 'Strike - DCA' },

    // ── 2. Coinbase DCA — 6 medium monthly withdrawals ────────────────────
    { txid: txid('11223344556677aa'), vout: 1, address: ADDRESSES[12], amount: 185_000, block_height: 840_210, block_time: now - day * 180, label: 'Coinbase - DCA' },
    { txid: txid('22334455667788bb'), vout: 0, address: ADDRESSES[13], amount: 210_500, block_height: 840_820, block_time: now - day * 150, label: 'Coinbase - DCA' },
    { txid: txid('33445566778899cc'), vout: 0, address: ADDRESSES[14], amount: 175_800, block_height: 841_430, block_time: now - day * 120, label: 'Coinbase - DCA' },
    { txid: txid('4455667788990add'), vout: 0, address: ADDRESSES[15], amount: 232_000, block_height: 842_040, block_time: now - day *  90, label: 'Coinbase - DCA' },
    { txid: txid('556677889900bbee'), vout: 1, address: ADDRESSES[16], amount: 198_600, block_height: 842_650, block_time: now - day *  60, label: 'Coinbase - DCA' },
    { txid: txid('66778899001122ff'), vout: 0, address: ADDRESSES[17], amount: 245_900, block_height: 843_260, block_time: now - day *  30, label: 'Coinbase - DCA' },

    // ── 3. Mining — 10 tiny pool payouts ─────────────────────────────────
    { txid: txid('aa01bb02cc03dd04'), vout: 2, address: ADDRESSES[18], amount: 2_850, block_height: 841_100, block_time: now - day * 160, label: 'Mining' },
    { txid: txid('bb02cc03dd04ee05'), vout: 0, address: ADDRESSES[19], amount: 1_920, block_height: 841_350, block_time: now - day * 140, label: 'Mining' },
    { txid: txid('cc03dd04ee05ff06'), vout: 1, address: ADDRESSES[20], amount: 3_410, block_height: 841_600, block_time: now - day * 120, label: 'Mining' },
    { txid: txid('dd04ee05ff06aa07'), vout: 0, address: ADDRESSES[21], amount: 980,   block_height: 841_850, block_time: now - day * 100, label: 'Mining' },
    { txid: txid('ee05ff06aa07bb08'), vout: 0, address: ADDRESSES[22], amount: 2_170, block_height: 842_100, block_time: now - day *  80, label: 'Mining' },
    { txid: txid('ff06aa07bb08cc09'), vout: 2, address: ADDRESSES[23], amount: 1_440, block_height: 842_350, block_time: now - day *  65, label: 'Mining' },
    { txid: txid('aa07bb08cc09dd10'), vout: 0, address: ADDRESSES[24], amount: 3_750, block_height: 842_600, block_time: now - day *  50, label: 'Mining' },
    { txid: txid('bb08cc09dd10ee11'), vout: 1, address: ADDRESSES[25], amount: 820,   block_height: 842_850, block_time: now - day *  38, label: 'Mining' },
    { txid: txid('cc09dd10ee11ff12'), vout: 0, address: ADDRESSES[26], amount: 2_630, block_height: 843_100, block_time: now - day *  22, label: 'Mining' },
    { txid: txid('dd10ee11ff12aa13'), vout: 0, address: ADDRESSES[27], amount: 1_190, block_height: 843_350, block_time: now - day *  10, label: 'Mining' },

    // ── 4. Business income — 4 larger irregular payments ─────────────────
    { txid: txid('biz001aabbcc1122'), vout: 0, address: ADDRESSES[28], amount: 875_000,   block_height: 839_500, block_time: now - day * 200, label: 'Business income' },
    { txid: txid('biz002bbccdd2233'), vout: 1, address: ADDRESSES[29], amount: 1_450_000, block_height: 841_000, block_time: now - day * 130, label: 'Business income' },
    { txid: txid('biz003ccddeee334'), vout: 0, address: ADDRESSES[30], amount: 620_000,   block_height: 842_200, block_time: now - day *  75, label: 'Business income' },
    { txid: txid('biz004ddeeeff445'), vout: 0, address: ADDRESSES[31], amount: 2_100_000, block_height: 843_700, block_time: now - day *  18, label: 'Business income' },

    // ── 5. Cold storage — 2 large long-term savings UTXOs ────────────────
    { txid: txid('cold01aabbccddeef'), vout: 0, address: ADDRESSES[32], amount: 8_500_000,  block_height: 820_000, block_time: now - day * 730, label: 'Cold storage' },
    { txid: txid('cold02bbccddeeff0'), vout: 0, address: ADDRESSES[33], amount: 14_250_000, block_height: 835_000, block_time: now - day * 365, label: 'Cold storage' },
  ];

  const insertUTXO = db.prepare(`
    INSERT OR IGNORE INTO utxos (wallet_id, txid, vout, address, amount, block_height, block_time)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLabel = db.prepare(`
    INSERT OR REPLACE INTO labels (wallet_id, ref, label_type, name, created_at)
    VALUES (?, ?, 'output', ?, ?)
  `);

  for (const u of utxos) {
    insertUTXO.run(walletId, u.txid, u.vout, u.address, u.amount, u.block_height, u.block_time);
    insertLabel.run(walletId, `${u.txid}:${u.vout}`, u.label, Date.now());
  }

  // ── Fee snapshot so the app works without a live API call ───────────────
  db.prepare(`
    INSERT OR IGNORE INTO fee_snapshots (fetched_at, fastest, half_hour, hour, minimum)
    VALUES (?, 12, 8, 5, 1)
  `).run(Date.now());

  return walletId;
}

// ── CLI entry point ──────────────────────────────────────────────────────────
const db = getDb();
console.log('Seeding demo wallet…');
const walletId = seedDemoWallet(db);
const count = (db.prepare('SELECT COUNT(*) as n FROM utxos WHERE wallet_id = ?').get(walletId) as any).n;
console.log(`Done. Wallet id=${walletId} — "${DEMO_WALLET_NAME}" seeded with ${count} UTXOs.`);
console.log('Open http://localhost:5173 and select the demo wallet from the sidebar.');
