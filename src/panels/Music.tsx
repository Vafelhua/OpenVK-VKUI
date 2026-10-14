import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api';
import { IconSearch, IconPlay, IconPause, IconClose, IconNote } from '../components/Icons';

interface Props {
  onError: (msg: string) => void;
}

interface Audio {
  id: number;
  owner_id: number;
  artist: string;
  title: string;
  duration: number;
  url?: string;
  genre?: string;
}

const audio = typeof Audio !== 'undefined' ? new Audio() : (null as any);

function fmtDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function MusicPanel({ onError }: Props) {
  const [tab, setTab] = useState<'catalog' | 'mine' | 'search'>('catalog');
  const [catalog, setCatalog] = useState<Audio[]>([]);
  const [mine, setMine] = useState<Audio[]>([]);
  const [q, setQ] = useState('');
  const [searchRes, setSearchRes] = useState<Audio[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<Audio | null>(null);
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audio) {
      playerRef.current = audio;
      const onEnd = () => setPlaying(false);
      const onPause = () => setPlaying(false);
      const onPlay = () => setPlaying(true);
      audio.addEventListener('ended', onEnd);
      audio.addEventListener('pause', onPause);
      audio.addEventListener('play', onPlay);
      return () => {
        audio.removeEventListener('ended', onEnd);
        audio.removeEventListener('pause', onPause);
        audio.removeEventListener('play', onPlay);
      };
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      let items: Audio[] = [];
      try {
        const rec = await api<{ items: Audio[] }>('audio.getRecommendations', { count: 50 });
        if (rec && rec.items && rec.items.length) items = rec.items;
      } catch {}
      if (!items.length) {
        try {
          const cat = await api<any>('audio.getCatalog', { count: 50 });
          if (cat && cat.items) {
            for (const sect of cat.items) {
              if (sect.playlists) {
                for (const pl of sect.playlists) {
                  if (pl.owner_id != null && pl.id != null) {
                    try {
                      const auds = await api<{ items: Audio[] }>('audio.get', {
                        owner_id: pl.owner_id,
                        album_id: pl.id,
                        count: 20,
                      });
                      if (auds && auds.items) items.push(...auds.items);
                    } catch {}
                  }
                }
              }
              if (sect.audio) items.push(sect.audio);
            }
          }
        } catch {}
      }
      setCatalog(items.slice(0, 100));
    } catch (e: any) {
      onError(e?.message || 'Музыка недоступна');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const loadMine = useCallback(async () => {
    try {
      const data = await api<{ items: Audio[] }>('audio.get', { count: 100 });
      if (data && data.items) setMine(data.items);
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить аудио');
    }
  }, [onError]);

  useEffect(() => {
    if (tab === 'catalog' && catalog.length === 0 && !loading) loadCatalog();
    if (tab === 'mine' && mine.length === 0) loadMine();
  }, [tab, catalog.length, mine.length, loading, loadCatalog, loadMine]);

  useEffect(() => {
    if (tab === 'catalog') loadCatalog();
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setSearchRes(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await api<{ items: Audio[] }>('audio.search', { q: q.trim(), count: 50 });
        setSearchRes(data && data.items ? data.items : []);
      } catch {
        setSearchRes([]);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const play = (a: Audio) => {
    if (!playerRef.current) return;
    if (current && current.id === a.id && current.owner_id === a.owner_id) {
      if (playing) audio.pause();
      else {
        if (a.url) {
          audio.src = a.url;
          audio.play().catch(() => onError('Не удалось воспроизвести'));
        } else onError('Нет ссылки на трек');
      }
      return;
    }
    setCurrent(a);
    if (a.url) {
      audio.src = a.url;
      audio.play().catch(() => onError('Нет доступа к аудио (CORS/DRM)'));
    } else {
      onError('Трек без ссылки');
      setPlaying(false);
    }
  };

  const list =
    tab === 'search' ? (searchRes !== null ? searchRes : []) : tab === 'mine' ? mine : catalog;

  const renderAudio = (a: Audio) => {
    const isCur = current && current.id === a.id && current.owner_id === a.owner_id;
    return (
      <div
        key={`${a.owner_id}_${a.id}`}
        className={`ovk-audio${isCur && playing ? ' ovk-audio--playing' : ''}`}
        onClick={() => play(a)}
      >
        <div className="ovk-audio__art">{isCur && playing ? <IconPause color="#2688eb" /> : <IconNote color="#818c99" />}</div>
        <div className="ovk-audio__body">
          <div className="ovk-audio__title">{a.title}</div>
          <div className="ovk-audio__artist">
            {a.artist} · {fmtDur(a.duration)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="ovk-page">
      <header className="ovk-header">
        <div className="ovk-header__row">
          <div className="ovk-header__title">Музыка</div>
        </div>
        <div style={{ display: 'flex', padding: '0 12px 8px' }}>
          {(
            [
              ['catalog', 'Каталог'],
              ['mine', 'Мои'],
              ['search', 'Поиск'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1,
                background: tab === id ? 'var(--ovk-blue)' : '#e3e7ed',
                color: tab === id ? '#fff' : '#000',
                border: 'none',
                borderRadius: 8,
                height: 32,
                fontSize: 14,
                fontWeight: 600,
                marginRight: id !== 'search' ? 6 : 0,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'search' && (
          <div className="ovk-search" style={{ margin: '0 12px 8px' }}>
            <IconSearch color="#818c99" />
            <input
              placeholder="Исполнитель или трек"
              value={q}
              onChange={(e: any) => setQ(e.target.value)}
            />
          </div>
        )}
      </header>

      {tab === 'catalog' && loading ? (
        <div className="ovk-loading">Загрузка каталога…</div>
      ) : list.length === 0 ? (
        <div className="ovk-empty">
          {tab === 'search'
            ? q
              ? 'Ничего не найдено'
              : 'Введите запрос'
            : tab === 'mine'
              ? 'Нет аудиозаписей'
              : 'Каталог пуст'}
        </div>
      ) : (
        list.map(renderAudio)
      )}

      {current && (
        <div className="ovk-player">
          <button
            className="ovk-player__btn"
            onClick={() => {
              if (!playerRef.current) return;
              if (playing) audio.pause();
              else audio.play().catch(() => {});
            }}
          >
            {playing ? <IconPause color="#2688eb" /> : <IconPlay color="#2688eb" />}
          </button>
          <div className="ovk-player__info">
            <div className="ovk-player__title">{current.title}</div>
            <div className="ovk-player__artist">{current.artist}</div>
          </div>
          <button
            className="ovk-player__btn"
            onClick={() => {
              audio.pause();
              setCurrent(null);
              setPlaying(false);
            }}
          >
            <IconClose color="#2688eb" />
          </button>
        </div>
      )}
    </div>
  );
}
