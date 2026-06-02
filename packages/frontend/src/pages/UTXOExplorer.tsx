import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWalletStore } from '../store/walletStore';
import { api } from '../api/client';
import UTXOTable from '../components/UTXOTable';

export default function UTXOExplorer() {
  const { activeWalletId } = useWalletStore();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const importMut = useMutation({
    mutationFn: (jsonl: string) => api.labels.import(activeWalletId!, jsonl),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['utxos', activeWalletId] });
      alert(`Imported ${res.imported} labels.${res.errors.length ? `\n\nSkipped:\n${res.errors.join('\n')}` : ''}`);
    },
  });

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => importMut.mutate(ev.target?.result as string);
    reader.readAsText(file);
  };

  if (!activeWalletId) return null;

  return (
    <div className="page-wide">
      <div className="page-header flex justify-between items-center" style={{ display: 'flex' }}>
        <div>
          <h2>⊞ UTXO Explorer</h2>
          <p>Browse, filter, and label your unspent outputs.</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => fileRef.current?.click()}
            title="Import BIP329 JSONL label file"
          >
            ↑ Import BIP329 Labels
          </button>
          <input ref={fileRef} type="file" accept=".jsonl,.txt" style={{ display: 'none' }} onChange={handleFileImport} />
        </div>
      </div>

      <UTXOTable walletId={activeWalletId} />

      <div className="alert alert-info mt-6">
        <span>ℹ</span>
        <div>
          Labels are stored locally and never sent anywhere. You can import labels from a{' '}
          <a href="https://github.com/bitcoin/bips/blob/master/bip-0329.mediawiki" target="_blank" rel="noreferrer">
            BIP329 JSONL
          </a>{' '}
          file exported from Sparrow, Specter, or other compatible wallets.
        </div>
      </div>
    </div>
  );
}
