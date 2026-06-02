import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useWalletStore } from '../store/walletStore';
import { api } from '../api/client';
import PrivacyWarning from './PrivacyWarning';

const NAV = [
  { to: '/dashboard',     label: '🏠  Dashboard' },
  { to: '/utxos',         label: '🔬  UTXO Explorer' },
  { to: '/spend',         label: '🚀  Spend Planner' },
  { to: '/consolidation', label: '🧹  Consolidation' },
];

const NAV_BOTTOM = [
  { to: '/setup',         label: '⚡  Getting Started' },
  { to: '/import',        label: '➕  Import Wallet' },
  { to: '/data-source',   label: '🔌  Data Source' },
  { to: '/settings',      label: '⚙️  Settings' },
  { to: '/feedback',      label: '🐛  Feedback & Bugs' },
  { to: '/why',           label: '🤔  Why UTXO Pilot' },
];

export default function Layout() {
  const { activeWalletId, setActiveWalletId } = useWalletStore();
  const navigate = useNavigate();

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets'],
    queryFn: api.wallets.list,
    refetchInterval: false,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.get,
  });

  const isPublic = settings?.esplora_is_public === 'true';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>₿ UTXO Pilot</h1>
          <p>Watch-only planner</p>
        </div>

        {/* Wallet picker */}
        {wallets.length > 0 && (
          <div style={{ padding: '10px 10px 4px' }}>
            <select
              className="select"
              value={activeWalletId ?? ''}
              onChange={(e) => {
                const id = parseInt(e.target.value, 10);
                setActiveWalletId(isNaN(id) ? null : id);
                navigate('/dashboard');
              }}
              style={{ fontSize: '0.8rem' }}
            >
              <option value="">Select wallet…</option>
              {wallets.map((w: any) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        )}

        <nav className="sidebar-nav">
          {activeWalletId && (
            <>
              <div className="nav-section">Wallet</div>
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </>
          )}

          <div className="nav-section" style={{ marginTop: 12 }}>App</div>
          {NAV_BOTTOM.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          v0.1.0 · No keys · No cloud
        </div>
      </aside>

      <main className="main">
        {isPublic && <PrivacyWarning />}
        <Outlet />
      </main>
    </div>
  );
}
