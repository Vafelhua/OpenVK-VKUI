import { useEffect, useState, useCallback } from 'react';
import { api, asList } from '../api';
import { IconSearch } from '../components/Icons';

interface Props {
  onOpenGroup: (id: number) => void;
  onError: (msg: string) => void;
}

interface Group {
  id: number;
  name: string;
  screen_name?: string;
  photo_50?: string;
  photo_100?: string;
  members_count?: number;
  status?: string;
  is_closed?: number;
}

export function GroupsPanel({ onOpenGroup, onError }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [q, setQ] = useState('');
  const [searchRes, setSearchRes] = useState<Group[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api<any>('groups.get', {
        extended: 1,
        count: 100,
        offset: 0,
        fields: 'photo_100,members_count,status',
      });
      const list = asList<Group>(data);
      setGroups(list);
      setHasMore(list.length >= 100);
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить сообщества');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await api<any>('groups.get', {
        extended: 1,
        count: 100,
        offset: groups.length,
        fields: 'photo_100,members_count,status',
      });
      const list = asList<Group>(data);
      if (!list.length) setHasMore(false);
      else setGroups((prev) => [...prev, ...list]);
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить ещё');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!q.trim()) {
      setSearchRes(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await api<any>('groups.search', {
          q: q.trim(),
          count: 30,
          fields: 'photo_100,members_count',
        });
        setSearchRes(asList<Group>(data));
      } catch {
        setSearchRes([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const list = searchRes !== null ? searchRes : groups;

  return (
    <div className="ovk-page">
      <header className="ovk-header">
        <div className="ovk-header__row">
          <div className="ovk-header__title">Сообщества</div>
          <div className="ovk-cell__meta">{searchRes === null ? groups.length : ''}</div>
        </div>
        <div className="ovk-search">
          <IconSearch color="#818c99" />
          <input placeholder="Поиск сообществ" value={q} onChange={(e: any) => setQ(e.target.value)} />
        </div>
      </header>

      {loading || searching ? (
        <div className="ovk-loading">Загрузка...</div>
      ) : list.length === 0 ? (
        <div className="ovk-empty">{q ? 'Ничего не найдено' : 'Нет сообществ'}</div>
      ) : (
        <>
          {list.map((g) => (
            <div key={'g' + g.id}>
              <div className="ovk-cell" onClick={() => onOpenGroup(g.id)}>
                {g.photo_100 ? (
                  <img className="ovk-avatar" src={g.photo_100} alt="" style={{ borderRadius: 8 }} />
                ) : (
                  <div className="ovk-avatar" style={{ borderRadius: 8 }} />
                )}
                <div className="ovk-cell__body">
                  <div className="ovk-cell__title">{g.name}</div>
                  <div className="ovk-cell__subtitle">
                    {g.members_count != null
                      ? new Intl.NumberFormat('ru-RU').format(g.members_count) + ' участников'
                      : g.status || ''}
                  </div>
                </div>
                <div className="ovk-cell__meta">›</div>
              </div>
              <div className="ovk-sep" />
            </div>
          ))}
          {searchRes === null && hasMore ? (
            <button className="ovk-more-btn" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Загрузка...' : 'Показать ещё'}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
