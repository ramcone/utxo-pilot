declare module 'tiny-secp256k1' {
  export function isPoint(p: Uint8Array): boolean;
  export function isPrivate(d: Uint8Array): boolean;
  export function pointAdd(pA: Uint8Array, pB: Uint8Array, compressed?: boolean): Uint8Array | null;
  export function pointAddScalar(p: Uint8Array, tweak: Uint8Array, compressed?: boolean): Uint8Array | null;
  export function pointCompress(p: Uint8Array, compressed?: boolean): Uint8Array;
  export function pointFromScalar(d: Uint8Array, compressed?: boolean): Uint8Array | null;
  export function pointMultiply(p: Uint8Array, tweak: Uint8Array, compressed?: boolean): Uint8Array | null;
  export function privateAdd(d: Uint8Array, tweak: Uint8Array): Uint8Array | null;
  export function sign(hash: Uint8Array, privateKey: Uint8Array, entropy?: Uint8Array): Uint8Array;
  export function verify(hash: Uint8Array, pubkey: Uint8Array, signature: Uint8Array, strict?: boolean): boolean;
}
