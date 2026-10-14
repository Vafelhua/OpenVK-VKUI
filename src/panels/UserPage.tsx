import { useEffect, useState, useCallback } from 'react';
import { api, asList, UserProfile, FeedItem } from '../api';
import { PostCard } from '../components/PostCard';
import { IconBack, IconMessages, IconHeart } from '../components/Icons';

interface Props {
  userId: number;
  meId?: number;
  onBack: () => void;
  onOpenChat: (peerId: number, title: string) => void;
  onOpenUser: (id: number) => void;
  onOpenGroup: (id: number) => void;
  onError: (msg: string) => void;
}

export function UserPage({
  userId,
  meId,
  onBack,
  onOpenChat,
  onOpenUser,
  onOpenGroup,
  onError,
}: Props) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wall, setWall] = useState<FeedItem[]>([]);
  const [wallProfiles, setWallProfiles] = useState<UserProfile[]>([]);
  const [wallGroups, setWallGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<number | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const isMe = meId != null && meId === userId;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const users = await api<any>('users.get', {
        user_ids: String(userId),
        fields: 'photo_200,photo_400_orig,status,online,last_seen,counters,bdate,city,country,home_town,screen_name,relation',
      });
      const list = asList<UserProfile>(users);
      if (list.length) setUser(list[0]);
    } catch (e: any) {
      onError(e?.message || 'Профиль недоступен');
    }
    try {
      const fr = await api<any>('friends.areFriends', {
        user_id: String(userId),
      });
      const st = fr && (fr.status !== undefined ? fr.status : (Array.isArray(fr) && fr[0] ? fr[0].status : undefined));
      if (typeof st === 'number') setFriendStatus(st);
    } catch {}
    try {
      const w = await api<any>('wall.get', {
        owner_id: String(userId),
        count: 20,
      });
      setWall(asList<FeedItem>(w));
      if (w && !Array.isArray(w)) {
        if (Array.isArray(w.profiles)) setWallProfiles(w.profiles);
        if (Array.isArray(w.groups)) setWallGroups(w.groups);
      }
    } catch {}
    setLoading(false);
  }, [userId, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const addFriend = async () => {
    try {
      await api('friends.add', { user_id: String(userId) });
      setFriendStatus(1);
    } catch (e: any) {
      onError(e?.message || 'Не удалось отправить заявку');
    }
  };

  const removeFriend = async () => {
    try {
      await api('friends.delete', { user_id: String(userId) });
      setFriendStatus(0);
    } catch (e: any) {
      onError(e?.message || 'Ошибка');
    }
  };

  const likePost = async (item: FeedItem) => {
    const liked = item.likes && item.likes.user_likes;
    try {
      await api('likes.' + (liked ? 'delete' : 'add'), {
        type: 'post',
        owner_id: item.source_id,
        item_id: item.post_id || item.id,
      });
      setWall((prev) =>
        prev.map((it) => {
          if ((it.post_id || it.id) === (item.post_id || item.id)) {
            const count = (it.likes?.count || 0) + (liked ? -1 : 1);
            return { ...it, likes: { count: Math.max(0, count), user_likes: liked ? 0 : 1 } };
          }
          return it;
        }),
      );
    } catch (e: any) {
      onError(e?.message || 'Ошибка');
    }
  };

  const name = user ? user.first_name + ' ' + user.last_name : 'Профиль';
  const online = !!(user && user.online);

  const onRepostWall = async (item: FeedItem) => {
    const oid = item.owner_id != null ? item.owner_id : item.source_id;
    const pid = item.post_id || item.id;
    try {
      await api('wall.repost', { object: 'wall' + oid + '_' + pid, message: '' });
      onError('Запись добавлена на вашу стену');
    } catch (e: any) {
      onError(e?.message || 'Не удалось сделать репост');
    }
  };

  const publish = async () => {
    const t = postText.trim();
    if (!t || posting) return;
    setPosting(true);
    try {
      const res = await api<any>('wall.post', { message: t });
      const ids = Array.isArray(res) ? res : res && Array.isArray(res.items) ? res.items : [];
      const pid = ids.length && ids[0] ? ids[0].id : typeof res === 'number' ? res : 0;
      setWall((prev) => [
        {
          type: 'post',
          source_id: userId,
          owner_id: userId,
          date: Math.floor(Date.now() / 1000),
          text: t,
          post_id: pid,
          likes: { count: 0, user_likes: 0 },
          comments: { count: 0 },
          reposts: { count: 0 },
        } as FeedItem,
        ...prev,
      ]);
      setPostText('');
      setComposeOpen(false);
    } catch (e: any) {
      onError(e?.message || 'Не удалось опубликовать');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="ovk-page" style={{ paddingBottom: 80 }}>
      <header className="ovk-header">
        <div className="ovk-header__row">
          <button className="ovk-header__action" onClick={onBack} style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
            <IconBack color="#2688eb" /> <span style={{ marginLeft: 4 }}>Назад</span>
          </button>
          <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center' }}>
            {user ? name : ''}
          </div>
          <div style={{ width: 70 }} />
        </div>
      </header>

      {loading && !user ? (
        <div className="ovk-loading">Загрузка...</div>
      ) : user ? (
        <>
          <div className="ovk-profile-card">
            <div style={{ position: 'relative' }}>
              {user.photo_200 || user.photo_100 ? (
                <img className="ovk-avatar ovk-avatar--lg" src={user.photo_200 || user.photo_100} alt="" />
              ) : (
                <div className="ovk-avatar ovk-avatar--lg" />
              )}
              {online ? (
                <div
                  style={{
                    position: 'absolute',
                    right: 4,
                    bottom: 4,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    background: '#4bb34b',
                    border: '2px solid #fff',
                  }}
                />
              ) : null}
            </div>
            <div className="ovk-profile-card__name">{name}</div>
            {online ? (
              <div className="ovk-profile-card__status" style={{ color: '#4bb34b' }}>
                в сети
              </div>
            ) : user.status ? (
              <div className="ovk-profile-card__status">{user.status}</div>
            ) : null}

            {isMe ? (
              <button
                className="ovk-btn-primary"
                style={{ width: '100%', maxWidth: 320, marginTop: 16 }}
                onClick={() => setComposeOpen(true)}
              >
                Написать на стене
              </button>
            ) : (
              <div style={{ display: 'flex', width: '100%', maxWidth: 320, marginTop: 16 }}>
                <button
                  className="ovk-btn-primary"
                  style={{ flex: 1, marginRight: 6 }}
                  onClick={() => onOpenChat(userId, name)}
                >
                  <IconMessages color="#fff" /> Сообщение
                </button>
                {friendStatus === null || friendStatus === 0 ? (
                  <button className="ovk-btn-secondary" style={{ flex: 1, marginLeft: 6 }} onClick={addFriend}>
                    <IconHeart color="#2688eb" /> В друзья
                  </button>
                ) : friendStatus === 1 || friendStatus === 2 ? (
                  <button className="ovk-btn-secondary" style={{ flex: 1, marginLeft: 6 }} onClick={removeFriend}>
                    Убрать
                  </button>
                ) : friendStatus === 4 ? (
                  <button className="ovk-btn-secondary" style={{ flex: 1, marginLeft: 6, opacity: 0.7 }} disabled>
                    Заявка
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {wall.length === 0 ? (
            <div className="ovk-empty">Нет записей на стене</div>
          ) : (
            wall.map((item, idx) => (
              <PostCard
                key={idx}
                item={item}
                profiles={wallProfiles}
                groups={wallGroups}
                onLike={likePost}
                onRepost={onRepostWall}
                onError={onError}
                onOpenAuthor={(id) => {
                  if (id > 0) onOpenUser(id);
                  else onOpenGroup(-id);
                }}
              />
            ))
          )}
        </>
      ) : (
        <div className="ovk-empty">Профиль не найден</div>
      )}

      {composeOpen ? (
        <div className="ovk-compose">
          <div className="ovk-compose__header">
            <button className="ovk-header__action" onClick={() => setComposeOpen(false)}>
              Отмена
            </button>
            <div className="ovk-header__title">Новая запись</div>
            <button
              className="ovk-header__action"
              onClick={publish}
              disabled={posting || !postText.trim()}
              style={{ fontWeight: 600, opacity: posting || !postText.trim() ? 0.5 : 1 }}
            >
              {posting ? '...' : 'Готово'}
            </button>
          </div>
          <textarea
            placeholder="Что у вас нового?"
            value={postText}
            onChange={(e: any) => setPostText(e.target.value)}
            autoFocus
          />
        </div>
      ) : null}
    </div>
  );
}
