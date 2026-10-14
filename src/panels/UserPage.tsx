import { useEffect, useState, useCallback } from 'react';
import { api, asList, UserProfile, FeedItem } from '../api';
import { PostCard } from '../components/PostCard';
import { WallComposer } from '../components/WallComposer';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const isMe = meId != null && meId === userId;

  const load = useCallback(async () => {
    setLoading(true);
    let prof: UserProfile | null = null;
    try {
      const users = await api<any>('users.get', {
        user_ids: String(userId),
        fields: 'photo_200,photo_400_orig,status,online,last_seen,counters,bdate,city,country,home_town,screen_name,relation',
      });
      const list = asList<UserProfile>(users);
      if (list.length) {
        prof = list[0];
        setUser(prof);
      }
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
        extended: 1,
        fields: 'photo_100',
      });
      setWall(asList<FeedItem>(w));
      const ps: UserProfile[] = Array.isArray(w && w.profiles) ? w.profiles.slice() : [];
      if (prof) ps.unshift(prof);
      setWallProfiles(ps);
      setWallGroups(w && !Array.isArray(w) && Array.isArray(w.groups) ? w.groups : []);
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
    const oid = item.owner_id != null ? item.owner_id : item.source_id;
    const iid = item.post_id || item.id;
    if (!iid) return;
    try {
      await api('likes.' + (liked ? 'delete' : 'add'), {
        type: 'post',
        owner_id: String(oid),
        item_id: String(iid),
      });
      setWall((prev) =>
        prev.map((it) => {
          if ((it.post_id || it.id) === iid && (it.owner_id != null ? it.owner_id : it.source_id) === oid) {
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
              <div style={{ display: 'flex', width: '100%', maxWidth: 320, marginTop: 16, alignItems: 'center' }}>
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
                  <button className="ovk-btn-secondary" style={{ flex: 1, marginLeft: 6 }} disabled>
                    Вы друзья
                  </button>
                ) : friendStatus === 4 ? (
                  <button className="ovk-btn-secondary" style={{ flex: 1, marginLeft: 6, opacity: 0.7 }} disabled>
                    Заявка
                  </button>
                ) : null}
                <button
                  className="ovk-icon-btn"
                  style={{ marginLeft: 6, flexShrink: 0 }}
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#818c99">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>
              </div>
            )}
            {menuOpen && !isMe ? (
              <div className="ovk-profile-menu">
                <div
                  className="ovk-profile-menu__item"
                  onClick={() => {
                    setMenuOpen(false);
                    onError('Отправка подарков пока недоступна');
                  }}
                >
                  Отправить подарок
                </div>
                {friendStatus === 1 || friendStatus === 2 ? (
                  <div
                    className="ovk-profile-menu__item ovk-profile-menu__item--danger"
                    onClick={() => {
                      setMenuOpen(false);
                      removeFriend();
                    }}
                  >
                    Удалить из друзей
                  </div>
                ) : null}
              </div>
            ) : null}
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
        <WallComposer
          meId={meId || userId}
          ownerId={userId}
          onClose={() => setComposeOpen(false)}
          onPosted={(newItem) => {
            setWall((prev) => [newItem, ...prev]);
            setComposeOpen(false);
          }}
          onError={onError}
          placeholder="Что у вас нового?"
        />
      ) : null}
    </div>
  );
}
