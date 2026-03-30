import { useNavigate } from 'react-router-dom';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="page welcome">
      <div className="welcome-content">
        <div className="logo">TON</div>
        <h1>TON Wallet</h1>
        <p className="subtitle">Self-custodial кошелёк для TON testnet</p>

        <div className="welcome-actions">
          <button className="btn btn-primary" onClick={() => navigate('/create')}>
            Создать кошелёк
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/import')}>
            Импортировать кошелёк
          </button>
        </div>

        <p className="testnet-badge">TESTNET</p>
      </div>
    </div>
  );
}
