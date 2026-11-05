import { useEffect, useState, useCallback } from 'react';
import { api, asList, UserProfile, resolveUser, FeedItem, enrichWallAuthors } from '../api';
import { PostCard } from '../components/PostCard';
import { WallComposer } from '../components/WallComposer';
import { useSwipe } from '../hooks/useSwipe';

interface Props {
  onOpenProfile: () => void;
  onOpenUser: (id: number) => void;
  onOpenGroup: (id: number) => void;
  onError: (msg: string) => void;
  meId: number;
}

export function FeedPanel({ onOpenProfile, onOpenUser, onOpenGroup, onError, meId }: Props) {
  const [mode, setMode] = useState<'all' | 'friends' | 'global'>('all');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextFrom, setNextFrom] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  const mergeAuthors = (its: FeedItem[], ps: UserProfile[], gs: any[]) => {
    enrichWallAuthors(its, ps, gs).then((r) => {
      setProfiles(r.profiles);
      setGroups(r.groups);
    });
  };

  const fetchPage = useCallback(
    async (append: boolean, startFrom?: string | null) => {
      const count = 30;
      if (mode === 'global') {
        const feed = await api<any>('newsfeed.getGlobal', {
          return_banned: 0,
          count,
          start_from: startFrom || undefined,
          fields: 'photo_100',
        });
        const its = asList<FeedItem>(feed);
        const ps: UserProfile[] = feed && !Array.isArray(feed) && Array.isArray(feed.profiles) ? feed.profiles : [];
        const gs: any[] = feed && !Array.isArray(feed) && Array.isArray(feed.groups) ? feed.groups : [];
        setItems((prev) => (append ? [...prev, ...its] : its));
        setProfiles((prev) => (append ? prev : ps));
        setGroups((prev) => (append ? prev : gs));
        setNextFrom(feed && !Array.isArray(feed) ? feed.next_from || null : null);
        mergeAuthors(append ? its : its, append ? [...profiles, ...ps] : ps, append ? [...groups, ...gs] : gs);
      } else if (mode === 'all') {
        const feed = await api<any>('newsfeed.get', {
          filters: 'post',
          return_banned: 0,
          count,
          start_from: startFrom || undefined,
          fields: 'photo_100',
        });
        const its = asList<FeedItem>(feed);
        const ps: UserProfile[] = feed && !Array.isArray(feed) && Array.isArray(feed.profiles) ? feed.profiles : [];
        const gs: any[] = feed && !Array.isArray(feed) && Array.isArray(feed.groups) ? feed.groups : [];
        setItems((prev) => (append ? [...prev, ...its] : its));
        setProfiles((prev) => (append ? prev : ps));
        setGroups((prev) => (append ? prev : gs));
        setNextFrom(feed && !Array.isArray(feed) ? feed.next_from || null : null);
        mergeAuthors(its, append ? [...profiles, ...ps] : ps, append ? [...groups, ...gs] : gs);
      } else {
        // Друзья: сначала пробуем одну ленту по source_ids, иначе собираем стены вручную
        const fr = await api<any>('friends.get', { count: 50, order: 'hints', fields: 'photo_100' });
        const friends = asList<UserProfile>(fr);
        const ids = friends.map((f) => f.id).filter(Boolean).slice(0, 50);
        let usedFeed = false;
        if (ids.length) {
          try {
            const feed = await api<any>('newsfeed.get', {
              filters: 'post',
              source_ids: ids.join(','),
              count,
              start_from: startFrom || undefined,
              fields: 'photo_100',
            });
            const its = asList<FeedItem>(feed);
            if (its.length) {
              const ps: UserProfile[] = feed && !Array.isArray(feed) && Array.isArray(feed.profiles) ? feed.profiles : [];
              const gs: any[] = feed && !Array.isArray(feed) && Array.isArray(feed.groups) ? feed.groups : [];
              setItems((prev) => (append ? [...prev, ...its] : its));
              setProfiles((prev) => (append ? prev : ps));
              setGroups((prev) => (append ? prev : gs));
              setNextFrom(feed && !Array.isArray(feed) ? feed.next_from || null : null);
              mergeAuthors(its, ps, gs);
              usedFeed = true;
            }
          } catch {}
        }
        if (!usedFeed) {
          const walls = await Promise.all(
            friends.slice(0, 15).map((f) =>
              api<any>('wall.get', { owner_id: String(f.id), count: 5, extended: 1, fields: 'photo_100' }).catch(() => null),
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
          const finalItems = merged.slice(0, 40);
          setItems(finalItems);
          const allP = [...friends, ...extraProfiles];
          setProfiles(allP);
          setGroups(extraGroups);
          setNextFrom(null);
          mergeAuthors(finalItems, allP, extraGroups);
        }
      }
    },
    [mode, onError],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await fetchPage(false, null);
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить ленту');
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
      await fetchPage(true, nextFrom);
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить ещё');
    } finally {
      setLoadingMore(false);
    }
  };

  const onLike = async (item: FeedItem) => {
    const liked = item.likes && item.likes.user_likes;
    const oid = item.owner_id != null ? item.owner_id : item.source_id;
    try {
      await api('likes.' + (liked ? 'delete' : 'add'), {
        type: 'post',
        owner_id: String(oid),
        item_id: String(item.post_id || item.id),
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

  const modes = ['all', 'friends', 'global'] as const;
  const swipe = useSwipe(
    () => {
      const i = modes.indexOf(mode);
      if (i < modes.length - 1) setMode(modes[i + 1]);
    },
    () => {
      const i = modes.indexOf(mode);
      if (i > 0) setMode(modes[i - 1]);
    },
  );

  return (
    <div className="ovk-page" {...swipe}>
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
          <button
            className={'ovk-feed-switch__btn' + (mode === 'global' ? ' active' : '')}
            onClick={() => setMode('global')}
          >
            Интересное
          </button>
        </div>
      </header>

      <div key={swipe.animKey} className={swipe.animClass}>
        {loading ? (
          <div className="ovk-loading">Загрузка...</div>
        ) : items.length === 0 ? (
          <div className="ovk-empty">Нет записей</div>
        ) : (
          <div>
            {items.map((item, idx) => (
              <PostCard
                key={String(item.source_id) + '_' + String(item.post_id || item.id || idx)}
                item={item}
                profiles={profiles}
                groups={groups}
                onLike={onLike}
                onRepost={onRepost}
                onError={onError}
                onOpenAuthor={(id) => {
                  if (id > 0) onOpenUser(id);
                  else onOpenGroup(-id);
                }}
              />
            ))}
            {nextFrom ? (
              <button className="ovk-more-btn" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Загрузка...' : 'Показать ещё'}
              </button>
            ) : null}
          </div>
        )}
      </div>

      <button className="ovk-fab" onClick={() => setComposeOpen(true)} title="Запись">
        +
      </button>

      {composeOpen ? (
        <WallComposer
          meId={meId}
          ownerId={meId}
          onClose={() => setComposeOpen(false)}
          onPosted={onPosted}
          onError={onError}
        />
      ) : null}
    </div>
  );
}
