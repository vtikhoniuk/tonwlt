import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortenAddress } from '../utils/address';

export default function UnlockWallet() {
  const { lockedAddress, unlock, logout } = useWallet();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    if (!password) {
      setError('Введите пароль');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await unlock(password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка разблокировки');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleUnlock();
  };

  return (
    <div className="page welcome">
      <div className="welcome-content">
        <div className="logo">TON</div>
        <h1>Разблокировка</h1>
        {lockedAddress && (
          <p className="subtitle">{shortenAddress(lockedAddress)}</p>
        )}

        <div className="card">
          {error && <div className="error-msg">{error}</div>}
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Введите пароль"
              disabled={loading}
              autoFocus
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleUnlock}
            disabled={loading}
          >
            {loading ? 'Разблокировка...' : 'Разблокировать'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={logout}
            style={{ marginTop: '12px' }}
          >
            Забыл пароль — сбросить кошелёк
          </button>
        </div>

        <p className="testnet-badge">TESTNET</p>
      </div>
    </div>
  );
}
