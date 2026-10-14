import { useEffect, useState, useCallback } from 'react';
import { api, Conversation, UserProfile, resolveUser } from '../api';

interface Props {
  onOpenChat: (peerId: number, title: string) => void;
  onError: (msg: string) => void;
  meId: number;
}

function timeShort(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (d.toDateString() === now.toDateString()) return `${hh}:${mm}`;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function MessagesPanel({ onOpenChat, onError, meId }: Props) {
  const [conv, setConv] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: Conversation[]; profiles?: UserProfile[]; groups?: any[] }>(
        'messages.getConversations',
        {
          count: 40,
          extended: 1,
          fields: 'photo_100,online',
          start_message_id: -1,
        },
      );
      if (data) {
        setConv(data.items || []);
        if (data.profiles) setProfiles(data.profiles);
        if (data.groups) setGroups(data.groups);
      }
    } catch (e: any) {
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
        const t = resolveUser(c.peer.id > 0 ? c.peer.id : c.peer.id, profiles, groups).name;
        return t.toLowerCase().includes(q.toLowerCase());
      })
    : conv;

  return (
    <div className="ovk-page">
      <header className="ovk-header">
        <div className="ovk-header__row">
          <div className="ovk-header__title">Сообщения</div>
        </div>
        <div className="ovk-search">
          <span className="ovk-search__icon">🔍</span>
          <input
            placeholder="Поиск"
            value={q}
            onChange={(e: any) => setQ(e.target.value)}
          />
        </div>
      </header>

      {loading ? (
        <div className="ovk-loading">Загрузка…</div>
      ) : filtered.length === 0 ? (
        <div className="ovk-empty">{q ? 'Ничего не найдено' : 'Нет диалогов'}</div>
      ) : (
        filtered.map((c, idx) => {
          const author = resolveUser(c.peer.id, profiles, groups);
          const lm = c.last_message;
          const prefix = lm && lm.from_id === meId && lm.out ? 'Вы: ' : '';
          const text = lm ? prefix + (lm.text || 'Вложение').slice(0, 80) : '';
          return (
            <div key={idx}>
              <div
                className="ovk-cell"
                onClick={() => onOpenChat(c.peer.id, author.name)}
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
                  <div className="ovk-cell__meta">
                    {lm ? timeShort(lm.date) : ''}
                  </div>
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
