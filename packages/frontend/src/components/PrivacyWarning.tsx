import { useState } from 'react';

export default function PrivacyWarning() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="alert alert-warn" style={{ margin: '0', borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
      <span>⚠</span>
      <div style={{ flex: 1 }}>
        <strong>Public data source active.</strong> Your wallet addresses are being sent to a third-party
        Esplora server. For better privacy, consider running your own Esplora instance and switching to it
        in <a href="/data-source">Data Source settings</a>.
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7, padding: '0 4px' }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
