import { useEffect, useState, useCallback } from 'react';
import { api, asList } from '../api';
import { IconSearch, IconPlay, IconPause, IconClose, IconNote } from '../components/Icons';
import { playTrack, getState, subscribe, togglePlay, stopTrack, Track } from '../player';
import { useSwipe } from '../hooks/useSwipe';

interface Props {
  onError: (msg: string) => void;
  meId?: number;
}

interface AudioAlbum {
  id: number;
  owner_id: number;
  title: string;
  count?: number;
}

function fmtDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function toTrack(a: any): Track {
  return {
    id: a.id,
    owner_id: a.owner_id,
    artist: a.artist || '',
    title: a.title || '',
    duration: a.duration || 0,
    url: a.url,
  };
}

export function MusicPanel({ onError, meId }: Props) {
  const [tab, setTab] = useState<'catalog' | 'mine' | 'albums' | 'search'>('catalog');
  const [catalog, setCatalog] = useState<Track[]>([]);
  const [mine, setMine] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<AudioAlbum[]>([]);
  const [albumTracks, setAlbumTracks] = useState<Track[] | null>(null);
  const [albumTitle, setAlbumTitle] = useState('');
  const [q, setQ] = useState('');
  const [searchRes, setSearchRes] = useState<Track[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [st, setSt] = useState(getState());
  const [lyrics, setLyrics] = useState<{ track: Track; text: string } | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);

  useEffect(() => subscribe(() => setSt(getState())), []);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      let items: Track[] = [];
      try {
        const rec = await api<any>('audio.getRecommendations', { count: 50 });
        items = asList<any>(rec).map(toTrack);
      } catch {}
      if (!items.length) {
        try {
          const cat = await api<any>('audio.getCatalog', { count: 50 });
          const sections = asList<any>(cat);
          for (const sect of sections) {
            if (sect.playlists) {
              for (const pl of sect.playlists) {
                if (pl.owner_id != null && pl.id != null) {
                  try {
                    const auds = await api<any>('audio.get', {
                      owner_id: pl.owner_id,
                      album_id: pl.id,
                      count: 20,
                    });
                    items.push(...asList<any>(auds).map(toTrack));
                  } catch {}
                }
              }
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
      const data = await api<any>('audio.get', { count: 100 });
      setMine(asList<any>(data).map(toTrack));
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить аудио');
    }
  }, [onError]);

  const loadAlbums = useCallback(async () => {
    try {
      const data = await api<any>('audio.getAlbums', { count: 100 });
      setAlbums(asList<AudioAlbum>(data));
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить альбомы');
    }
  }, [onError]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (tab === 'mine' && mine.length === 0) loadMine();
    if (tab === 'albums' && albums.length === 0) loadAlbums();
  }, [tab, mine.length, albums.length, loadMine, loadAlbums]);

  useEffect(() => {
    if (!q.trim()) {
      setSearchRes(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await api<any>('audio.search', { q: q.trim(), count: 50 });
        setSearchRes(asList<any>(data).map(toTrack));
      } catch {
        setSearchRes([]);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const openAlbum = async (al: AudioAlbum) => {
    setAlbumTitle(al.title);
    setAlbumTracks([]);
    try {
      const data = await api<any>('audio.get', {
        owner_id: al.owner_id,
        album_id: al.id,
        count: 200,
      });
      setAlbumTracks(asList<any>(data).map(toTrack));
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить альбом');
      setAlbumTracks(null);
    }
  };

  const openLyrics = async (a: Track) => {
    if (loadingLyrics) return;
    setLoadingLyrics(true);
    try {
      const data = await api<any>('audio.getLyrics', { lyrics_id: a.id });
      const txt = (data && (data.text || data.lyrics)) || '';
      setLyrics({ track: a, text: txt || 'Текст песни недоступен' });
    } catch {
      setLyrics({ track: a, text: 'Текст песни недоступен' });
    } finally {
      setLoadingLyrics(false);
    }
  };

  const setBroadcast = async (a: Track) => {
    try {
      await api('audio.setBroadcast', {
        audio: a.owner_id + '_' + a.id,
        target_ids: String(meId || 0),
      });
      onError('Статус обновлён: ' + a.artist + ' — ' + a.title);
    } catch (e: any) {
      onError(e?.message || 'Не удалось установить статус');
    }
  };

  const list =
    tab === 'search' ? (searchRes !== null ? searchRes : []) : tab === 'mine' ? mine : catalog;
  const current = st.current;
  const playing = st.playing;

  const tabs = ['catalog', 'mine', 'albums', 'search'] as const;
  const swipe = useSwipe(
    () => {
      const i = tabs.indexOf(tab);
      if (i < tabs.length - 1) setTab(tabs[i + 1]);
    },
    () => {
      const i = tabs.indexOf(tab);
      if (i > 0) setTab(tabs[i - 1]);
    },
  );

  const renderAudio = (a: Track) => {
    const isCur = current && current.id === a.id && current.owner_id === a.owner_id;
    return (
      <div
        key={a.owner_id + '_' + a.id}
        className={'ovk-audio' + (isCur && playing ? ' ovk-audio--playing' : '')}
        onClick={() => playTrack(a, onError)}
      >
        <div className="ovk-audio__art">
          {isCur && playing ? <IconPause color="#2688eb" /> : <IconNote color="#818c99" />}
        </div>
        <div className="ovk-audio__body">
          <div className="ovk-audio__title">{a.title}</div>
          <div className="ovk-audio__artist">
            {a.artist} · {fmtDur(a.duration)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <button
            className="ovk-icon-btn"
            onClick={(e: any) => {
              e.stopPropagation();
              openLyrics(a);
            }}
            title="Текст"
            style={{ padding: 4 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818c99" strokeWidth="2">
              <path d="M4 6h16M4 10h16M4 14h10M4 18h10" />
            </svg>
          </button>
          <button
            className="ovk-icon-btn"
            onClick={(e: any) => {
              e.stopPropagation();
              setBroadcast(a);
            }}
            title="Слушаю"
            style={{ padding: 4 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818c99" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  if (lyrics) {
    return (
      <div className="ovk-page">
        <header className="ovk-header">
          <div className="ovk-header__row">
            <button
              className="ovk-header__action"
              onClick={() => setLyrics(null)}
              style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}
            >
              <IconClose color="#2688eb" /> <span style={{ marginLeft: 4 }}>Назад</span>
            </button>
            <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center', fontSize: 15 }}>
              {lyrics.track.artist} — {lyrics.track.title}
            </div>
            <div style={{ width: 70 }} />
          </div>
        </header>
        <div style={{ padding: 16, fontSize: 15, lineHeight: '22px', whiteSpace: 'pre-wrap' }}>
          {lyrics.text}
        </div>
      </div>
    );
  }

  if (albumTracks) {
    return (
      <div className="ovk-page" style={{ paddingBottom: current ? 120 : 60 }}>
        <header className="ovk-header">
          <div className="ovk-header__row">
            <button
              className="ovk-header__action"
              onClick={() => setAlbumTracks(null)}
              style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}
            >
              <IconClose color="#2688eb" /> <span style={{ marginLeft: 4 }}>Альбомы</span>
            </button>
            <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center', fontSize: 15 }}>
              {albumTitle}
            </div>
            <div style={{ width: 70 }} />
          </div>
        </header>
        {albumTracks.length === 0 ? (
          <div className="ovk-empty">Пустой альбом</div>
        ) : (
          albumTracks.map(renderAudio)
        )}
      </div>
    );
  }

  return (
    <div className="ovk-page" style={{ paddingBottom: current ? 120 : 60 }} {...swipe}>
      <header className="ovk-header">
        <div className="ovk-header__row">
          <div className="ovk-header__title">Музыка</div>
        </div>
        <div className="ovk-feed-switch">
          {(
            [
              ['catalog', 'Каталог'],
              ['mine', 'Мои'],
              ['albums', 'Альбомы'],
              ['search', 'Поиск'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={'ovk-feed-switch__btn' + (tab === id ? ' active' : '')}
              onClick={() => setTab(id)}
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

      <div key={swipe.animKey} className={swipe.animClass}>
        {tab === 'catalog' && loading ? (
          <div className="ovk-loading">Загрузка каталога...</div>
        ) : tab === 'albums' && albums.length === 0 ? (
          <div className="ovk-empty">Нет альбомов</div>
        ) : tab === 'albums' ? (
          albums.map((al) => (
            <div key={al.owner_id + '_' + al.id} className="ovk-cell" onClick={() => openAlbum(al)}>
              <div className="ovk-cell__body">
                <div className="ovk-cell__title" style={{ fontWeight: 600 }}>
                  {al.title}
                </div>
                <div className="ovk-cell__subtitle">{al.count != null ? al.count + ' треков' : 'Альбом'}</div>
              </div>
              <div className="ovk-cell__meta">›</div>
            </div>
          ))
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
      </div>
    </div>
  );
}
