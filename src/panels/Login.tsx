import { useState, FormEvent } from 'react';
import { login } from '../api';

interface Props {
  onAuth: () => void;
  onError: (msg: string) => void;
}

export function LoginPanel({ onAuth, onError }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password || busy) return;
    setBusy(true);
    setError('');
    try {
      await login(username.trim(), password);
      onAuth();
    } catch (err: any) {
      const msg = err?.message || 'РћС€РёР±РєР° РІС…РѕРґР°';
      setError(msg);
      onError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ovk-login">
      <div className="ovk-login__logo">VK</div>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 320 }}>
        <input
          className="ovk-login__field"
          placeholder="РўРµР»РµС„РѕРЅ РёР»Рё РїРѕС‡С‚Р°"
          value={username}
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="email"
          name="username"
          autoComplete="username"
          onChange={(e: any) => setUsername(e.target.value)}
        />
        <input
          className="ovk-login__field"
          placeholder="РџР°СЂРѕР»СЊ"
          type="password"
          value={password}
          name="password"
          autoComplete="current-password"
          onChange={(e: any) => setPassword(e.target.value)}
        />
        <div className="ovk-login__error">{error}</div>
        <button className="ovk-login__btn" type="submit" disabled={busy || !username || !password}>
          {busy ? 'Р’С…РѕРґвЂ¦' : 'Р’РѕР№С‚Рё'}
        </button>
      </form>
      <button
        className="ovk-login__link"
        type="button"
        onClick={() => {
          window.open('https://openvk.org/login?forgot_password=1', '_blank');
        }}
      >
        Р—Р°Р±С‹Р»Рё РїР°СЂРѕР»СЊ?
      </button>
      <button
        className="ovk-login__link"
        type="button"
        onClick={() => {
          window.open('https://openvk.org/enter?reg=1', '_blank');
        }}
      >
        РЎРѕР·РґР°С‚СЊ Р°РєРєР°СѓРЅС‚
      </button>
    </div>
  );
}
