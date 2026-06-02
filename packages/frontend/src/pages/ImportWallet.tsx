import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useWalletStore } from '../store/walletStore';

const PUB_FORMATS = [
  { prefix: 'zpub', type: 'zpub', script: 'P2WPKH (native segwit, BIP84)', recommended: true },
  { prefix: 'ypub', type: 'ypub', script: 'P2SH-P2WPKH (wrapped segwit, BIP49)', recommended: false },
  { prefix: 'xpub', type: 'xpub', script: 'P2PKH (legacy, BIP44)', recommended: false },
];

export default function ImportWallet() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setActiveWalletId = useWalletStore((s) => s.setActiveWalletId);
  const [name, setName] = useState('');
  const [pub, setPub] = useState('');
  const [error, setError] = useState('');

  const detectedType = PUB_FORMATS.find((f) => pub.trim().startsWith(f.prefix));

  const mut = useMutation({
    mutationFn: () => api.wallets.create({ name: name.trim(), pub: pub.trim() }),
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
            onChange={(e) => setPub(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
          />
          {detectedType && (
            <div className="text-sm" style={{ color: 'var(--green)' }}>
              ✓ Detected: <strong>{detectedType.type}</strong> — {detectedType.script}
              {detectedType.recommended && <span className="tag tag-orange" style={{ marginLeft: 8 }}>Recommended</span>}
            </div>
          )}
        </div>

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
