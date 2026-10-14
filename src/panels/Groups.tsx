import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';

interface Props {
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

export function GroupsPanel({ onError }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [q, setQ] = useState('');
  const [searchRes, setSearchRes] = useState<Group[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: Group[] }>('groups.get', {
        extended: 1,
        count: 100,
        fields: 'photo_100,members_count,status',
      });
      if (data && data.items) setGroups(data.items);
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить сообщества');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!q.trim()) {
      setSearchRes(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await api<{ items: Group[] }>('groups.search', {
          q: q.trim(),
          count: 30,
          fields: 'photo_100,members_count',
        });
        setSearchRes(data && data.items ? data.items : []);
      } catch {
        setSearchRes([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const list = searchRes !== null ? searchRes : groups;

  const row = (g: Group) => (
    <div key={'g' + g.id}>
      <div
        className="ovk-cell"
        onClick={() => {
          window.open('https://openvk.org/' + (g.screen_name || 'club' + g.id), '_blank');
        }}
      >
        {g.photo_100 ? (
          <img
            className="ovk-avatar"
            src={g.photo_100}
            alt=""
            style={{ borderRadius: 8 }}
          />
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
      </div>
      <div className="ovk-sep" />
    </div>
  );

  return (
    <div className="ovk-page">
      <header className="ovk-header">
        <div className="ovk-header__row">
          <div className="ovk-header__title">Сообщества</div>
          <div className="ovk-cell__meta">
            {searchRes === null ? groups.length : ''}
          </div>
        </div>
        <div className="ovk-search">
          <span className="ovk-search__icon">🔍</span>
          <input
            placeholder="Поиск сообществ"
            value={q}
            onChange={(e: any) => setQ(e.target.value)}
          />
        </div>
      </header>

      {loading || searching ? (
        <div className="ovk-loading">Загрузка…</div>
      ) : list.length === 0 ? (
        <div className="ovk-empty">{q ? 'Ничего не найдено' : 'Нет сообществ'}</div>
      ) : (
        list.map(row)
      )}
    </div>
  );
}
