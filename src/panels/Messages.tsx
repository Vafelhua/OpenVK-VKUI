import { useEffect, useState, useCallback } from 'react';
import { api, asList, Conversation, UserProfile, resolveUser } from '../api';
import { IconSearch } from '../components/Icons';

interface Props {
  onOpenChat: (peerId: number, title: string) => void;
  onOpenUser: (id: number) => void;
  onError: (msg: string) => void;
  meId: number;
  refreshKey?: number;
}

function timeShort(ts: number): string {
  try {
    const d = new Date(ts * 1000);
    const now = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (d.toDateString() === now.toDateString()) return hh + ':' + mm;
    return (
      String(d.getDate()).padStart(2, '0') +
      '.' +
      String(d.getMonth() + 1).padStart(2, '0')
    );
  } catch {
    return '';
  }
}

function peerIdOf(c: any): number {
  if (!c) return 0;
  if (typeof c.peer === 'number') return c.peer;
  if (c.peer && typeof c.peer.id === 'number') return c.peer.id;
  if (typeof c.peer_id === 'number') return c.peer_id;
  if (c.peer && typeof c.peer.local_id === 'number') {
    return c.peer.type === 'group' ? -c.peer.local_id : c.peer.local_id;
  }
  return 0;
}

export function MessagesPanel({ onOpenChat, onOpenUser, onError, meId, refreshKey }: Props) {
  const [conv, setConv] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');
  const [lastRefresh, setLastRefresh] = useState(0);

  useEffect(() => {
    if (!refreshKey) return;
    const now = Date.now();
    if (now - lastRefresh < 3000) return;
    setLastRefresh(now);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const data = await api<any>('messages.getConversations', {
        count: 40,
        extended: 1,
        fields: 'photo_100,online',
      });
      const items = asList<any>(data);
      setConv(items);
      if (data && !Array.isArray(data)) {
        if (Array.isArray(data.profiles)) setProfiles(data.profiles);
        if (Array.isArray(data.groups)) setGroups(data.groups);
      }
    } catch (e: any) {
      setFailed(true);
      onError(e?.message || 'Не удалось загрузить диалоги');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = q
    ? conv.filter((c) => {
        const id = peerIdOf(c);
        if (!id) return false;
        return resolveUser(id, profiles, groups).name.toLowerCase().includes(q.toLowerCase());
      })
    : conv;

  return (
    <div className="ovk-page">
      <header className="ovk-header">
        <div className="ovk-header__row">
          <div className="ovk-header__title">Сообщения</div>
          <button className="ovk-header__action" onClick={() => load()}>
            Обновить
          </button>
        </div>
        <div className="ovk-search">
          <IconSearch color="#818c99" />
          <input
            placeholder="Поиск"
            value={q}
            onChange={(e: any) => setQ(e.target.value)}
          />
        </div>
      </header>

      {loading ? (
        <div className="ovk-loading">Загрузка...</div>
      ) : failed ? (
        <div className="ovk-empty">
          Не удалось загрузить сообщения
          <br />
          <button className="ovk-login__link" onClick={() => load()}>
            Повторить
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ovk-empty">{q ? 'Ничего не найдено' : 'Нет диалогов'}</div>
      ) : (
        filtered.map((c, idx) => {
          const id = peerIdOf(c);
          if (!id) return null;
          const author = resolveUser(id, profiles, groups);
          const lm = c && c.last_message ? c.last_message : null;
          let text = '';
          if (lm) {
            const prefix = lm.from_id === meId && lm.out ? 'Вы: ' : '';
            text = prefix + String(lm.text || 'Вложение').slice(0, 80);
          }
          return (
            <div key={idx}>
              <div
                className="ovk-cell"
                onClick={() => onOpenChat(id, author.name)}
              >
                {author.photo ? (
                  <img className="ovk-avatar" src={author.photo} alt="" />
                ) : (
                  <div className="ovk-avatar" />
                )}
                <div className="ovk-cell__body">
                  <div className="ovk-cell__title">{author.name}</div>
                  <div className="ovk-cell__subtitle">{text}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div className="ovk-cell__meta">{lm ? timeShort(lm.date) : ''}</div>
                  {c.unread_count ? (
                    <div className="ovk-cell__badge">{c.unread_count}</div>
                  ) : null}
                </div>
              </div>
              <div className="ovk-sep" />
            </div>
          );
        })
      )}
    </div>
  );
}
