import { useEffect, useState, useCallback } from 'react';
import { api, asList } from '../api';
import { IconBack } from '../components/Icons';

interface Gift {
  id: number;
  name?: string;
  photo_75?: string;
  photo_125?: string;
  sticker_id?: number;
}

interface Props {
  userId: number;
  userName?: string;
  onBack: () => void;
  onError: (msg: string) => void;
}

export function GiftPanel({ userId, userName, onBack, onError }: Props) {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<number | null>(null);
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<any>('gifts.get', {});
      setGifts(asList<Gift>(data));
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить подарки');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (gift: Gift) => {
    if (sending != null) return;
    setSending(gift.id);
    try {
      await api('gifts.send', {
        user_ids: String(userId),
        gift_id: String(gift.id),
      });
      setSent(true);
    } catch (e: any) {
      onError(e?.message || 'Не удалось отправить подарок');
    } finally {
      setSending(null);
    }
  };

  if (sent) {
    return (
      <div className="ovk-page">
        <header className="ovk-header">
          <div className="ovk-header__row">
            <button className="ovk-header__action" onClick={onBack} style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
              <IconBack color="#2688eb" /> <span style={{ marginLeft: 4 }}>Назад</span>
            </button>
            <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center' }}>
              Подарок отправлен
            </div>
            <div style={{ width: 70 }} />
          </div>
        </header>
        <div className="ovk-empty">
          Подарок отправлен {userName || 'пользователю'}
          <div style={{ marginTop: 16 }}>
            <button className="ovk-btn-primary" onClick={onBack}>
              Готово
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ovk-page">
      <header className="ovk-header">
        <div className="ovk-header__row">
          <button className="ovk-header__action" onClick={onBack} style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
            <IconBack color="#2688eb" /> <span style={{ marginLeft: 4 }}>Назад</span>
          </button>
          <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center' }}>
            Подарки
          </div>
          <div style={{ width: 70 }} />
        </div>
      </header>

      {loading ? (
        <div className="ovk-loading">Загрузка...</div>
      ) : gifts.length === 0 ? (
        <div className="ovk-empty">Нет доступных подарков</div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridGap: 12,
            padding: 12,
          }}
        >
          {gifts.map((g) => (
            <div
              key={g.id}
              onClick={() => send(g)}
              style={{
                background: sending === g.id ? '#2c2c2e' : '#fff',
                border: '1px solid #e7e8ec',
                borderRadius: 8,
                padding: 10,
                textAlign: 'center',
                cursor: 'pointer',
                opacity: sending != null && sending !== g.id ? 0.5 : 1,
              }}
            >
              {g.photo_125 || g.photo_75 ? (
                <img
                  src={g.photo_125 || g.photo_75}
                  alt=""
                  style={{ width: 64, height: 64, objectFit: 'contain', margin: '0 auto' }}
                />
              ) : (
                <div style={{ width: 64, height: 64, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                  🎁
                </div>
              )}
              <div style={{ fontSize: 12, marginTop: 6, color: '#000' }}>
                {sending === g.id ? 'Отправка...' : g.name || 'Подарок #' + g.id}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
