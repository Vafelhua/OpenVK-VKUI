import { useEffect, useState, useCallback } from 'react';
import { api, asList, UserProfile } from '../api';
import { IconSearch, IconMessages } from '../components/Icons';

interface Props {
  onOpenChat: (peerId: number, title: string) => void;
  onOpenUser: (id: number) => void;
  onError: (msg: string) => void;
  meId: number;
}

export function FriendsPanel({ onOpenChat, onOpenUser, onError, meId }: Props) {
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [q, setQ] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<any>('friends.get', {
        user_id: meId || undefined,
        fields: 'photo_100,online,last_seen',
        count: 100,
        offset: 0,
        order: 'hints',
      });
      const list = asList<UserProfile>(data);
      setFriends(list);
      setHasMore(list.length >= 100);
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить друзей');
    }
    try {
      const req = await api<any>('friends.getRequests', {
        count: 10,
        fields: 'photo_100',
        extended: 0,
      });
      const items = req && req.items ? req.items : asList<any>(req);
      setRequests(items.filter((x: any) => typeof x === 'object' && x.id));
    } catch {}
    setLoading(false);
  }, [meId, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await api<any>('friends.get', {
        user_id: meId || undefined,
        fields: 'photo_100,online,last_seen',
        count: 100,
        offset: friends.length,
        order: 'hints',
      });
      const list = asList<UserProfile>(data);
      if (!list.length) setHasMore(false);
      else setFriends((prev) => [...prev, ...list]);
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить ещё');
    } finally {
      setLoadingMore(false);
    }
  };

  const accept = async (id: number) => {
    try {
      await api('friends.add', { user_id: String(id) });
      setRequests((p) => p.filter((x) => x.id !== id));
    } catch (e: any) {
      onError(e?.message || 'Ошибка');
    }
  };

  const reject = async (id: number) => {
    try {
      await api('friends.delete', { user_id: String(id) });
      setRequests((p) => p.filter((x) => x.id !== id));
    } catch (e: any) {
      onError(e?.message || 'Ошибка');
    }
  };

  const filtered0 = q
    ? friends.filter((f) => (f.first_name + ' ' + f.last_name).toLowerCase().includes(q.toLowerCase()))
    : friends;
  const filtered = onlineOnly ? filtered0.filter((f) => f.online) : filtered0;

  return (
    <div className="ovk-page">
      <header className="ovk-header">
        <div className="ovk-header__row">
          <div className="ovk-header__title">Друзья</div>
          <div className="ovk-cell__meta">{friends.length}</div>
        </div>
        <div className="ovk-search">
          <IconSearch color="#818c99" />
          <input placeholder="Поиск" value={q} onChange={(e: any) => setQ(e.target.value)} />
        </div>
        <div style={{ display: 'flex', padding: '0 12px 8px' }}>
          <button
            onClick={() => setOnlineOnly(false)}
            className={'ovk-feed-switch__btn' + (!onlineOnly ? ' active' : '')}
            style={{ fontSize: 13, height: 30, padding: '0 12px', marginRight: 8 }}
          >
            Все
          </button>
          <button
            onClick={() => setOnlineOnly(true)}
            className={'ovk-feed-switch__btn' + (onlineOnly ? ' active' : '')}
            style={{ fontSize: 13, height: 30, padding: '0 12px' }}
          >
            В сети
          </button>
        </div>
      </header>

      {loading ? (
        <div className="ovk-loading">Загрузка...</div>
      ) : (
        <>
          {requests.length > 0 && (
            <>
              <div className="ovk-section-title">Заявки в друзья</div>
              {requests.map((r) => (
                <div key={'req' + r.id}>
                  <div className="ovk-cell">
                    {r.photo_100 ? (
                      <img className="ovk-avatar" src={r.photo_100} alt="" />
                    ) : (
                      <div className="ovk-avatar" />
                    )}
                    <div className="ovk-cell__body" onClick={() => onOpenUser(r.id)}>
                      <div className="ovk-cell__title">
                        {r.first_name} {r.last_name}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <button
                        className="ovk-btn-primary"
                        style={{ height: 32, fontSize: 13, padding: '0 10px', marginRight: 6 }}
                        onClick={() => accept(r.id)}
                      >
                        Добавить
                      </button>
                      <button
                        className="ovk-btn-secondary"
                        style={{ height: 32, fontSize: 13, padding: '0 10px' }}
                        onClick={() => reject(r.id)}
                      >
                        Скрыть
                      </button>
                    </div>
                  </div>
                  <div className="ovk-sep" />
                </div>
              ))}
            </>
          )}

          <div className="ovk-section-title">
            {onlineOnly ? 'В сети' : 'Все друзья'} · {filtered.length}
          </div>
          {filtered.length === 0 ? (
            <div className="ovk-empty">Нет друзей</div>
          ) : (
            filtered.map((f) => (
              <div key={f.id}>
                <div className="ovk-cell" onClick={() => onOpenUser(f.id)}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {f.photo_100 ? (
                      <img className="ovk-avatar" src={f.photo_100} alt="" />
                    ) : (
                      <div className="ovk-avatar" />
                    )}
                    {f.online ? <div className="ovk-online" style={{ right: 0, bottom: 0 }} /> : null}
                  </div>
                  <div className="ovk-cell__body">
                    <div className="ovk-cell__title">
                      {f.first_name} {f.last_name}
                    </div>
                    {f.online ? (
                      <div className="ovk-cell__subtitle" style={{ color: '#4bb34b' }}>
                        в сети
                      </div>
                    ) : null}
                  </div>
                  <button
                    className="ovk-icon-btn"
                    onClick={(e: any) => {
                      e.stopPropagation();
                      onOpenChat(f.id, f.first_name + ' ' + f.last_name);
                    }}
                    title="Написать"
                  >
                    <IconMessages color="#2688eb" />
                  </button>
                </div>
                <div className="ovk-sep" />
              </div>
            ))
          )}
          {hasMore && !q && !onlineOnly ? (
            <button className="ovk-more-btn" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Загрузка...' : 'Показать ещё'}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
