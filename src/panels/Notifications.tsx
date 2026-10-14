import { useEffect, useState, useCallback } from 'react';
import { api, asList, UserProfile } from '../api';
import { IconBack } from '../components/Icons';

interface Notif {
  type: string;
  date: number;
  from_id?: number;
  photo?: string;
  text?: string;
  item_id?: number;
  parent?: string;
}

interface Props {
  onBack: () => void;
  onOpenUser: (id: number) => void;
  onOpenGroup: (id: number) => void;
  onError: (msg: string) => void;
}

function fmtDate(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return Math.floor(diff / 60) + ' мин назад';
  if (d.toDateString() === now.toDateString()) {
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0');
}

function describe(n: Notif): string {
  switch (n.type) {
    case 'like': return 'вашу запись';
    case 'comment': return 'вашу запись';
    case 'reply': return 'ваш комментарий';
    case 'mention': return 'упомянул вас';
    case 'wall_post': return 'опубликовал запись на вашей стене';
    case 'friend': return 'добавил(а) вас в друзья';
    case 'group_join': return 'вступил(а) в вашу группу';
    case 'group_leave': return 'покинул(а) вашу группу';
    case 'follow': return 'подписался(ась) на вас';
    case 'invite': return 'пригласил(а) вас в группу';
    case 'post_publish': return 'опубликовал(а) запись';
    default: return n.type;
  }
}

export function NotificationsPanel({ onBack, onOpenUser, onOpenGroup, onError }: Props) {
  const [items, setItems] = useState<Notif[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<any>('notifications.get', {
        count: 50,
        start_time: Math.floor(Date.now() / 1000) - 7 * 86400,
        fields: 'photo_50,photo_100,first_name,last_name',
      });
      setItems(asList<Notif>(data));
      if (data && !Array.isArray(data)) {
        if (Array.isArray(data.profiles)) setProfiles(data.profiles);
        if (Array.isArray(data.groups)) setGroups(data.groups);
      }
      api('notifications.markAsViewed', {}).catch(() => {});
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить уведомления');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = (id?: number) => {
    if (!id || id > 0) {
      const p = profiles.find((x) => x.id === id);
      return p ? { name: p.first_name + ' ' + p.last_name, photo: p.photo_100 } : { name: 'Кто-то' };
    }
    const g = groups.find((x) => x.id === -id);
    return g ? { name: g.name, photo: g.photo_100 } : { name: 'Сообщество' };
  };

  return (
    <div className="ovk-page">
      <header className="ovk-header">
        <div className="ovk-header__row">
          <button className="ovk-header__action" onClick={onBack} style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
            <IconBack color="#2688eb" /> <span style={{ marginLeft: 4 }}>Назад</span>
          </button>
          <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center' }}>
            Уведомления
          </div>
          <div style={{ width: 70 }} />
        </div>
      </header>

      {loading ? (
        <div className="ovk-loading">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="ovk-empty">Нет уведомлений</div>
      ) : (
        items.map((n, idx) => {
          const who = resolve(n.from_id);
          return (
            <div
              key={idx}
              className="ovk-cell"
              onClick={() => {
                if (!n.from_id) return;
                if (n.from_id > 0) onOpenUser(n.from_id);
                else onOpenGroup(-n.from_id);
              }}
            >
              {who.photo ? (
                <img className="ovk-avatar" src={who.photo} alt="" />
              ) : (
                <div className="ovk-avatar" />
              )}
              <div className="ovk-cell__body">
                <div className="ovk-cell__title" style={{ fontWeight: 600 }}>
                  {who.name}
                </div>
                <div className="ovk-cell__subtitle">{describe(n)}</div>
                {n.text ? (
                  <div className="ovk-cell__subtitle" style={{ color: '#818c99', marginTop: 2 }}>
                    «{n.text.slice(0, 80)}»
                  </div>
                ) : null}
              </div>
              <div className="ovk-cell__meta" style={{ fontSize: 12 }}>
                {fmtDate(n.date)}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
