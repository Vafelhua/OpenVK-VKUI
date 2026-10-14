import { useEffect, useState, useCallback } from 'react';
import { api, FeedItem, FeedResponse, UserProfile } from '../api';
import { PostCard } from '../components/PostCard';

interface Props {
  onOpenProfile: () => void;
  onOpenUser: (id: number) => void;
  onOpenGroup: (id: number) => void;
  onError: (msg: string) => void;
}

export function FeedPanel({ onOpenProfile, onOpenUser, onOpenGroup, onError }: Props) {
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
          <button className="ovk-header__action" onClick={() => load()}>
            Обновить
          </button>
        </div>
      </header>

      {loading ? (
        <div className="ovk-loading">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="ovk-empty">Нет новостей</div>
      ) : (
        <div>
          {refreshing && <div className="ovk-loading">Обновление...</div>}
          {items.map((item, idx) => (
            <PostCard
              key={idx}
              item={item}
              profiles={profiles}
              groups={groups}
              onLike={onLike}
              onOpenAuthor={(id) => {
                if (id > 0) onOpenUser(id);
                else onOpenGroup(-id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
