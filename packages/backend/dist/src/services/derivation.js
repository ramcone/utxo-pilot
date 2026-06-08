"use strict";
/**
 * Address derivation for watch-only wallets.
 * Supports xpub (P2PKH), ypub (P2SH-P2WPKH), zpub (P2WPKH/native segwit).
 * Never handles private keys or seed phrases.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePub = parsePub;
exports.convertPubVersion = convertPubVersion;
exports.deriveAddress = deriveAddress;
exports.deriveAddressBatch = deriveAddressBatch;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const bip32 = __importStar(require("bip32"));
const bs58check_1 = __importDefault(require("bs58check"));
const bech32_1 = require("bech32");
const crypto_1 = require("crypto");
const ecc = __importStar(require("tiny-secp256k1"));
// Version bytes for extended public keys (mainnet)
const VERSION_BYTES = {
    // xpub: BIP44 P2PKH  m/44'/0'/0'
    '0488b21e': { xpubVersion: Buffer.from('0488b21e', 'hex'), scriptType: 'p2pkh', pubType: 'xpub', derivationPath: "m/44'/0'/0'" },
    // ypub: BIP49 P2SH-P2WPKH  m/49'/0'/0'
    '049d7cb2': { xpubVersion: Buffer.from('049d7cb2', 'hex'), scriptType: 'p2sh-p2wpkh', pubType: 'ypub', derivationPath: "m/49'/0'/0'" },
    // zpub: BIP84 native segwit P2WPKH  m/84'/0'/0'
    '04b24746': { xpubVersion: Buffer.from('04b24746', 'hex'), scriptType: 'p2wpkh', pubType: 'zpub', derivationPath: "m/84'/0'/0'" },
};
// ── Taproot (BIP86 / P2TR) helpers ───────────────────────────────────────────
/** BIP340 tagged hash: SHA256(SHA256(tag) || SHA256(tag) || data) */
function taggedHash(tag, data) {
    const tagHash = (0, crypto_1.createHash)('sha256').update(tag, 'utf8').digest();
    return (0, crypto_1.createHash)('sha256')
        .update(tagHash).update(tagHash).update(data)
        .digest();
}
/** Flip the parity prefix of a compressed public key (02 ↔ 03). */
function pointNegate(pubkey) {
    const out = Buffer.from(pubkey);
    out[0] = pubkey[0] === 2 ? 3 : 2;
    return out;
}
/**
 * Derive a BIP86 P2TR (Taproot) address from a normalised xpub.
 * Implements the key-path-only taptweak from BIP341.
 */
function deriveP2TRAddress(xpubNormalized, isChange, index) {
    const chain = isChange ? 1 : 0;
    const node = bip32.fromBase58(xpubNormalized, bitcoin.networks.bitcoin);
    const child = node.derive(chain).derive(index);
    const pubkey = child.publicKey; // 33-byte compressed
    // BIP340: internal key must have even y. If odd (03), negate it.
    const internalKey = pubkey[0] === 3 ? pointNegate(pubkey) : pubkey;
    const xOnly = internalKey.slice(1); // 32-byte x-only pubkey
    // BIP341 key-path taptweak: t = tagged_hash("TapTweak", x_only)
    const tweak = taggedHash('TapTweak', xOnly);
    // Q = P + t·G  (point add scalar)
    const tweakedPoint = Buffer.from(ecc.pointAddScalar(internalKey, tweak, true));
    const tweakedXOnly = tweakedPoint.slice(1); // x-only tweaked key
    // bech32m encode with witness version 1 ("bc1p…")
    const words = bech32_1.bech32m.toWords(tweakedXOnly);
    return bech32_1.bech32m.encode('bc', [1, ...words]);
}
const XPUB_VERSION = Buffer.from('0488b21e', 'hex');
/**
 * Decode and validate an xpub/ypub/zpub, returning normalised metadata.
 * Pass forceScriptType = 'p2tr' when the key is known to be a BIP86 Taproot
 * account (e.g. Ledger exports xpub version bytes for Taproot accounts).
 */
