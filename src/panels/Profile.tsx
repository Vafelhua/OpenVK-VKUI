import { api, UserProfile } from '../api';
import { IconBack } from '../components/Icons';

interface Props {
  me: UserProfile | null;
  onLogout: () => void;
  onError: (msg: string) => void;
}

export function ProfilePanel({ me, onLogout, onError }: Props) {
  const rows: { label: string; href?: string; action?: () => void; danger?: boolean }[] = [
    {
      label: 'Моя страница',
      href: me?.screen_name ? 'https://openvk.org/' + me.screen_name : undefined,
    },
    { label: 'Выйти', action: onLogout, danger: true },
  ];

  return (
    <div className="ovk-page">
      <header className="ovk-header">
        <div className="ovk-header__row">
          <div className="ovk-header__title">Ещё</div>
        </div>
      </header>

      {me ? (
        <div className="ovk-profile-card">
          {me.photo_200 || me.photo_100 ? (
            <img className="ovk-avatar ovk-avatar--lg" src={me.photo_200 || me.photo_100} alt="" />
          ) : (
            <div className="ovk-avatar ovk-avatar--lg" />
          )}
          <div className="ovk-profile-card__name">
            {me.first_name} {me.last_name}
          </div>
          {me.status ? <div className="ovk-profile-card__status">{me.status}</div> : null}
        </div>
      ) : (
        <div className="ovk-loading">Загрузка профиля...</div>
      )}

      <div className="ovk-section-title">OpenVK</div>
      {rows.map((r, i) => (
        <div key={i}>
          <div
            className="ovk-cell"
            onClick={() => {
              if (r.href) window.open(r.href, '_blank');
              if (r.action) r.action();
            }}
          >
            <div className="ovk-cell__body">
              <div
                className="ovk-cell__title"
                style={r.danger ? { color: '#e64646' } : undefined}
              >
                {r.label}
              </div>
            </div>
            <div className="ovk-cell__meta">›</div>
          </div>
          <div className="ovk-sep" />
        </div>
      ))}

      <div style={{ padding: 20, textAlign: 'center', color: '#818c99', fontSize: 13 }}>
        OpenVK VKUI · API v5.106 · openvk.org
      </div>
    </div>
  );
}
