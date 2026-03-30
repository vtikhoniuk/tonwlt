import { Routes, Route, Navigate } from 'react-router-dom';
import { useWallet } from './context/WalletContext';
import Welcome from './pages/Welcome';
import CreateWallet from './pages/CreateWallet';
import ImportWallet from './pages/ImportWallet';
import UnlockWallet from './pages/UnlockWallet';
import Dashboard from './pages/Dashboard';
import Receive from './pages/Receive';
import Send from './pages/Send';

export default function App() {
  const { wallet, locked, loading } = useWallet();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (locked) {
    return (
      <div className="app">
        <UnlockWallet />
      </div>
    );
  }

  return (
    <div className="app">
      <Routes>
        {!wallet ? (
          <>
            <Route path="/" element={<Welcome />} />
            <Route path="/create" element={<CreateWallet />} />
            <Route path="/import" element={<ImportWallet />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/receive" element={<Receive />} />
            <Route path="/send" element={<Send />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </div>
  );
}
