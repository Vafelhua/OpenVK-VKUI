import { useEffect, useState, useCallback } from 'react';
import { api, asList, UserProfile, setToken, getToken } from '../api';
import { IconBack } from '../components/Icons';

export type Theme = 'light' | 'dark';

interface Props {
  me: UserProfile | null;
  theme: Theme;
  setTheme: (t: Theme) => void;
  onBack: () => void;
  onLogout: () => void;
  onError: (msg: string) => void;
  onProfileChanged?: (firstName: string, lastName: string) => void;
}

type Sub = 'main' | 'edit' | 'blacklist';

export function SettingsPanel({ me, theme, setTheme, onBack, onLogout, onError }: Props) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [sub, setSub] = useState<Sub>('main');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [screenName, setScreenName] = useState('');
  const [status, setStatus] = useState('');
  const [homeTown, setHomeTown] = useState('');
  const [bdate, setBdate] = useState('');
  const [saving, setSaving] = useState(false);

  const [banned, setBanned] = useState<UserProfile[]>([]);
  const [loadingBan, setLoadingBan] = useState(false);

  useEffect(() => {
    if (me) {
      setFirstName(me.first_name || '');
      setLastName(me.last_name || '');
      setScreenName(me.screen_name || '');
      setStatus(me.status || '');
      setHomeTown('');
      setBdate('');
    }
  }, [me]);

  const loadProfile = useCallback(async () => {
    try {
      const info = await api<any>('account.getProfileInfo', {});
      if (info) {
        setFirstName(info.first_name || '');
        setLastName(info.last_name || '');
        setScreenName(info.screen_name || '');
        setStatus(info.status || '');
        setHomeTown(info.home_town || '');
        setBdate(info.bdate && info.bdate !== '01.01.1970' ? info.bdate : '');
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (sub === 'edit') loadProfile();
    if (sub === 'blacklist') {
      setLoadingBan(true);
      api<any>('account.getBanned', { count: 100, fields: 'photo_100,first_name,last_name' })
        .then((d) => setBanned(asList<UserProfile>(d)))
        .catch((e: any) => onError(e?.message || 'Чёрный список недоступен'))
        .finally(() => setLoadingBan(false));
    }
  }, [sub, loadProfile, onError]);

  const saveProfile = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const params: Record<string, any> = {};
      if (firstName.trim()) params.first_name = firstName.trim();
      if (lastName.trim()) params.last_name = lastName.trim();
      if (screenName.trim()) params.screen_name = screenName.trim();
      if (status) params.status = status;
      if (homeTown.trim()) params.home_town = homeTown.trim();
      if (bdate.trim()) params.bdate = bdate.trim();
      const res = await api<any>('account.saveProfileInfo', params);
      if (res && res.changed) {
        onError('Профиль обновлён');
        if (me) {
          try {
            localStorage.setItem('ovk_me_name', firstName + ' ' + lastName);
          } catch {}
        }
      } else {
        onError('Изменения не применены');
      }
      setSub('main');
    } catch (e: any) {
      onError(e?.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const unban = async (id: number) => {
    try {
      await api('account.unban', { owner_id: String(id) });
      setBanned((p) => p.filter((x) => x.id !== id));
      onError('Пользователь разблокирован');
    } catch (e: any) {
      onError(e?.message || 'Ошибка');
    }
  };

  if (sub === 'edit') {
    return (
      <div className="ovk-page">
        <header className="ovk-header">
          <div className="ovk-header__row">
            <button className="ovk-header__action" onClick={() => setSub('main')} style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
              <IconBack color="#2688eb" /> <span style={{ marginLeft: 4 }}>Назад</span>
            </button>
            <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center' }}>
              Редактировать профиль
            </div>
            <div style={{ width: 70 }} />
          </div>
        </header>

        <div style={{ padding: 12 }}>
          {[
            ['Имя', firstName, setFirstName, 'Иван'],
            ['Фамилия', lastName, setLastName, 'Иванов'],
            ['Ссылка (screen_name)', screenName, setScreenName, 'ivan'],
            ['Статус', status, setStatus, 'В настроении'],
            ['Город', homeTown, setHomeTown, 'Москва'],
            ['Дата рождения (Д.М.ГГГГ)', bdate, setBdate, '01.01.1990'],
          ].map(([label, value, setter, ph]: any) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: '#818c99', marginBottom: 6 }}>{label}</div>
              <input
                value={value}
                placeholder={ph}
                onChange={(e: any) => setter(e.target.value)}
                className="ovk-login__field"
                style={{ width: '100%' }}
              />
            </div>
          ))}
          <button
            className="ovk-btn-primary"
            style={{ width: '100%', opacity: saving ? 0.6 : 1 }}
            onClick={saveProfile}
            disabled={saving}
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    );
  }

  if (sub === 'blacklist') {
    return (
      <div className="ovk-page">
        <header className="ovk-header">
          <div className="ovk-header__row">
            <button className="ovk-header__action" onClick={() => setSub('main')} style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
              <IconBack color="#2688eb" /> <span style={{ marginLeft: 4 }}>Назад</span>
            </button>
            <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center' }}>
              Чёрный список
            </div>
            <div style={{ width: 70 }} />
          </div>
        </header>
        {loadingBan ? (
          <div className="ovk-loading">Загрузка...</div>
        ) : banned.length === 0 ? (
          <div className="ovk-empty">Чёрный список пуст</div>
        ) : (
          banned.map((b) => (
            <div key={b.id} className="ovk-cell">
              {b.photo_100 ? (
                <img className="ovk-avatar" src={b.photo_100} alt="" />
              ) : (
                <div className="ovk-avatar" />
              )}
              <div className="ovk-cell__body">
                <div className="ovk-cell__title">
                  {b.first_name} {b.last_name}
                </div>
              </div>
              <button
                className="ovk-btn-secondary"
                style={{ height: 32, fontSize: 14, padding: '0 12px' }}
                onClick={() => unban(b.id)}
              >
                Разблокировать
              </button>
            </div>
          ))
        )}
      </div>
    );
  }

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
      <div className="ovk-cell" onClick={() => setSub('edit')}>
        <div className="ovk-cell__body">
          <div className="ovk-cell__title">Редактировать профиль</div>
        </div>
        <div className="ovk-cell__meta">›</div>
      </div>
      <div className="ovk-sep" />
      <div className="ovk-cell" onClick={() => setSub('blacklist')}>
        <div className="ovk-cell__body">
          <div className="ovk-cell__title">Чёрный список</div>
        </div>
        <div className="ovk-cell__meta">›</div>
      </div>
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
        <div className="ovk-cell__meta">1.1.0</div>
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
