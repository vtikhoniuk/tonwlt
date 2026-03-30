import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { validatePassword } from '../services/crypto';

type Step = 'generating' | 'show_mnemonic' | 'confirm' | 'set_password' | 'done';

export default function CreateWallet() {
  const navigate = useNavigate();
  const { create, activateWallet } = useWallet();
  const [step, setStep] = useState<Step>('generating');
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [confirmWords, setConfirmWords] = useState<Record<number, string>>({});
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [verifyIndices] = useState(() => {
    const indices: number[] = [];
    while (indices.length < 3) {
      const idx = Math.floor(Math.random() * 24);
      if (!indices.includes(idx)) indices.push(idx);
    }
    return indices.sort((a, b) => a - b);
  });

  const handleGenerate = async () => {
    try {
      const info = await create();
      setMnemonic(info.mnemonic);
      setAddress(info.address);
      setStep('show_mnemonic');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка создания кошелька');
    }
  };

  const handleConfirm = () => {
    for (const idx of verifyIndices) {
      if (confirmWords[idx]?.trim().toLowerCase() !== mnemonic[idx].toLowerCase()) {
        setError(`Слово #${idx + 1} неверное. Попробуйте ещё раз.`);
        return;
      }
    }
    setError('');
    setStep('set_password');
  };

  const handleSetPassword = async () => {
    const passwordError = validatePassword(password, passwordConfirm);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setError('');
    try {
      await activateWallet(mnemonic, address, password);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка шифрования');
    }
  };

  if (step === 'generating') {
    return (
      <div className="page">
        <div className="page-header">
          <button className="btn-back" onClick={() => navigate('/')}>← Назад</button>
          <h2>Создание кошелька</h2>
        </div>
        <div className="card">
          <p>Будет сгенерирована мнемоническая фраза из 24 слов. Это единственный способ восстановить ваш кошелёк.</p>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn btn-primary" onClick={handleGenerate}>
            Сгенерировать
          </button>
        </div>
      </div>
    );
  }

  if (step === 'show_mnemonic') {
    return (
      <div className="page">
        <div className="page-header">
          <button className="btn-back" onClick={() => navigate('/')}>← Назад</button>
          <h2>Сохраните фразу</h2>
        </div>
        <div className="card">
          <div className="warning-box">
            Запишите эти 24 слова в надёжное место. Никому не показывайте! Это единственный способ восстановить доступ к кошельку.
          </div>
          <div className="mnemonic-grid">
            {mnemonic.map((word, i) => (
              <div key={i} className="mnemonic-word">
                <span className="word-num">{i + 1}.</span> {word}
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => { setError(''); setStep('confirm'); }}>
            Я сохранил фразу
          </button>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="page">
        <div className="page-header">
          <button className="btn-back" onClick={() => setStep('show_mnemonic')}>← Назад</button>
          <h2>Проверка</h2>
        </div>
        <div className="card">
          <p>Введите следующие слова из вашей фразы для подтверждения:</p>
          {error && <div className="error-msg">{error}</div>}
          {verifyIndices.map((idx) => (
            <div key={idx} className="confirm-input">
              <label>Слово #{idx + 1}</label>
              <input
                type="text"
                value={confirmWords[idx] || ''}
                onChange={(e) =>
                  setConfirmWords((prev) => ({ ...prev, [idx]: e.target.value }))
                }
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                placeholder={`Введите слово #${idx + 1}`}
              />
            </div>
          ))}
          <button className="btn btn-primary" onClick={handleConfirm}>
            Подтвердить
          </button>
        </div>
      </div>
    );
  }

  if (step === 'set_password') {
    return (
      <div className="page">
        <div className="page-header">
          <button className="btn-back" onClick={() => setStep('confirm')}>← Назад</button>
          <h2>Установите пароль</h2>
        </div>
        <div className="card">
          <p>Пароль используется для шифрования мнемонической фразы в браузере.</p>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
              placeholder="Минимум 8 символов"
            />
          </div>
          <div className="form-group">
            <label>Подтвердите пароль</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
              placeholder="Повторите пароль"
            />
          </div>
          <button className="btn btn-primary" onClick={handleSetPassword}>
            Зашифровать и сохранить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="success-icon">✓</div>
        <h2>Кошелёк создан!</h2>
        <p>Ваш TON testnet кошелёк готов к использованию.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Открыть кошелёк
        </button>
      </div>
    </div>
  );
}
