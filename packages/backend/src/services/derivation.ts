/**
 * Address derivation for watch-only wallets.
 * Supports xpub (P2PKH), ypub (P2SH-P2WPKH), zpub (P2WPKH/native segwit).
 * Never handles private keys or seed phrases.
 */

import * as bitcoin from 'bitcoinjs-lib';
import * as bip32 from 'bip32';
import bs58check from 'bs58check';
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

const XPUB_VERSION = Buffer.from('0488b21e', 'hex');

export interface ParsedPub {
  pubType: PubKeyType;
  scriptType: ScriptType;
  derivationPath: string;
  /** xpub-encoded key (version bytes normalised so bip32 can parse it) */
  xpubNormalized: string;
}

/** Decode and validate an xpub/ypub/zpub, returning normalised metadata. */
export function parsePub(raw: string): ParsedPub {
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

  return {
    pubType: meta.pubType,
    scriptType: meta.scriptType,
    derivationPath: meta.derivationPath,
    xpubNormalized,
  };
}

/** Derive a Bitcoin address at the given index / chain for a watch-only wallet. */
export function deriveAddress(
  xpubNormalized: string,
  isChange: boolean,
  index: number,
  scriptType: ScriptType
): string {
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
