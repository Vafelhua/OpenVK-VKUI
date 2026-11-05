import { useEffect, useState, useCallback } from 'react';
import {
  api,
  asList,
  UserProfile,
  resolveUser,
  conversationPeerId,
  conversationLastMessage,
  conversationUnread,
} from '../api';
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
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0');
  } catch {
    return '';
  }
}

export function MessagesPanel({ onOpenChat, onOpenUser, onError, meId, refreshKey }: Props) {
  const [conv, setConv] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(0);

  const fetchPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      const data = await api<any>('messages.getConversations', {
        count: 40,
        offset: nextOffset,
        extended: 1,
        fields: 'photo_100,online',
      });
      const items = asList<any>(data);
      setConv((prev) => (append ? [...prev, ...items] : items));
      if (data && !Array.isArray(data)) {
        if (Array.isArray(data.profiles)) {
          setProfiles((prev) => (append ? [...prev, ...data.profiles] : data.profiles));
        }
        if (Array.isArray(data.groups)) {
          setGroups((prev) => (append ? [...prev, ...data.groups] : data.groups));
        }
        setHasMore(items.length >= 40);
      } else {
        setHasMore(false);
      }
      setOffset(nextOffset + items.length);
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setHasMore(true);
      setOffset(0);
      await fetchPage(0, false);
    } catch (e: any) {
      setFailed(true);
      onError(e?.message || 'Не удалось загрузить диалоги');
    } finally {
      setLoading(false);
    }
  }, [fetchPage, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchPage(offset, true);
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить ещё');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!refreshKey) return;
    const now = Date.now();
    if (now - lastRefresh < 3000) return;
    setLastRefresh(now);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const filtered = q
    ? conv.filter((c) => {
        const id = conversationPeerId(c);
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
          <input placeholder="Поиск" value={q} onChange={(e: any) => setQ(e.target.value)} />
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
        <>
          {filtered.map((c, idx) => {
            const id = conversationPeerId(c);
            if (!id) return null;
            const author = resolveUser(id, profiles, groups);
            const lm = conversationLastMessage(c);
            const unread = conversationUnread(c);
            let text = '';
            if (lm) {
              const prefix = lm.from_id === meId && lm.out ? 'Вы: ' : '';
              text = prefix + String(lm.text || 'Вложение').slice(0, 80);
            }
            return (
              <div key={String(id) + '_' + idx}>
                <div className="ovk-cell" onClick={() => onOpenChat(id, author.name)}>
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
                    {unread ? <div className="ovk-cell__badge">{unread}</div> : null}
                  </div>
                </div>
                <div className="ovk-sep" />
              </div>
            );
          })}
          {hasMore && !q ? (
            <button className="ovk-more-btn" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Загрузка...' : 'Показать ещё'}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
