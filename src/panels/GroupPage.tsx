import { useEffect, useState, useCallback } from 'react';
import { api, asList, UserProfile, FeedItem, enrichWallAuthors } from '../api';
import { PostCard } from '../components/PostCard';
import { WallComposer } from '../components/WallComposer';
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [tab, setTab] = useState<'wall' | 'board' | 'market'>('wall');
  const [topics, setTopics] = useState<any[]>([]);
  const [goods, setGoods] = useState<any[]>([]);
  const [loadingTab, setLoadingTab] = useState(false);
  const [openTopic, setOpenTopic] = useState<{ id: number; title: string } | null>(null);
  const [topicComments, setTopicComments] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    let ginfo: GroupFull | null = null;
    try {
      const g = await api<any>('groups.getById', {
        group_id: String(groupId),
        fields: 'description,members_count,site,status,photo_200',
      });
      const list = asList<GroupFull>(g);
      if (list.length) {
        ginfo = list[0];
        setGroup(ginfo);
      }
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
      const mine = await api<any>('groups.get', {
        extended: 1,
        count: 1000,
        fields: 'photo_100',
      });
      const arr = asList<any>(mine);
      const mineG = arr.find((x: any) => x.id === groupId);
      if (mineG) {
        setMemberStatus(1);
        setIsAdmin(!!mineG.is_admin);
      }
    } catch {}
    try {
      const w = await api<any>('wall.get', {
        owner_id: String(-groupId),
        count: 20,
        extended: 1,
        fields: 'photo_100',
      });
      const items = asList<FeedItem>(w);
      setWall(items);
      const ps: any[] = w && !Array.isArray(w) && Array.isArray(w.profiles) ? w.profiles.slice() : [];
      const gs: any[] = w && !Array.isArray(w) && Array.isArray(w.groups) ? w.groups.slice() : [];
      if (ginfo && !gs.some((x: any) => x.id === groupId)) {
        gs.push({
          id: ginfo.id,
          name: ginfo.name,
          photo_100: ginfo.photo_100,
          photo_200: ginfo.photo_200,
        });
      }
      setWallProfiles(ps);
      setWallGroups(gs);
      enrichWallAuthors(items, ps, gs).then(({ profiles, groups }) => {
        setWallProfiles(profiles);
        setWallGroups(groups);
      });
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

  const switchTab = async (t: 'wall' | 'board' | 'market') => {
    setTab(t);
    if (t === 'board' && topics.length === 0) {
      setLoadingTab(true);
      try {
        const data = await api<any>('board.getTopics', {
          group_id: String(groupId),
          count: 50,
        });
        setTopics(asList<any>(data));
      } catch (e: any) {
        onError(e?.message || 'Обсуждения недоступны');
      } finally {
        setLoadingTab(false);
      }
    }
    if (t === 'market' && goods.length === 0) {
      setLoadingTab(true);
      try {
        const data = await api<any>('market.get', {
          owner_id: String(-groupId),
          count: 50,
        });
        setGoods(asList<any>(data));
      } catch (e: any) {
        onError(e?.message || 'Товары недоступны');
      } finally {
        setLoadingTab(false);
      }
    }
  };

  const openTopicComments = async (t: any) => {
    setOpenTopic({ id: t.id, title: t.title });
    setLoadingTab(true);
    try {
      const data = await api<any>('board.getComments', {
        group_id: String(groupId),
        topic_id: String(t.id),
        count: 50,
      });
      setTopicComments(asList<any>(data));
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить обсуждение');
    } finally {
      setLoadingTab(false);
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

            {memberStatus === 1 || isAdmin ? (
              <div style={{ width: '100%', maxWidth: 320, marginTop: 16 }}>
                {isAdmin ? (
                  <div className="ovk-profile-card__status" style={{ color: '#2688eb', marginBottom: 8 }}>
                    Вы администратор
                  </div>
                ) : (
                  <div className="ovk-profile-card__status" style={{ color: '#4bb34b', marginBottom: 8 }}>
                    Вы подписаны
                  </div>
                )}
                <button
                  className="ovk-btn-secondary"
                  style={{ width: '100%' }}
                  onClick={leave}
                >
                  Отписаться
                </button>
              </div>
            ) : (
              <button
                className="ovk-btn-primary"
                style={{ width: '100%', maxWidth: 320, marginTop: 16 }}
                onClick={join}
              >
                Подписаться
              </button>
            )}

            {isAdmin ? (
              <button
                className="ovk-btn-primary"
                style={{ width: '100%', maxWidth: 320, marginTop: 8 }}
                onClick={() => setComposeOpen(true)}
              >
                Написать на стене
              </button>
            ) : null}
          </div>

          {group.description ? (
            <div style={{ background: '#fff', padding: '12px 16px', borderBottom: '0.5px solid var(--ovk-sep)', fontSize: 15, lineHeight: '20px', color: '#000' }}>
              {group.description}
            </div>
          ) : null}

          <div className="ovk-feed-switch" style={{ margin: '8px 12px 0' }}>
            {(
              [
                ['wall', 'Стена'],
                ['board', 'Обсуждения'],
                ['market', 'Товары'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                className={'ovk-feed-switch__btn' + (tab === id ? ' active' : '')}
                onClick={() => switchTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {openTopic ? (
            <>
              <div
                className="ovk-cell"
                onClick={() => setOpenTopic(null)}
                style={{ background: '#f5f5f7' }}
              >
                <div className="ovk-cell__body">
                  <div className="ovk-cell__title" style={{ color: '#2688eb', fontWeight: 600 }}>
                    ‹ Обсуждения
                  </div>
                </div>
              </div>
              <div className="ovk-section-title">{openTopic.title}</div>
              {loadingTab ? (
                <div className="ovk-loading">Загрузка…</div>
              ) : topicComments.length === 0 ? (
                <div className="ovk-empty">Нет комментариев</div>
              ) : (
                topicComments.map((c: any, i: number) => (
                  <div key={i} className="ovk-cell" style={{ alignItems: 'flex-start' }}>
                    <div className="ovk-cell__body">
                      <div className="ovk-cell__title" style={{ fontWeight: 600 }}>
                        {c.from_id > 0 ? '#' + c.from_id : 'Участник'}
                      </div>
                      <div className="ovk-cell__subtitle" style={{ whiteSpace: 'pre-wrap' }}>
                        {c.text}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          ) : tab === 'board' ? (
            loadingTab ? (
              <div className="ovk-loading">Загрузка…</div>
            ) : topics.length === 0 ? (
              <div className="ovk-empty">Нет обсуждений</div>
            ) : (
              topics.map((t: any) => (
                <div key={t.id} className="ovk-cell" onClick={() => openTopicComments(t)}>
                  <div className="ovk-cell__body">
                    <div className="ovk-cell__title" style={{ fontWeight: 600 }}>
                      {t.title}
                    </div>
                    <div className="ovk-cell__subtitle">
                      {t.comments != null ? t.comments + ' комментариев' : 'Обсуждение'}
                    </div>
                  </div>
                  <div className="ovk-cell__meta">›</div>
                </div>
              ))
            )
          ) : tab === 'market' ? (
            loadingTab ? (
              <div className="ovk-loading">Загрузка…</div>
            ) : goods.length === 0 ? (
              <div className="ovk-empty">Нет товаров</div>
            ) : (
              goods.map((g: any) => (
                <div key={g.id} className="ovk-cell" style={{ alignItems: 'flex-start' }}>
                  {g.photo_1256x256 || g.photo_350x350 ? (
                    <img
                      src={g.photo_1256x256 || g.photo_350x350}
                      alt=""
                      style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                    />
                  ) : null}
                  <div className="ovk-cell__body">
                    <div className="ovk-cell__title" style={{ fontWeight: 600 }}>
                      {g.title}
                    </div>
                    {g.price ? (
                      <div className="ovk-cell__subtitle" style={{ color: '#2688eb', fontWeight: 600 }}>
                        {typeof g.price === 'object' ? (g.price.text || g.price.amount) : g.price}
                      </div>
                    ) : null}
                    {g.description ? (
                      <div className="ovk-cell__subtitle">{String(g.description).slice(0, 80)}</div>
                    ) : null}
                  </div>
                </div>
              ))
            )
          ) : wall.length === 0 ? (
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

      {composeOpen ? (
        <WallComposer
          meId={0}
          ownerId={-groupId}
          onClose={() => setComposeOpen(false)}
          onPosted={(newItem) => {
            setWall((prev) => [newItem, ...prev]);
            setComposeOpen(false);
          }}
          onError={onError}
          placeholder="Что нового в сообществе?"
        />
      ) : null}
    </div>
  );
}
