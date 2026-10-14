import { useState } from 'react';
import { UserProfile } from '../api';
import { IconBack } from '../components/Icons';

export type Theme = 'light' | 'dark';

interface Props {
  me: UserProfile | null;
  theme: Theme;
  setTheme: (t: Theme) => void;
  onBack: () => void;
  onLogout: () => void;
  onError: (msg: string) => void;
}

export function SettingsPanel({ me, theme, setTheme, onBack, onLogout, onError }: Props) {
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <div className="ovk-page">
      <header className="ovk-header">
        <div className="ovk-header__row">
          <button
            className="ovk-header__action"
            onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}
          >
            <IconBack color="#2688eb" /> <span style={{ marginLeft: 4 }}>Назад</span>
          </button>
          <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center' }}>
            Настройки
          </div>
          <div style={{ width: 70 }} />
        </div>
      </header>

      <div className="ovk-section-title">Аккаунт</div>
      {me ? (
        <div className="ovk-cell">
          {me.photo_100 ? (
            <img className="ovk-avatar" src={me.photo_100} alt="" />
          ) : (
            <div className="ovk-avatar" />
          )}
          <div className="ovk-cell__body">
            <div className="ovk-cell__title">
              {me.first_name} {me.last_name}
            </div>
            <div className="ovk-cell__subtitle">ID: {me.id}</div>
          </div>
        </div>
      ) : null}
      <div className="ovk-sep" />
      <div
        className="ovk-cell"
        onClick={() => {
          if (confirmLogout) {
            onLogout();
          } else {
            setConfirmLogout(true);
            setTimeout(() => setConfirmLogout(false), 3000);
          }
        }}
      >
        <div className="ovk-cell__body">
          <div className="ovk-cell__title" style={{ color: '#e64646' }}>
            {confirmLogout ? 'Точно выйти?' : 'Выйти из аккаунта'}
          </div>
        </div>
      </div>
      <div className="ovk-sep" />

      <div className="ovk-section-title">Приложение</div>
      <div className="ovk-cell">
        <div className="ovk-cell__body">
          <div className="ovk-cell__title">Тёмная тема</div>
        </div>
        <button
          className={'ovk-switch' + (theme === 'dark' ? ' on' : '')}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        />
      </div>
      <div className="ovk-sep" />
      <div className="ovk-cell">
        <div className="ovk-cell__body">
          <div className="ovk-cell__title">Версия</div>
        </div>
        <div className="ovk-cell__meta">1.0.0</div>
      </div>
      <div className="ovk-sep" />
      <div className="ovk-cell">
        <div className="ovk-cell__body">
          <div className="ovk-cell__title">API</div>
        </div>
        <div className="ovk-cell__meta">v5.106</div>
      </div>
      <div className="ovk-sep" />

      <div style={{ padding: 20, textAlign: 'center', color: '#818c99', fontSize: 13 }}>
        OpenVK VKUI · openvk.org
      </div>
    </div>
  );
}
