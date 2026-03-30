import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useWallet } from '../context/WalletContext';
import { splitAddressForDisplay } from '../utils/address';

export default function Receive() {
  const navigate = useNavigate();
  const { wallet } = useWallet();
  const [copied, setCopied] = useState(false);

  if (!wallet) return null;

  const [prefix, middle, suffix] = splitAddressForDisplay(wallet.address);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Назад</button>
        <h2>Получить TON</h2>
      </div>

      <div className="card receive-card">
        <div className="qr-container">
          <QRCodeSVG
            value={`ton://transfer/${wallet.address}`}
            size={200}
            bgColor="#1a1a2e"
            fgColor="#ffffff"
            level="M"
          />
        </div>

        <div className="address-full">
          <span className="addr-prefix">{prefix}</span>
          <span className="addr-middle">{middle}</span>
          <span className="addr-suffix">{suffix}</span>
        </div>

        <p className="receive-hint">
          Отправьте TON на этот адрес. Используется TON testnet.
        </p>

        <button className="btn btn-primary" onClick={handleCopy}>
          {copied ? 'Скопировано!' : 'Копировать адрес'}
        </button>
      </div>
    </div>
  );
}
