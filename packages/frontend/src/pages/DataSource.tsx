import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

const PRESETS = [
  { label: 'Blockstream (public)', url: 'https://blockstream.info/api', isPublic: true },
  { label: 'mempool.space (public)', url: 'https://mempool.space/api', isPublic: true },
  { label: 'Custom / self-hosted', url: '', isPublic: false },
];

export default function DataSource() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: api.settings.get });

  const [url, setUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [testResult, setTestResult] = useState<{ ok: boolean; url: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (settings) {
      setUrl(settings.esplora_url ?? '');
      setIsPublic(settings.esplora_is_public === 'true');
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: () =>
      api.settings.update({ esplora_url: url, esplora_is_public: isPublic }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  const handlePreset = (preset: typeof PRESETS[0]) => {
    if (preset.url) setUrl(preset.url);
    setIsPublic(preset.isPublic);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.settings.testEsplora(url);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ ok: false, url });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h2>⚡ Data Source</h2>
        <p>Choose where UTXO Pilot fetches blockchain data from.</p>
      </div>

      {isPublic && (
        <div className="alert alert-warn mb-6">
          <span>⚠</span>
          <div>
            <strong>Privacy notice:</strong> When using a public Esplora endpoint, your Bitcoin addresses
            are sent to a third-party server. The operator may log them. For maximum privacy, run your own
            Esplora or Electrum server.
          </div>
        </div>
      )}

      <div className="card mb-4">
        <div className="card-title mb-4">Quick presets</div>
        <div className="space-y-4">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              className={`btn w-full ${url === p.url && p.url ? 'btn-primary' : 'btn-secondary'}`}
              style={{ justifyContent: 'flex-start' }}
              onClick={() => handlePreset(p)}
            >
              {p.isPublic ? '🌐' : '🏠'} {p.label}
              {p.isPublic && <span className="tag tag-gray" style={{ marginLeft: 'auto' }}>Public</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="card space-y-4">
        <div className="field">
          <label className="label">Esplora endpoint URL</label>
          <input
            className="input mono"
            type="url"
            placeholder="https://blockstream.info/api"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <span className="text-sm text-muted">The base URL — no trailing slash.</span>
        </div>

        <div className="field">
          <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Mark as public (show privacy warning)
          </label>
        </div>

        {testResult && (
          <div className={`alert ${testResult.ok ? 'alert-success' : 'alert-error'}`}>
            {testResult.ok ? '✓ Connection successful' : '✕ Could not reach the endpoint — check the URL'}
          </div>
        )}

        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={handleTest} disabled={testing || !url}>
            {testing ? <><span className="spinner" /> Testing…</> : 'Test connection'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !url}
          >
            {saveMut.isPending ? 'Saving…' : 'Save settings'}
          </button>
        </div>
        {saveMut.isSuccess && <div className="alert alert-success">✓ Settings saved.</div>}
      </div>
    </div>
  );
}
