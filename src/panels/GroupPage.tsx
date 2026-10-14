import { useEffect, useState, useCallback } from 'react';
import { api, asList, UserProfile, FeedItem } from '../api';
import { PostCard } from '../components/PostCard';
import { IconBack } from '../components/Icons';

interface GroupFull {
  id: number;
  name: string;
  screen_name?: string;
  photo_100?: string;
  photo_200?: string;
  status?: string;
  description?: string;
  members_count?: number;
  is_closed?: number;
  type?: string;
  site?: string;
}

interface Props {
  groupId: number;
  onBack: () => void;
  onOpenUser: (id: number) => void;
  onOpenGroup: (id: number) => void;
  onError: (msg: string) => void;
}

export function GroupPage({ groupId, onBack, onOpenUser, onOpenGroup, onError }: Props) {
  const [group, setGroup] = useState<GroupFull | null>(null);
  const [wall, setWall] = useState<FeedItem[]>([]);
  const [wallProfiles, setWallProfiles] = useState<UserProfile[]>([]);
  const [wallGroups, setWallGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberStatus, setMemberStatus] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const g = await api<any>('groups.getById', {
        group_id: String(groupId),
        fields: 'description,members_count,site,status,photo_200',
      });
      const list = asList<GroupFull>(g);
      if (list.length) setGroup(list[0]);
    } catch (e: any) {
      onError(e?.message || 'Сообщество недоступно');
    }
    try {
      const m = await api<any>('groups.isMember', {
        group_id: String(groupId),
      });
      const st = m && (m.member_status !== undefined ? m.member_status : m.status);
      if (typeof st === 'number') setMemberStatus(st);
    } catch {}
    try {
      const w = await api<any>('wall.get', {
        owner_id: String(-groupId),
        count: 20,
      });
      setWall(asList<FeedItem>(w));
      if (w && !Array.isArray(w)) {
        if (Array.isArray(w.profiles)) setWallProfiles(w.profiles);
        if (Array.isArray(w.groups)) setWallGroups(w.groups);
      }
    } catch {}
    setLoading(false);
  }, [groupId, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const join = async () => {
    try {
      await api('groups.join', { group_id: String(groupId) });
      setMemberStatus(1);
      if (group && group.members_count != null) {
        setGroup({ ...group, members_count: group.members_count + 1 });
      }
    } catch (e: any) {
      onError(e?.message || 'Не удалось вступить');
    }
  };

  const leave = async () => {
    try {
      await api('groups.leave', { group_id: String(groupId) });
      setMemberStatus(0);
      if (group && group.members_count != null) {
        setGroup({ ...group, members_count: Math.max(0, group.members_count - 1) });
      }
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

  const fmt = (n?: number) =>
    n != null ? new Intl.NumberFormat('ru-RU').format(n) : '';

  return (
    <div className="ovk-page" style={{ paddingBottom: 80 }}>
      <header className="ovk-header">
        <div className="ovk-header__row">
          <button className="ovk-header__action" onClick={onBack} style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
            <IconBack color="#2688eb" /> <span style={{ marginLeft: 4 }}>Назад</span>
          </button>
          <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center' }}>
            {group ? group.name : ''}
          </div>
          <div style={{ width: 70 }} />
        </div>
      </header>

      {loading && !group ? (
        <div className="ovk-loading">Загрузка…</div>
      ) : group ? (
        <>
          <div className="ovk-profile-card">
            {group.photo_200 || group.photo_100 ? (
              <img
                className="ovk-avatar ovk-avatar--lg"
                src={group.photo_200 || group.photo_100}
                alt=""
                style={{ borderRadius: 12 }}
              />
            ) : (
              <div className="ovk-avatar ovk-avatar--lg" style={{ borderRadius: 12 }} />
            )}
            <div className="ovk-profile-card__name">{group.name}</div>
            {group.members_count != null ? (
              <div className="ovk-profile-card__status">{fmt(group.members_count)} участников</div>
            ) : null}
            {group.status ? (
              <div className="ovk-profile-card__status" style={{ marginTop: 6 }}>
                {group.status}
              </div>
            ) : null}

            {memberStatus === 0 || memberStatus === null ? (
              <button
                className="ovk-btn-primary"
                style={{ width: '100%', maxWidth: 320, marginTop: 16 }}
                onClick={join}
              >
                Подписаться
              </button>
            ) : (
              <button
                className="ovk-btn-secondary"
                style={{ width: '100%', maxWidth: 320, marginTop: 16 }}
                onClick={leave}
              >
                Вы подписаны
              </button>
            )}
          </div>

          {group.description ? (
            <div style={{ background: '#fff', padding: '12px 16px', borderBottom: '0.5px solid var(--ovk-sep)', fontSize: 15, lineHeight: '20px', color: '#000' }}>
              {group.description}
            </div>
          ) : null}

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
                onOpenAuthor={(id) => {
                  if (id > 0) onOpenUser(id);
                  else onOpenGroup(-id);
                }}
              />
            ))
          )}
        </>
      ) : (
        <div className="ovk-empty">Сообщество не найдено</div>
      )}
    </div>
  );
}
