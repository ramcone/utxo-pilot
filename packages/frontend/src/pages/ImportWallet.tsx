import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useWalletStore } from '../store/walletStore';

const PUB_FORMATS = [
  { prefix: 'zpub', type: 'zpub', script: 'P2WPKH (native segwit, BIP84)', recommended: true },
  { prefix: 'ypub', type: 'ypub', script: 'P2SH-P2WPKH (wrapped segwit, BIP49)', recommended: false },
  { prefix: 'xpub', type: 'xpub', script: 'P2PKH (legacy, BIP44) or Taproot BIP86', recommended: false },
];

export default function ImportWallet() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setActiveWalletId = useWalletStore((s) => s.setActiveWalletId);
  const [name, setName]           = useState('');
  const [pub, setPub]             = useState('');
  const [error, setError]         = useState('');
  const [converting, setConverting] = useState(false);
  const [convertResult, setConvertResult] = useState<{ converted: string; firstAddress: string; isTaproot?: boolean } | null>(null);

  const detectedType = PUB_FORMATS.find((f) => pub.trim().startsWith(f.prefix));
  const isXpub = pub.trim().startsWith('xpub');

  const mut = useMutation({
    mutationFn: () => api.wallets.create({
      name: name.trim(),
      pub:  pub.trim(),
      ...(convertResult?.isTaproot ? { force_script_type: 'p2tr' as const } : {}),
    }),
    onSuccess: (wallet) => {
      qc.invalidateQueries({ queryKey: ['wallets'] });
      setActiveWalletId(wallet.id);
      navigate('/data-source');
    },
    onError: (err: any) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Wallet name is required.'); return; }
    if (!pub.trim())  { setError('Extended public key is required.'); return; }
    if (!detectedType) { setError('Key must start with xpub, ypub, or zpub (mainnet only).'); return; }
    mut.mutate();
  };

  const handleConvert = async (targetType: 'zpub' | 'ypub' | 'taproot') => {
    setConverting(true);
    setConvertResult(null);
    setError('');
    try {
      const res = await fetch('/api/convert-pub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pub: pub.trim(), targetType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Conversion failed');
      setConvertResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConverting(false);
    }
  };

  const applyConversion = () => {
    if (convertResult) {
      setPub(convertResult.converted);
      setConvertResult(null);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="page-header">
        <h2>Import Watch-Only Wallet</h2>
        <p>Paste your extended public key. Your seed phrase is never needed or accepted here.</p>
      </div>

      <div className="alert alert-warn mb-6">
        <span>🛡</span>
        <span><strong>Never enter a seed phrase, private key, or WIF here.</strong> Only xpub / ypub / zpub are accepted.</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="field">
          <label className="label" htmlFor="wallet-name">Wallet name</label>
          <input
            id="wallet-name"
            className="input"
            type="text"
            placeholder="e.g. Cold Storage, Hardware Wallet"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
            autoFocus
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="xpub">Extended public key (xpub / ypub / zpub)</label>
          <textarea
            id="xpub"
            className="input"
            rows={3}
            placeholder="zpub6rFR7y4Q2Aij…"
            value={pub}
            onChange={(e) => { setPub(e.target.value); setConvertResult(null); }}
            style={{ fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
          />
          {detectedType && (
            <div className="text-sm" style={{ color: 'var(--green)' }}>
              ✓ Detected: <strong>{detectedType.type}</strong> — {detectedType.script}
              {detectedType.recommended && <span className="tag tag-orange" style={{ marginLeft: 8 }}>Recommended</span>}
            </div>
          )}
        </div>

        {/* Ledger xpub converter — shown when user pastes an xpub */}
        {isXpub && (
          <div className="card" style={{ borderColor: 'rgba(234,179,8,0.4)', background: 'rgba(234,179,8,0.05)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6 }}>
              ⚠ Ledger / hardware wallet xpub detected
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text2)', marginBottom: 12, lineHeight: 1.6 }}>
              If this xpub came from a <strong>Native SegWit</strong> account (addresses starting with <code>bc1q…</code>),
              Ledger exports it with xpub version bytes by mistake. You need to convert it to a <strong>zpub</strong>
              so UTXO Pilot derives the correct addresses.
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleConvert('zpub')}
                disabled={converting}
              >
                {converting ? <><span className="spinner" /> Converting…</> : '⇄ Convert to zpub (Native SegWit)'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleConvert('taproot')}
                disabled={converting}
              >
                ⇄ Use as Taproot — bc1p (BIP86)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleConvert('ypub')}
                disabled={converting}
              >
                ⇄ Convert to ypub (Wrapped SegWit)
              </button>
            </div>

            {/* Conversion result */}
            {convertResult && (
              <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--bg3)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: 6 }}>
                  {convertResult.isTaproot ? 'Key (xpub — used as BIP86 Taproot):' : 'Converted key:'}
                </div>
                <code style={{ fontSize: '0.75rem', wordBreak: 'break-all', color: 'var(--accent)' }}>
                  {convertResult.converted}
                </code>
                <div style={{ fontSize: '0.8rem', color: 'var(--text2)', margin: '10px 0 6px' }}>
                  First derived address (verify this matches your wallet):
                </div>
                <code style={{ fontSize: '0.78rem', wordBreak: 'break-all', color: 'var(--green)' }}>
                  {convertResult.firstAddress}
                </code>
                <div className="alert alert-info" style={{ marginTop: 10, fontSize: '0.8rem' }}>
                  <span>ℹ</span>
                  <span>
                    Check that <strong>{convertResult.firstAddress}</strong> appears in your Ledger Live
                    receive addresses. If it matches, click <strong>Use this zpub</strong> to continue.
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 10 }}
                  onClick={applyConversion}
                >
                  {convertResult.isTaproot ? '✓ Import as Taproot wallet' : '✓ Use this zpub'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="card" style={{ background: 'var(--bg)' }}>
          <div className="card-title">Supported formats</div>
          <div className="space-y-4 mt-4" style={{ fontSize: '0.82rem' }}>
            {PUB_FORMATS.map((f) => (
              <div key={f.type} className="flex gap-2 items-center">
                <code className="mono tag tag-gray">{f.prefix}…</code>
                <span className="text-muted">{f.script}</span>
                {f.recommended && <span className="tag tag-orange" style={{ fontSize: '0.7rem' }}>Best</span>}
              </div>
            ))}
          </div>
        </div>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={mut.isPending}
          style={{ justifyContent: 'center', padding: '11px' }}
        >
          {mut.isPending ? <><span className="spinner" /> Importing…</> : 'Import Wallet →'}
        </button>
      </form>
    </div>
  );
}
