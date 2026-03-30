import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { shortenAddress, isDustTransaction } from '../utils/address';
import { formatTon, timeAgo } from '../utils/format';

export default function Dashboard() {
  const navigate = useNavigate();
  const { wallet, balance, transactions, error, refresh, lock, logout } = useWallet();
  const [search, setSearch] = useState('');
  const [showLogout, setShowLogout] = useState(false);

  if (!wallet) return null;

  const filtered = transactions.filter((tx) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      tx.from.toLowerCase().includes(q) ||
      tx.to.toLowerCase().includes(q) ||
      tx.comment.toLowerCase().includes(q) ||
      tx.amount.includes(q)
    );
  });

  return (
    <div className="page dashboard">
      <div className="dashboard-header">
        <div className="header-top">
          <span className="testnet-badge-sm">TESTNET</span>
          <button className="btn-icon" onClick={() => setShowLogout(!showLogout)} title="Настройки">
            ⚙
          </button>
        </div>
        {showLogout && (
          <div className="logout-dropdown">
            <button className="btn btn-secondary" onClick={lock}>
              Заблокировать
            </button>
            <button className="btn btn-danger" onClick={logout}>
              Выйти из кошелька
            </button>
          </div>
        )}

        <div className="balance-section">
          <div className="balance-amount">{formatTon(balance)} TON</div>
          <div
            className="balance-address"
            onClick={() => navigator.clipboard.writeText(wallet.address)}
            title="Нажмите, чтобы скопировать"
          >
            {shortenAddress(wallet.address)}
          </div>
        </div>

        <div className="action-buttons">
          <button className="btn btn-action" onClick={() => navigate('/receive')}>
            Получить
          </button>
          <button className="btn btn-action" onClick={() => navigate('/send')}>
            Отправить
          </button>
          <button className="btn btn-action" onClick={refresh}>
            Обновить
          </button>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="transactions-section">
        <h3>Транзакции</h3>
        <input
          type="text"
          className="search-input"
          placeholder="Поиск по адресу, комментарию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filtered.length === 0 ? (
          <div className="empty-state">
            {transactions.length === 0
              ? 'Транзакций пока нет'
              : 'Ничего не найдено'}
          </div>
        ) : (
          <div className="tx-list">
            {filtered.map((tx) => {
              const dust = isDustTransaction(tx);
              return (
                <div
                  key={`${tx.hash}-${tx.lt}`}
                  className={`tx-item ${tx.isIncoming ? 'tx-in' : 'tx-out'} ${dust ? 'tx-dust' : ''}`}
                >
                  {dust && (
                    <div className="dust-warning">
                      Микротранзакция — возможная попытка отравления истории адресов (address poisoning)
                    </div>
                  )}
                  <div className="tx-row">
                    <span className={`tx-direction ${tx.isIncoming ? 'incoming' : 'outgoing'}`}>
                      {tx.isIncoming ? '← Входящая' : '→ Исходящая'}
                    </span>
                    <span className={`tx-amount ${tx.isIncoming ? 'amount-in' : 'amount-out'}`}>
                      {tx.isIncoming ? '+' : '-'}{formatTon(tx.amount)} TON
                    </span>
                  </div>
                  <div className="tx-row">
                    <span className="tx-addr">
                      {tx.isIncoming ? `От: ${shortenAddress(tx.from)}` : `Кому: ${shortenAddress(tx.to)}`}
                    </span>
                    <span className="tx-time">{timeAgo(tx.time)}</span>
                  </div>
                  {tx.comment && (
                    <div className="tx-comment">{tx.comment}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
