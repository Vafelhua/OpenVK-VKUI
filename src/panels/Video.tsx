import { useEffect, useState, useCallback } from 'react';
import { api, asList } from '../api';
import { IconBack } from '../components/Icons';

interface Video {
  id: number;
  owner_id: number;
  title: string;
  description?: string;
  duration?: number;
  photo_800?: string;
  photo_320?: string;
  views?: number;
  date?: number;
}

interface Props {
  ownerId?: number;
  onBack: () => void;
  onError: (msg: string) => void;
}

function fmtDur(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m + ':' + String(sec).padStart(2, '0');
}

export function VideoPanel({ ownerId, onBack, onError }: Props) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Video | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { count: 50, extended: 1 };
      if (ownerId) params.owner_id = String(ownerId);
      const data = await api<any>('video.get', params);
      setVideos(asList<Video>(data));
    } catch (e: any) {
      onError(e?.message || 'Видео недоступны');
    } finally {
      setLoading(false);
    }
  }, [ownerId, onError]);

  useEffect(() => {
    load();
  }, [load]);

  if (selected) {
    return (
      <div className="ovk-page" style={{ background: '#000' }}>
        <header className="ovk-header" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="ovk-header__row">
            <button className="ovk-header__action" onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', paddingLeft: 4, color: '#fff' }}>
              <IconBack color="#fff" /> <span style={{ marginLeft: 4 }}>Назад</span>
            </button>
            <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 15 }}>
              {selected.title}
            </div>
            <div style={{ width: 70 }} />
          </div>
        </header>
        <div style={{ padding: 12 }}>
          <video
            controls
            style={{ width: '100%', borderRadius: 8, background: '#000' }}
            poster={selected.photo_800 || selected.photo_320}
          >
            <source src={'https://api.openvk.org/video/' + selected.owner_id + '_' + selected.id + '.mp4'} />
          </video>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginTop: 12 }}>{selected.title}</div>
          {selected.description ? (
            <div style={{ color: '#8e8e93', fontSize: 14, marginTop: 6 }}>{selected.description}</div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="ovk-page">
      <header className="ovk-header">
        <div className="ovk-header__row">
          <button className="ovk-header__action" onClick={onBack} style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
            <IconBack color="#2688eb" /> <span style={{ marginLeft: 4 }}>Назад</span>
          </button>
          <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center' }}>
            Видео
          </div>
          <div style={{ width: 70 }} />
        </div>
      </header>

      {loading ? (
        <div className="ovk-loading">Загрузка...</div>
      ) : videos.length === 0 ? (
        <div className="ovk-empty">Нет видео</div>
      ) : (
        videos.map((v) => (
          <div key={v.id} className="ovk-cell" onClick={() => setSelected(v)} style={{ alignItems: 'flex-start' }}>
            <div style={{ width: 120, height: 68, borderRadius: 6, background: '#000', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
              {v.photo_320 || v.photo_800 ? (
                <img src={v.photo_320 || v.photo_800} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : null}
              {v.duration ? (
                <div style={{ position: 'absolute', right: 4, bottom: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 11, padding: '1px 4px', borderRadius: 3 }}>
                  {fmtDur(v.duration)}
                </div>
              ) : null}
            </div>
            <div className="ovk-cell__body">
              <div className="ovk-cell__title" style={{ fontWeight: 600 }}>{v.title}</div>
              {v.views != null ? (
                <div className="ovk-cell__subtitle">{v.views} просмотров</div>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
