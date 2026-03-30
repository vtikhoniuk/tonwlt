import { useState, useRef, useEffect } from 'react';
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
  const confirmCheckboxRef = useRef<HTMLInputElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  if (!wallet) return null;

  const normalizedAddress = isValidAddress(address.trim()) ? formatAddress(address.trim()) : '';
  const total = amount && parseFloat(amount) > 0
    ? formatTon((parseFloat(amount) + parseFloat(fee)).toString())
    : '';

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    setPastedValue(e.clipboardData.getData('text').trim());
  };

  const validate = (): string | null => {
    if (!address.trim()) return 'Введите адрес получателя';
    if (!normalizedAddress) return 'Некорректный адрес TON';
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

    estimateFee(comment || undefined)
      .then(est => setFee(est.total))
      .catch(() => setFee(ESTIMATED_FEE.toString()));

    const spoofWarnings: SpoofingWarning[] = [];

    const addrWarnings = checkAddressSpoofing(normalizedAddress, transactions, wallet.address);
    spoofWarnings.push(...addrWarnings);

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
      await sendTon(wallet.mnemonic, normalizedAddress, amount, comment || undefined);
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
    const hasCriticalWarning = warnings.some((w) => w.type === 'similar_address');
    const hasClipboardNote = warnings.some((w) => w.type === 'clipboard_mismatch');
    const showCheckbox = hasCriticalWarning || hasClipboardNote;

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
              <span className="confirm-value">~{total} TON</span>
            </div>
            {comment && (
              <div className="confirm-row">
                <span className="confirm-label">Комментарий:</span>
                <span className="confirm-value">{comment}</span>
              </div>
            )}
          </div>

          {showCheckbox && (
            <label className="checkbox-label warning-checkbox">
              <input
                ref={confirmCheckboxRef}
                type="checkbox"
                checked={warningsAccepted}
                onChange={(e) => setWarningsAccepted(e.target.checked)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                autoFocus
              />
              Я проверил адрес получателя и подтверждаю отправку
            </label>
          )}

          {error && <div className="error-msg">{error}</div>}

          <button
            ref={confirmBtnRef}
            className={`btn ${hasCriticalWarning ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleSend}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            autoFocus={!showCheckbox}
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
            onKeyDown={(e) => e.key === 'Enter' && handleReview()}
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
            onKeyDown={(e) => e.key === 'Enter' && handleReview()}
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
          {total && (
            <div className="fee-info">
              <div className="fee-row">
                <span>Комиссия сети (прим.):</span>
                <span>~{formatTon(fee)} TON</span>
              </div>
              <div className="fee-row fee-total">
                <span>Итого с баланса:</span>
                <span>~{total} TON</span>
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
            onKeyDown={(e) => e.key === 'Enter' && handleReview()}
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
  const diffSet = new Set(findAddressDifferences(address, compareWith));

  return (
    <span className="address-comparison">
      {address.split('').map((char, i) => (
        <span key={i} className={diffSet.has(i) ? 'char-diff' : 'char-same'}>
          {char}
        </span>
      ))}
    </span>
  );
}