function parsePub(raw, forceScriptType) {
    let decoded;
    try {
        decoded = Buffer.from(bs58check_1.default.decode(raw));
    }
    catch {
        throw new Error('Invalid extended public key: base58check decode failed');
    }
    if (decoded.length !== 78) {
        throw new Error('Invalid extended public key: unexpected byte length');
    }
    const versionHex = decoded.slice(0, 4).toString('hex');
    const meta = VERSION_BYTES[versionHex];
    if (!meta) {
        throw new Error(`Unrecognised extended public key version 0x${versionHex}. ` +
            'Only xpub, ypub, and zpub (mainnet) are supported.');
    }
    // Rewrite version bytes to standard xpub so bip32 can parse it
    const rewritten = Buffer.concat([XPUB_VERSION, decoded.slice(4)]);
    const xpubNormalized = bs58check_1.default.encode(rewritten);
    if (forceScriptType === 'p2tr') {
        return {
            pubType: meta.pubType,
            scriptType: 'p2tr',
            derivationPath: "m/86'/0'/0'",
            xpubNormalized,
        };
    }
    return {
        pubType: meta.pubType,
        scriptType: meta.scriptType,
        derivationPath: meta.derivationPath,
        xpubNormalized,
    };
}
const ZPUB_VERSION = Buffer.from('04b24746', 'hex');
const YPUB_VERSION = Buffer.from('049d7cb2', 'hex');
/**
 * Convert an xpub to zpub or ypub by rewriting the version bytes.
 * Used when Ledger exports xpub version bytes for a native segwit account.
 */
function convertPubVersion(raw, targetType) {
    let decoded;
    try {
        decoded = Buffer.from(bs58check_1.default.decode(raw));
    }
    catch {
        throw new Error('Invalid extended public key: base58check decode failed');
    }
    if (decoded.length !== 78) {
        throw new Error('Invalid extended public key: unexpected byte length');
    }
    const targetVersion = targetType === 'zpub' ? ZPUB_VERSION : YPUB_VERSION;
    const rewritten = Buffer.concat([targetVersion, decoded.slice(4)]);
    return bs58check_1.default.encode(rewritten);
}
/** Derive a Bitcoin address at the given index / chain for a watch-only wallet. */
function deriveAddress(xpubNormalized, isChange, index, scriptType) {
    // P2TR uses its own derivation path that handles the taptweak
    if (scriptType === 'p2tr') {
        return deriveP2TRAddress(xpubNormalized, isChange, index);
    }
    const chain = isChange ? 1 : 0;
    const node = bip32.fromBase58(xpubNormalized, bitcoin.networks.bitcoin);
    const child = node.derive(chain).derive(index);
    const pubkey = child.publicKey;
    switch (scriptType) {
        case 'p2wpkh': {
            const payment = bitcoin.payments.p2wpkh({ pubkey, network: bitcoin.networks.bitcoin });
            return payment.address;
        }
        case 'p2sh-p2wpkh': {
            const inner = bitcoin.payments.p2wpkh({ pubkey, network: bitcoin.networks.bitcoin });
            const payment = bitcoin.payments.p2sh({ redeem: inner, network: bitcoin.networks.bitcoin });
            return payment.address;
        }
        case 'p2pkh': {
            const payment = bitcoin.payments.p2pkh({ pubkey, network: bitcoin.networks.bitcoin });
            return payment.address;
        }
        default:
            throw new Error(`Unsupported script type: ${scriptType}`);
    }
}
/** Derive a batch of addresses (external + change) up to maxIndex per chain. */
function deriveAddressBatch(xpubNormalized, scriptType, startIndex, count) {
    const results = [];
    for (let i = startIndex; i < startIndex + count; i++) {
        results.push({ address: deriveAddress(xpubNormalized, false, i, scriptType), isChange: false, index: i });
        results.push({ address: deriveAddress(xpubNormalized, true, i, scriptType), isChange: true, index: i });
    }
    return results;
}
//# sourceMappingURL=derivation.js.map