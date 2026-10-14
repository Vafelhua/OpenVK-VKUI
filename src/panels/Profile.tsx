import { api, UserProfile } from '../api';
import { IconBack } from '../components/Icons';

interface Props {
  me: UserProfile | null;
  onOpenMyPage: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onError: (msg: string) => void;
}

export function ProfilePanel({ me, onOpenMyPage, onOpenSettings, onLogout, onError }: Props) {
  return (
    <div className="ovk-page">
      <header className="ovk-header">
        <div className="ovk-header__row">
          <div className="ovk-header__title">Ещё</div>
        </div>
      </header>

      {me ? (
        <div className="ovk-profile-card" onClick={onOpenMyPage} style={{ cursor: 'pointer' }}>
          {me.photo_200 || me.photo_100 ? (
            <img className="ovk-avatar ovk-avatar--lg" src={me.photo_200 || me.photo_100} alt="" />
          ) : (
            <div className="ovk-avatar ovk-avatar--lg" />
          )}
          <div className="ovk-profile-card__name">
            {me.first_name} {me.last_name}
          </div>
          {me.status ? <div className="ovk-profile-card__status">{me.status}</div> : null}
          <div className="ovk-profile-card__status" style={{ color: '#2688eb', marginTop: 8 }}>
            Моя страница
          </div>
        </div>
      ) : (
        <div className="ovk-loading">Загрузка профиля...</div>
      )}

      <div className="ovk-section-title">OpenVK</div>
      <div className="ovk-cell" onClick={onOpenMyPage}>
        <div className="ovk-cell__body">
          <div className="ovk-cell__title">Моя страница</div>
        </div>
        <div className="ovk-cell__meta">›</div>
      </div>
      <div className="ovk-sep" />
      <div className="ovk-cell" onClick={onOpenSettings}>
        <div className="ovk-cell__body">
          <div className="ovk-cell__title">Настройки</div>
        </div>
        <div className="ovk-cell__meta">›</div>
      </div>
      <div className="ovk-sep" />
      <div className="ovk-cell" onClick={onLogout}>
        <div className="ovk-cell__body">
          <div className="ovk-cell__title" style={{ color: '#e64646' }}>
            Выйти
          </div>
        </div>
      </div>
      <div className="ovk-sep" />

      <div style={{ padding: 20, textAlign: 'center', color: '#818c99', fontSize: 13 }}>
        OpenVK VKUI · API v5.106 · openvk.org
      </div>
    </div>
  );
}
