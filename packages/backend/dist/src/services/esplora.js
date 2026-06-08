"use strict";
/**
 * Esplora HTTP client.
 * All addresses passed to this file are treated as opaque strings for privacy —
 * they are not logged by this module.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EsploraClient = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
class EsploraClient {
    constructor(baseUrl, timeoutMs = 15000) {
        // Normalise trailing slash
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.timeoutMs = timeoutMs;
    }
    async get(path) {
        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const res = await (0, node_fetch_1.default)(url, { signal: controller.signal });
            if (!res.ok)
                throw new Error(`Esplora ${res.status} for ${path}`);
            return (await res.json());
        }
        finally {
            clearTimeout(timer);
        }
    }
    /** Get all UTXOs for an address (confirmed + unconfirmed). */
    async getAddressUTXOs(address) {
        return this.get(`/address/${address}/utxo`);
    }
    /**
     * Get confirmed transactions for an address.
     * Esplora returns max 25; paginate using last_seen_txid.
     */
    async getAddressTransactions(address, lastSeenTxid) {
        const path = lastSeenTxid
            ? `/address/${address}/txs/chain/${lastSeenTxid}`
            : `/address/${address}/txs`;
        return this.get(path);
    }
    /** Get all transactions for an address, handling Esplora's 25-tx pagination. */
    async getAllTransactions(address) {
        const all = [];
        let lastTxid;
        for (;;) {
            const page = await this.getAddressTransactions(address, lastTxid);
            if (page.length === 0)
                break;
            all.push(...page);
            if (page.length < 25)
                break;
            lastTxid = page[page.length - 1].txid;
        }
        return all;
    }
    /** Fetch recommended fee rates (sat/vB). */
    async getFeeEstimates() {
        // Esplora returns { "1": rate, "3": rate, "6": rate, ... }
        const raw = await this.get('/fee-estimates');
        // Map Esplora's confirmation-target keys to our labels
        const at = (targets) => {
            for (const t of targets) {
                if (raw[String(t)] !== undefined)
                    return Math.ceil(raw[String(t)]);
            }
            return 1;
        };
        return {
            fastest: at([1, 2]),
            half_hour: at([3, 4, 5, 6]),
            hour: at([6, 7, 8, 10, 12]),
            minimum: at([144, 504, 1008, 2016]),
        };
    }
    /** Probe the endpoint to confirm it is reachable and returning valid data. */
    async healthCheck() {
        try {
            await this.getFeeEstimates();
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.EsploraClient = EsploraClient;
//# sourceMappingURL=esplora.js.map