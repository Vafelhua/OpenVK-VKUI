import { useEffect, useState, useCallback } from 'react';
import { api, asList, UserProfile, FeedItem, enrichWallAuthors, absoluteUrl } from '../api';
import { PostCard } from '../components/PostCard';
import { IconBack, IconSearch } from '../components/Icons';

interface Props {
  onBack: () => void;
  onOpenUser: (id: number) => void;
  onOpenGroup: (id: number) => void;
  onError: (msg: string) => void;
}

type Tab = 'users' | 'groups' | 'posts';

export function SearchPanel({ onBack, onOpenUser, onOpenGroup, onError }: Props) {
  const [tab, setTab] = useState<Tab>('users');
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [postProfiles, setPostProfiles] = useState<UserProfile[]>([]);
  const [postGroups, setPostGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const run = useCallback(
    async (query: string, kind: Tab) => {
      const text = query.trim();
      if (!text) return;
      setLoading(true);
      setSearched(true);
      try {
        if (kind === 'users') {
          const data = await api<any>('users.search', {
            q: text,
            count: 50,
            fields: 'photo_100,online',
          });
          setUsers(asList<UserProfile>(data));
        } else if (kind === 'groups') {
          const data = await api<any>('groups.search', {
            q: text,
            count: 50,
            fields: 'photo_100,members_count',
          });
          setGroups(asList<any>(data));
        } else {
          const data = await api<any>('newsfeed.search', {
            q: text,
            count: 30,
            extended: 1,
            fields: 'photo_100',
          });
          const its = asList<FeedItem>(data);
          setPosts(its);
          const ps: UserProfile[] = data && !Array.isArray(data) && Array.isArray(data.profiles) ? data.profiles : [];
          const gs: any[] = data && !Array.isArray(data) && Array.isArray(data.groups) ? data.groups : [];
          setPostProfiles(ps);
          setPostGroups(gs);
          enrichWallAuthors(its, ps, gs).then((r) => {
            setPostProfiles(r.profiles);
            setPostGroups(r.groups);
          });
        }
      } catch (e: any) {
        onError(e?.message || 'Поиск не удался');
      } finally {
        setLoading(false);
      }
    },
    [onError],
  );

  useEffect(() => {
    if (!q.trim()) {
      setSearched(false);
      setUsers([]);
      setGroups([]);
      setPosts([]);
      return;
    }
    const t = setTimeout(() => run(q, tab), 450);
    return () => clearTimeout(t);
  }, [q, tab, run]);

  const onLike = async (item: FeedItem) => {
    const liked = item.likes && item.likes.user_likes;
    const oid = item.owner_id != null ? item.owner_id : item.source_id;
    try {
      await api('likes.' + (liked ? 'delete' : 'add'), {
        type: 'post',
        owner_id: String(oid),
        item_id: String(item.post_id || item.id),
      });
      setPosts((prev) =>
        prev.map((it) =>
          (it.post_id || it.id) === (item.post_id || item.id) && it.source_id === item.source_id
            ? { ...it, likes: { count: Math.max(0, (it.likes?.count || 0) + (liked ? -1 : 1)), user_likes: liked ? 0 : 1 } }
            : it,
        ),
      );
    } catch (e: any) {
      onError(e?.message || 'Ошибка');
    }
  };

  const empty = !loading && searched && q.trim();

  return (
    <div className="ovk-page">
      <header className="ovk-header">
        <div className="ovk-header__row">
          <button
            className="ovk-header__action"
            onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}
          >
            <IconBack color="#2688eb" /> <span style={{ marginLeft: 4 }}>Назад</span>
          </button>
          <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center' }}>
            Поиск
          </div>
          <div style={{ width: 70 }} />
        </div>
        <div className="ovk-search">
          <IconSearch color="#818c99" />
          <input placeholder="Поиск" value={q} onChange={(e: any) => setQ(e.target.value)} autoFocus />
        </div>
        <div className="ovk-feed-switch">
          {(
            [
              ['users', 'Люди'],
              ['groups', 'Сообщества'],
              ['posts', 'Записи'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={'ovk-feed-switch__btn' + (tab === id ? ' active' : '')}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="ovk-loading">Поиск...</div>
      ) : tab === 'users' ? (
        users.length === 0 ? (
          <div className="ovk-empty">{empty ? 'Ничего не найдено' : 'Введите запрос'}</div>
        ) : (
          users.map((u) => (
            <div key={u.id} className="ovk-cell" onClick={() => onOpenUser(u.id)}>
              {u.photo_100 ? (
                <img className="ovk-avatar" src={u.photo_100} alt="" />
              ) : (
                <div className="ovk-avatar" />
              )}
              <div className="ovk-cell__body">
                <div className="ovk-cell__title">
                  {u.first_name} {u.last_name}
                </div>
                {u.online ? (
                  <div className="ovk-cell__subtitle" style={{ color: '#4bb34b' }}>
                    в сети
                  </div>
                ) : null}
              </div>
              <div className="ovk-cell__meta">›</div>
            </div>
          ))
        )
      ) : tab === 'groups' ? (
        groups.length === 0 ? (
          <div className="ovk-empty">{empty ? 'Ничего не найдено' : 'Введите запрос'}</div>
        ) : (
          groups.map((g: any) => (
            <div key={g.id} className="ovk-cell" onClick={() => onOpenGroup(g.id)}>
              {g.photo_100 ? (
                <img className="ovk-avatar" src={absoluteUrl(g.photo_100)} alt="" style={{ borderRadius: 8 }} />
              ) : (
                <div className="ovk-avatar" style={{ borderRadius: 8 }} />
              )}
              <div className="ovk-cell__body">
                <div className="ovk-cell__title">{g.name}</div>
                {g.members_count != null ? (
                  <div className="ovk-cell__subtitle">{g.members_count} участников</div>
                ) : null}
              </div>
              <div className="ovk-cell__meta">›</div>
            </div>
          ))
        )
      ) : posts.length === 0 ? (
        <div className="ovk-empty">{empty ? 'Ничего не найдено' : 'Введите запрос'}</div>
      ) : (
        posts.map((item, idx) => (
          <PostCard
            key={String(item.source_id) + '_' + String(item.post_id || item.id || idx)}
            item={item}
            profiles={postProfiles}
            groups={postGroups}
            onLike={onLike}
            onError={onError}
            onOpenAuthor={(id) => {
              if (id > 0) onOpenUser(id);
              else onOpenGroup(-id);
            }}
          />
        ))
      )}
    </div>
  );
}
