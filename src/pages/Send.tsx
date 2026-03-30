import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { isValidAddress, formatAddress, sendTon, estimateFee } from '../services/ton';
import { checkAddressSpoofing, SpoofingWarning, shortenAddress, splitAddressForDisplay, findAddressDifferences } from '../utils/address';
import { formatTon } from '../utils/format';

type Step = 'form' | 'confirm' | 'sending' | 'success' | 'error';

const ESTIMATED_FEE = 0.01;

export default function Send() {
  const navigate = useNavigate();
  const { wallet, balance, transactions, refresh } = useWallet();

  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [warnings, setWarnings] = useState<SpoofingWarning[]>([]);
  const [error, setError] = useState('');
  const [pastedValue, setPastedValue] = useState('');
  const [warningsAccepted, setWarningsAccepted] = useState(false);
  const [fee, setFee] = useState(ESTIMATED_FEE.toString());
  const [fwdFee, setFwdFee] = useState('0.004');

  if (!wallet) return null;

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim();
    setPastedValue(pasted);
  };

  const validate = (): string | null => {
    if (!address.trim()) return 'Введите адрес получателя';

    if (!isValidAddress(address.trim())) return 'Некорректный адрес TON';
    const normalizedAddress = formatAddress(address.trim());
    if (normalizedAddress === wallet.address) return 'Нельзя отправить самому себе';

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) return 'Введите корректную сумму';
    if (amountNum + ESTIMATED_FEE > parseFloat(balance)) return `Недостаточно средств (нужно ещё ~${ESTIMATED_FEE} TON на комиссию)`;

    return null;
  };

  const handleReview = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    const normalizedAddress = formatAddress(address.trim());
    setAddress(normalizedAddress);

    // Estimate fee in background (don't block UI)
    estimateFee(wallet.mnemonic, normalizedAddress, amount, comment || undefined)
      .then(est => { setFee(est.total); setFwdFee(est.fwdFee); })
      .catch(() => { setFee(ESTIMATED_FEE.toString()); setFwdFee('0.004'); });

    const spoofWarnings: SpoofingWarning[] = [];

    // Check for address spoofing against transaction history
    const addrWarnings = checkAddressSpoofing(normalizedAddress, transactions, wallet.address);
    spoofWarnings.push(...addrWarnings);

    // Check clipboard consistency
    if (pastedValue) {
      const normalizedPasted = formatAddress(pastedValue);
      if (normalizedPasted !== normalizedAddress) {
        spoofWarnings.push({
          type: 'clipboard_mismatch',
          message: 'Адрес не совпадает с вставленным из буфера обмена!',
          details: `Вставленный адрес: ${shortenAddress(normalizedPasted)}. Текущий адрес: ${shortenAddress(normalizedAddress)}. Адрес мог быть изменён вредоносным ПО.`,
        });
      }
    }

    // Paste verification reminder
    if (pastedValue && spoofWarnings.length === 0) {
      spoofWarnings.push({
        type: 'clipboard_mismatch',
        message: 'Адрес был вставлен из буфера обмена',
        details: 'Убедитесь, что адрес совпадает с тем, который вы хотели вставить. Вредоносное ПО может подменять адреса в буфере обмена.',
      });
    }

    setWarnings(spoofWarnings);
    setWarningsAccepted(false);
    setStep('confirm');
  };

  const handleSend = async () => {
    if (warnings.some(w => w.type === 'similar_address' || w.type === 'clipboard_mismatch') && !warningsAccepted) {
      setError('Подтвердите, что вы проверили предупреждения');
      return;
    }

    setStep('sending');
    setError('');

    try {
      await sendTon(wallet.mnemonic, address, amount, fwdFee, comment || undefined);
      setStep('success');
      setTimeout(() => refresh(), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка отправки транзакции');
      setStep('error');
    }
  };

  if (step === 'sending') {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="spinner" />
          <h2>Отправка...</h2>
          <p>Транзакция отправляется в сеть TON. Это может занять несколько секунд.</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="success-icon">✓</div>
          <h2>Отправлено!</h2>
          <p>
            {formatTon(amount)} TON отправлено на {shortenAddress(address)}
          </p>
          <p className="hint">Транзакция может появиться в истории через несколько секунд.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            На главную
          </button>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="error-icon">✗</div>
          <h2>Ошибка</h2>
          <p className="error-msg">{error}</p>
          <div className="btn-group">
            <button className="btn btn-primary" onClick={() => setStep('form')}>
              Попробовать снова
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              На главную
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    const [prefix, middle, suffix] = splitAddressForDisplay(address);
    const hasCriticalWarning = warnings.some(
      (w) => w.type === 'similar_address'
    );
    const hasClipboardNote = warnings.some(
      (w) => w.type === 'clipboard_mismatch'
    );

    return (
      <div className="page">
        <div className="page-header">
          <button className="btn-back" onClick={() => setStep('form')}>← Назад</button>
          <h2>Подтверждение</h2>
        </div>

        <div className="card">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={`warning-box ${w.type === 'similar_address' ? 'warning-critical' : 'warning-info'}`}
            >
              <div className="warning-title">{w.message}</div>
              <div className="warning-details">{w.details}</div>
              {w.similarTo && (
                <div className="warning-comparison">
                  <div className="compare-row">
                    <span className="compare-label">Вводимый:</span>
                    <AddressComparison address={address} compareWith={w.similarTo} />
                  </div>
                  <div className="compare-row">
                    <span className="compare-label">Из истории:</span>
                    <AddressComparison address={w.similarTo} compareWith={address} />
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="confirm-details">
            <div className="confirm-row">
              <span className="confirm-label">Получатель:</span>
              <div className="address-full confirm-address">
                <span className="addr-prefix">{prefix}</span>
                <span className="addr-middle">{middle}</span>
                <span className="addr-suffix">{suffix}</span>
              </div>
            </div>
            <div className="confirm-row">
              <span className="confirm-label">Сумма:</span>
              <span className="confirm-value">{formatTon(amount)} TON</span>
            </div>
            <div className="confirm-row">
              <span className="confirm-label">Комиссия (прим.):</span>
              <span className="confirm-value">~{formatTon(fee)} TON</span>
            </div>
            <div className="confirm-row fee-total">
              <span className="confirm-label">Итого с баланса:</span>
              <span className="confirm-value">~{formatTon((parseFloat(amount) + parseFloat(fee)).toString())} TON</span>
            </div>
            {comment && (
              <div className="confirm-row">
                <span className="confirm-label">Комментарий:</span>
                <span className="confirm-value">{comment}</span>
              </div>
            )}
          </div>

          {(hasCriticalWarning || hasClipboardNote) && (
            <label className="checkbox-label warning-checkbox">
              <input
                type="checkbox"
                checked={warningsAccepted}
                onChange={(e) => setWarningsAccepted(e.target.checked)}
              />
              Я проверил адрес получателя и подтверждаю отправку
            </label>
          )}

          {error && <div className="error-msg">{error}</div>}

          <button
            className={`btn ${hasCriticalWarning ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleSend}
          >
            {hasCriticalWarning ? 'Отправить несмотря на предупреждение' : 'Подтвердить отправку'}
          </button>
        </div>
      </div>
    );
  }

  // Form step
  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Назад</button>
        <h2>Отправить TON</h2>
      </div>

      <div className="card">
        {error && <div className="error-msg">{error}</div>}

        <div className="form-group">
          <label>Адрес получателя</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onPaste={handlePaste}
            placeholder="UQ... или EQ..."
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <label>Сумма (TON)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
          <div className="balance-hint">
            Баланс: {formatTon(balance)} TON
            <button
              className="btn-link"
              onClick={() => {
                const max = Math.max(0, parseFloat(balance) - ESTIMATED_FEE);
                setAmount(max.toFixed(4).replace(/0+$/, '').replace(/\.$/, ''));
              }}
            >
              Макс
            </button>
          </div>
          {amount && parseFloat(amount) > 0 && (
            <div className="fee-info">
              <div className="fee-row">
                <span>Комиссия сети (прим.):</span>
                <span>~{formatTon(fee)} TON</span>
              </div>
              <div className="fee-row fee-total">
                <span>Итого с баланса:</span>
                <span>~{formatTon((parseFloat(amount) + parseFloat(fee)).toString())} TON</span>
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Комментарий (опционально)</label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Комментарий к переводу"
          />
        </div>

        <button className="btn btn-primary" onClick={handleReview}>
          Далее
        </button>
      </div>
    </div>
  );
}

function AddressComparison({ address, compareWith }: { address: string; compareWith: string }) {
  const diffs = findAddressDifferences(address, compareWith);

  return (
    <span className="address-comparison">
      {address.split('').map((char, i) => (
        <span key={i} className={diffs.includes(i) ? 'char-diff' : 'char-same'}>
          {char}
        </span>
      ))}
    </span>
  );
}
