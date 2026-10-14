import { useEffect, useState, useCallback } from 'react';
import { api, asList, UserProfile, FeedItem, FeedResponse } from '../api';
import { PostCard } from '../components/PostCard';
import { IconBack, IconSend } from '../components/Icons';

interface Props {
  onOpenProfile: () => void;
  onOpenUser: (id: number) => void;
  onOpenGroup: (id: number) => void;
  onError: (msg: string) => void;
  meId: number;
}

export function FeedPanel({ onOpenProfile, onOpenUser, onOpenGroup, onError, meId }: Props) {
  const [mode, setMode] = useState<'all' | 'friends'>('all');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'all') {
        const feed = await api<any>('newsfeed.get', {
          filters: 'post',
          return_banned: 0,
          count: 30,
          fields: 'photo_100',
        });
        setItems(asList<FeedItem>(feed));
        if (feed && !Array.isArray(feed)) {
          if (Array.isArray(feed.profiles)) setProfiles(feed.profiles);
          if (Array.isArray(feed.groups)) setGroups(feed.groups);
        }
      } else {
        const fr = await api<any>('friends.get', {
          count: 30,
          order: 'hints',
          fields: 'photo_100',
        });
        const friends = asList<UserProfile>(fr);
        if (fr && !Array.isArray(fr) && Array.isArray(fr.profiles)) {
          setProfiles(fr.profiles);
        } else {
          setProfiles(friends);
        }
        const walls = await Promise.all(
          friends.slice(0, 15).map((f) =>
            api<any>('wall.get', { owner_id: String(f.id), count: 5 }).catch(() => null),
          ),
        );
        const merged: FeedItem[] = [];
        const extraProfiles: UserProfile[] = [];
        const extraGroups: any[] = [];
        for (const w of walls) {
          if (!w) continue;
          const list = asList<FeedItem>(w);
          for (const it of list) {
            merged.push({ ...it, source_id: it.source_id || (w.owner_id as number) });
          }
          if (!Array.isArray(w)) {
            if (Array.isArray(w.profiles)) extraProfiles.push(...w.profiles);
            if (Array.isArray(w.groups)) extraGroups.push(...w.groups);
          }
        }
        merged.sort((a, b) => (b.date || 0) - (a.date || 0));
        setItems(merged.slice(0, 40));
        if (extraProfiles.length) setProfiles((prev) => [...prev, ...extraProfiles]);
        if (extraGroups.length) setGroups((prev) => [...prev, ...extraGroups]);
      }
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить ленту');
    } finally {
      setLoading(false);
    }
  }, [mode, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const onLike = async (item: FeedItem) => {
    const liked = item.likes && item.likes.user_likes;
    try {
      await api('likes.' + (liked ? 'delete' : 'add'), {
        type: 'post',
        owner_id: item.source_id,
        item_id: item.post_id || item.id,
      });
      setItems((prev) =>
        prev.map((it) => {
          if ((it.post_id || it.id) === (item.post_id || item.id) && it.source_id === item.source_id) {
            const count = (it.likes?.count || 0) + (liked ? -1 : 1);
            return {
              ...it,
              likes: { count: Math.max(0, count), user_likes: liked ? 0 : 1 },
            };
          }
          return it;
        }),
      );
    } catch (e: any) {
      onError(e?.message || 'Ошибка');
    }
  };

  const onRepost = async (item: FeedItem) => {
    const oid = item.owner_id != null ? item.owner_id : item.source_id;
    const pid = item.post_id || item.id;
    try {
      await api('wall.repost', {
        object: 'wall' + oid + '_' + pid,
        message: '',
      });
      onError('Запись добавлена на вашу стену');
    } catch (e: any) {
      onError(e?.message || 'Не удалось сделать репост');
    }
  };

  const onPosted = (newItem: FeedItem) => {
    setItems((prev) => [newItem, ...prev]);
    setComposeOpen(false);
  };

  return (
    <div className="ovk-page">
      <header className="ovk-header">
        <div className="ovk-header__row">
          <div className="ovk-header__title">Новости</div>
          <button className="ovk-header__action" onClick={() => load()}>
            Обновить
          </button>
        </div>
        <div className="ovk-feed-switch">
          <button
            className={'ovk-feed-switch__btn' + (mode === 'all' ? ' active' : '')}
            onClick={() => setMode('all')}
          >
            Все
          </button>
          <button
            className={'ovk-feed-switch__btn' + (mode === 'friends' ? ' active' : '')}
            onClick={() => setMode('friends')}
          >
            Друзья
          </button>
        </div>
      </header>

      {loading ? (
        <div className="ovk-loading">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="ovk-empty">Нет записей</div>
      ) : (
        <div>
          {items.map((item, idx) => (
            <PostCard
              key={idx + '_' + (item.post_id || item.id || 0)}
              item={item}
              profiles={profiles}
              groups={groups}
              onLike={onLike}
              onRepost={onRepost}
              onOpenAuthor={(id) => {
                if (id > 0) onOpenUser(id);
                else onOpenGroup(-id);
              }}
            />
          ))}
        </div>
      )}

      <button className="ovk-fab" onClick={() => setComposeOpen(true)} title="Запись">
        +
      </button>

      {composeOpen ? (
        <ComposeWall
          meId={meId}
          onClose={() => setComposeOpen(false)}
          onPosted={onPosted}
          onError={onError}
        />
      ) : null}
    </div>
  );
}

function ComposeWall({
  meId,
  onClose,
  onPosted,
  onError,
}: {
  meId: number;
  onClose: () => void;
  onPosted: (item: FeedItem) => void;
  onError: (msg: string) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const post = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const res = await api<any>('wall.post', { message: text.trim() });
      const postIds = asList<{ id: number; owner_id: number }>(res);
      const pid = postIds.length ? postIds[0].id : typeof res === 'number' ? res : 0;
      onPosted({
        type: 'post',
        source_id: meId,
        owner_id: meId,
        date: Math.floor(Date.now() / 1000),
        text: text.trim(),
        post_id: pid,
        likes: { count: 0, user_likes: 0 },
        comments: { count: 0 },
        reposts: { count: 0 },
      });
    } catch (e: any) {
      onError(e?.message || 'Не удалось опубликовать');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ovk-compose">
      <div className="ovk-compose__header">
        <button className="ovk-header__action" onClick={onClose}>
          Отмена
        </button>
        <div className="ovk-header__title">Новая запись</div>
        <button
          className="ovk-header__action"
          onClick={post}
          disabled={busy || !text.trim()}
          style={{ fontWeight: 600, opacity: busy || !text.trim() ? 0.5 : 1 }}
        >
          {busy ? '...' : 'Готово'}
        </button>
      </div>
      <textarea
        placeholder="Что у вас нового?"
        value={text}
        onChange={(e: any) => setText(e.target.value)}
        autoFocus
      />
    </div>
  );
}
