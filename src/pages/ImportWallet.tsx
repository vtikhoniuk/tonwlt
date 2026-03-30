import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { validatePassword } from '../services/crypto';

function splitWords(input: string): string[] {
  return input.trim().split(/[\s,]+/).filter(Boolean);
}

export default function ImportWallet() {
  const navigate = useNavigate();
  const { importMnemonic } = useWallet();
  const [words, setWords] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const wordList = useMemo(() => splitWords(words), [words]);

  const handleImport = async () => {
    setError('');
    const mnemonic = wordList.map((w) => w.toLowerCase());

    if (mnemonic.length !== 24) {
      setError('Мнемоническая фраза должна содержать ровно 24 слова');
      return;
    }

    const passwordError = validatePassword(password, passwordConfirm);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    try {
      await importMnemonic(mnemonic, password);
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неверная мнемоническая фраза');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Назад</button>
        <h2>Импорт кошелька</h2>
      </div>
      <div className="card">
        <p>Введите 24 слова мнемонической фразы, разделённые пробелами:</p>
        {error && <div className="error-msg">{error}</div>}
        <textarea
          className="mnemonic-input"
          value={words}
          onChange={(e) => setWords(e.target.value)}
          placeholder="word1 word2 word3 ... word24"
          rows={4}
          disabled={loading}
        />
        <div className="word-count">
          Слов: {wordList.length} / 24
        </div>

        <div className="form-group">
          <label>Пароль для шифрования</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleImport()}
            placeholder="Минимум 8 символов"
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label>Подтвердите пароль</label>
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleImport()}
            placeholder="Повторите пароль"
            disabled={loading}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleImport}
          disabled={loading}
        >
          {loading ? 'Импорт...' : 'Импортировать'}
        </button>
      </div>
    </div>
  );
}
