import { useEffect, useState, useCallback } from 'react';
import { api, resolveUser, FeedItem, FeedResponse, UserProfile } from '../api';

interface Props {
  onOpenProfile: () => void;
  onError: (msg: string) => void;
}

function timeAgo(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return Math.floor(diff / 60) + ' мин';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `${hh}:${mm}`;
  const y = new Date(now.getTime() - 86400000);
  if (d.toDateString() === y.toDateString()) return 'вчера';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function linkify(text: string): any[] {
  const parts: any[] = [];
  const re = /(https?:\/\/[^\s<]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <a key={k++} href={m[0]} target="_blank" rel="noopener">
        {m[0]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function PostPhotos({ item }: { item: FeedItem }) {
  const photos: string[] = [];
  if (item.attachments) {
    for (const a of item.attachments) {
      if (a.type === 'photo' && a.photo) {
        const sizes = a.photo.sizes || [];
        let best = sizes.find((s: any) => s.type === 'x') || sizes[sizes.length - 1];
        if (best && best.url) photos.push(best.url);
      }
    }
  }
  if (!photos.length) return null;
  return (
    <div className={`ovk-post__photos${photos.length === 1 ? ' ovk-post__photos--1' : ''}`}>
      {photos.slice(0, 4).map((url, i) => (
        <img key={i} src={url} loading="lazy" alt="" />
      ))}
    </div>
  );
}

export function FeedPanel({ onOpenProfile, onError }: Props) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const feed = await api<FeedResponse>('newsfeed.get', {
        filters: 'post',
        return_banned: 0,
        count: 30,
        fields: 'photo_100',
      });
      if (feed) {
        setItems(feed.items || []);
        setProfiles(feed.profiles || []);
        setGroups(feed.groups || []);
      }
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить ленту');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
  };

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

  return (
    <div className="ovk-page">
      <header className="ovk-header">
        <div className="ovk-header__row">
          <div className="ovk-header__title">Новости</div>
          <button className="ovk-header__action" onClick={onOpenProfile}>
            Профиль
          </button>
        </div>
      </header>

      {loading ? (
        <div className="ovk-loading">Загрузка…</div>
      ) : items.length === 0 ? (
        <div className="ovk-empty">Нет новостей. Подпишитесь на кого-нибудь.</div>
      ) : (
        <div onWheel={undefined}>
          {refreshing && <div className="ovk-loading">Обновление…</div>}
          {items.map((item, idx) => {
            const author = resolveUser(item.source_id, profiles, groups);
            const key = `${item.source_id}_${item.post_id || item.id || idx}`;
            const isGroup = item.source_id < 0;
            return (
              <article className="ovk-post" key={key}>
                <div className="ovk-post__head">
                  {author.photo ? (
                    <img
                      className="ovk-avatar ovk-avatar--sm"
                      src={author.photo}
                      alt=""
                      onClick={isGroup ? undefined : onOpenProfile}
                    />
                  ) : (
                    <div className="ovk-avatar ovk-avatar--sm" />
                  )}
                  <div className="ovk-post__author">
                    {author.name}
                    <span>{timeAgo(item.date)}</span>
                  </div>
                </div>
                {item.text ? (
                  <div className="ovk-post__text">{linkify(item.text)}</div>
                ) : null}
                <PostPhotos item={item} />
                <div className="ovk-post__actions">
                  <button
                    className={item.likes?.user_likes ? 'liked' : ''}
                    onClick={() => onLike(item)}
                  >
                    {item.likes?.user_likes ? '♥' : '♡'} {item.likes?.count || 0}
                  </button>
                  <button>💬 {item.comments?.count || 0}</button>
                  <button>↗ {item.reposts?.count || 0}</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
