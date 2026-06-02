/**
 * Address derivation for watch-only wallets.
 * Supports xpub (P2PKH), ypub (P2SH-P2WPKH), zpub (P2WPKH/native segwit).
 * Never handles private keys or seed phrases.
 */

import * as bitcoin from 'bitcoinjs-lib';
import * as bip32 from 'bip32';
import bs58check from 'bs58check';
import { bech32m } from 'bech32';
import { createHash } from 'crypto';
import * as ecc from 'tiny-secp256k1';
import { ScriptType, PubKeyType } from '../types.js';

// Version bytes for extended public keys (mainnet)
const VERSION_BYTES: Record<string, { xpubVersion: Buffer; scriptType: ScriptType; pubType: PubKeyType; derivationPath: string }> = {
  // xpub: BIP44 P2PKH  m/44'/0'/0'
  '0488b21e': { xpubVersion: Buffer.from('0488b21e', 'hex'), scriptType: 'p2pkh',       pubType: 'xpub', derivationPath: "m/44'/0'/0'" },
  // ypub: BIP49 P2SH-P2WPKH  m/49'/0'/0'
  '049d7cb2': { xpubVersion: Buffer.from('049d7cb2', 'hex'), scriptType: 'p2sh-p2wpkh', pubType: 'ypub', derivationPath: "m/49'/0'/0'" },
  // zpub: BIP84 native segwit P2WPKH  m/84'/0'/0'
  '04b24746': { xpubVersion: Buffer.from('04b24746', 'hex'), scriptType: 'p2wpkh',      pubType: 'zpub', derivationPath: "m/84'/0'/0'" },
};

// ── Taproot (BIP86 / P2TR) helpers ───────────────────────────────────────────

/** BIP340 tagged hash: SHA256(SHA256(tag) || SHA256(tag) || data) */
function taggedHash(tag: string, data: Buffer): Buffer {
  const tagHash = createHash('sha256').update(tag, 'utf8').digest();
  return createHash('sha256')
    .update(tagHash).update(tagHash).update(data)
    .digest();
}

/** Flip the parity prefix of a compressed public key (02 ↔ 03). */
function pointNegate(pubkey: Buffer): Buffer {
  const out = Buffer.from(pubkey);
  out[0] = pubkey[0] === 2 ? 3 : 2;
  return out;
}

/**
 * Derive a BIP86 P2TR (Taproot) address from a normalised xpub.
 * Implements the key-path-only taptweak from BIP341.
 */
function deriveP2TRAddress(xpubNormalized: string, isChange: boolean, index: number): string {
  const chain = isChange ? 1 : 0;
  const node  = bip32.fromBase58(xpubNormalized, bitcoin.networks.bitcoin);
  const child = node.derive(chain).derive(index);
  const pubkey = child.publicKey; // 33-byte compressed

  // BIP340: internal key must have even y. If odd (03), negate it.
  const internalKey = pubkey[0] === 3 ? pointNegate(pubkey) : pubkey;
  const xOnly = internalKey.slice(1); // 32-byte x-only pubkey

  // BIP341 key-path taptweak: t = tagged_hash("TapTweak", x_only)
  const tweak = taggedHash('TapTweak', xOnly);

  // Q = P + t·G  (point add scalar)
  const tweakedPoint = Buffer.from(ecc.pointAddScalar(internalKey, tweak, true)!);
  const tweakedXOnly = tweakedPoint.slice(1); // x-only tweaked key

  // bech32m encode with witness version 1 ("bc1p…")
  const words = bech32m.toWords(tweakedXOnly);
  return bech32m.encode('bc', [1, ...words]);
}

const XPUB_VERSION = Buffer.from('0488b21e', 'hex');

export interface ParsedPub {
  pubType: PubKeyType;
  scriptType: ScriptType;
  derivationPath: string;
  /** xpub-encoded key (version bytes normalised so bip32 can parse it) */
  xpubNormalized: string;
}

/**
 * Decode and validate an xpub/ypub/zpub, returning normalised metadata.
 * Pass forceScriptType = 'p2tr' when the key is known to be a BIP86 Taproot
 * account (e.g. Ledger exports xpub version bytes for Taproot accounts).
 */
export function parsePub(raw: string, forceScriptType?: 'p2tr'): ParsedPub {
  let decoded: Buffer;
  try {
    decoded = Buffer.from(bs58check.decode(raw));
  } catch {
    throw new Error('Invalid extended public key: base58check decode failed');
  }

  if (decoded.length !== 78) {
    throw new Error('Invalid extended public key: unexpected byte length');
  }

  const versionHex = decoded.slice(0, 4).toString('hex');
  const meta = VERSION_BYTES[versionHex];
  if (!meta) {
    throw new Error(
      `Unrecognised extended public key version 0x${versionHex}. ` +
        'Only xpub, ypub, and zpub (mainnet) are supported.'
    );
  }

  // Rewrite version bytes to standard xpub so bip32 can parse it
  const rewritten = Buffer.concat([XPUB_VERSION, decoded.slice(4)]);
  const xpubNormalized = bs58check.encode(rewritten);

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
export function convertPubVersion(raw: string, targetType: 'zpub' | 'ypub'): string {
  let decoded: Buffer;
  try {
    decoded = Buffer.from(bs58check.decode(raw));
  } catch {
    throw new Error('Invalid extended public key: base58check decode failed');
  }
  if (decoded.length !== 78) {
    throw new Error('Invalid extended public key: unexpected byte length');
  }
  const targetVersion = targetType === 'zpub' ? ZPUB_VERSION : YPUB_VERSION;
  const rewritten = Buffer.concat([targetVersion, decoded.slice(4)]);
  return bs58check.encode(rewritten);
}

/** Derive a Bitcoin address at the given index / chain for a watch-only wallet. */
export function deriveAddress(
  xpubNormalized: string,
  isChange: boolean,
  index: number,
  scriptType: ScriptType
): string {
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
      return payment.address!;
    }
    case 'p2sh-p2wpkh': {
      const inner = bitcoin.payments.p2wpkh({ pubkey, network: bitcoin.networks.bitcoin });
      const payment = bitcoin.payments.p2sh({ redeem: inner, network: bitcoin.networks.bitcoin });
      return payment.address!;
    }
    case 'p2pkh': {
      const payment = bitcoin.payments.p2pkh({ pubkey, network: bitcoin.networks.bitcoin });
      return payment.address!;
    }
    default:
      throw new Error(`Unsupported script type: ${scriptType}`);
  }
}

/** Derive a batch of addresses (external + change) up to maxIndex per chain. */
export function deriveAddressBatch(
  xpubNormalized: string,
  scriptType: ScriptType,
  startIndex: number,
  count: number
): Array<{ address: string; isChange: boolean; index: number }> {
  const results: Array<{ address: string; isChange: boolean; index: number }> = [];
  for (let i = startIndex; i < startIndex + count; i++) {
    results.push({ address: deriveAddress(xpubNormalized, false, i, scriptType), isChange: false, index: i });
    results.push({ address: deriveAddress(xpubNormalized, true,  i, scriptType), isChange: true,  index: i });
  }
  return results;
}
