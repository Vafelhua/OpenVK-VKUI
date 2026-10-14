import { useEffect, useState, useCallback } from 'react';
import { api, asList } from '../api';
import { IconSearch, IconPlay, IconPause, IconClose, IconNote } from '../components/Icons';
import { playTrack, getState, subscribe, togglePlay, stopTrack, Track } from '../player';
import { useSwipe } from '../hooks/useSwipe';

interface Props {
  onError: (msg: string) => void;
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

export function MusicPanel({ onError }: Props) {
  const [tab, setTab] = useState<'catalog' | 'mine' | 'search'>('catalog');
  const [catalog, setCatalog] = useState<Track[]>([]);
  const [mine, setMine] = useState<Track[]>([]);
  const [q, setQ] = useState('');
  const [searchRes, setSearchRes] = useState<Track[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [st, setSt] = useState(getState());

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

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (tab === 'mine' && mine.length === 0) loadMine();
  }, [tab, mine.length, loadMine]);

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

  const list = tab === 'search' ? (searchRes !== null ? searchRes : []) : tab === 'mine' ? mine : catalog;
  const current = st.current;
  const playing = st.playing;

  const tabs = ['catalog', 'mine', 'search'] as const;
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
      </div>
    );
  };

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
