import { useEffect, useState, useCallback } from 'react';
import { api, UserProfile } from '../api';
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
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: UserProfile[] }>('friends.get', {
        user_id: meId || undefined,
        fields: 'photo_100,online,last_seen',
        count: 100,
        order: 'hints',
      });
      if (data && data.items) setFriends(data.items);
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить друзей');
    }
    try {
      const req = await api<any>('friends.getRequests', {
        count: 10,
        fields: 'photo_100',
        extended: 0,
      });
      if (req && req.items) {
        setRequests(req.items.filter((x: any) => typeof x === 'object' && x.id));
      }
    } catch {}
    setLoading(false);
  }, [meId, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = q
    ? friends.filter((f) =>
        (f.first_name + ' ' + f.last_name).toLowerCase().includes(q.toLowerCase()),
      )
    : friends;

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
                    <div
                      className="ovk-cell__body"
                      onClick={() => onOpenUser(r.id)}
                    >
                      <div className="ovk-cell__title">
                        {r.first_name} {r.last_name}
                      </div>
                    </div>
                    <button
                      className="ovk-btn-primary"
                      style={{ height: 32, fontSize: 14, padding: '0 12px' }}
                      onClick={async () => {
                        try {
                          await api('friends.add', { user_id: String(r.id) });
                          setRequests((p) => p.filter((x) => x.id !== r.id));
                        } catch (e: any) {
                          onError(e?.message || 'Ошибка');
                        }
                      }}
                    >
                      Добавить
                    </button>
                  </div>
                  <div className="ovk-sep" />
                </div>
              ))}
            </>
          )}

          <div className="ovk-section-title">Все друзья</div>
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
                    {f.online ? (
                      <div className="ovk-online" style={{ right: 0, bottom: 0 }} />
                    ) : null}
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
        </>
      )}
    </div>
  );
}
