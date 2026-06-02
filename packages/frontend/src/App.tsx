import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useWalletStore } from './store/walletStore';
import Layout from './components/Layout';
import Welcome from './pages/Welcome';
import ImportWallet from './pages/ImportWallet';
import DataSource from './pages/DataSource';
import Dashboard from './pages/Dashboard';
import UTXOExplorer from './pages/UTXOExplorer';
import SpendPlanner from './pages/SpendPlanner';
import ConsolidationPlanner from './pages/ConsolidationPlanner';
import PlanReview from './pages/PlanReview';
import Settings from './pages/Settings';
import Setup from './pages/Setup';
import WhyUTXOPilot from './pages/WhyUTXOPilot';
import Feedback from './pages/Feedback';

export default function App() {
  const activeWalletId = useWalletStore((s) => s.activeWalletId);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={activeWalletId ? <Navigate to="/dashboard" replace /> : <Welcome />} />
          <Route path="import"        element={<ImportWallet />} />
          <Route path="data-source"   element={<DataSource />} />
          <Route path="dashboard"     element={activeWalletId ? <Dashboard />   : <Navigate to="/" replace />} />
          <Route path="utxos"         element={activeWalletId ? <UTXOExplorer /> : <Navigate to="/" replace />} />
          <Route path="spend"         element={activeWalletId ? <SpendPlanner /> : <Navigate to="/" replace />} />
          <Route path="consolidation" element={activeWalletId ? <ConsolidationPlanner /> : <Navigate to="/" replace />} />
          <Route path="plan/:planId"  element={<PlanReview />} />
          <Route path="settings"      element={<Settings />} />
          <Route path="setup"         element={<Setup />} />
          <Route path="why"           element={<WhyUTXOPilot />} />
          <Route path="feedback"      element={<Feedback />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
