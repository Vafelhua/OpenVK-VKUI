import { useEffect, useState, useCallback } from 'react';
import { api, asList, absoluteUrl } from '../api';
import { IconBack, IconHeart } from '../components/Icons';

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
  likes?: { count: number; user_likes?: number };
  files?: Record<string, string>;
  player?: string;
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

function videoUrl(v: Video): string | null {
  if (v.files) {
    for (const k of ['mp4_1080', 'mp4_720', 'mp4_480', 'mp4_360', 'mp4_240', 'hls']) {
      const u = v.files[k];
      if (u) return absoluteUrl(u);
    }
    for (const u of Object.values(v.files)) {
      if (typeof u === 'string' && u) return absoluteUrl(u);
    }
  }
  if (v.player) return absoluteUrl(String(v.player));
  return null;
}

export function VideoPanel({ ownerId, onBack, onError }: Props) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selected, setSelected] = useState<Video | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { count: 50, offset: 0, extended: 1 };
      if (ownerId) params.owner_id = String(ownerId);
      const data = await api<any>('video.get', params);
      const list = asList<Video>(data);
      setVideos(list);
      setHasMore(list.length >= 50);
    } catch (e: any) {
      onError(e?.message || 'Видео недоступны');
    } finally {
      setLoading(false);
    }
  }, [ownerId, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const params: Record<string, any> = { count: 50, offset: videos.length, extended: 1 };
      if (ownerId) params.owner_id = String(ownerId);
      const data = await api<any>('video.get', params);
      const list = asList<Video>(data);
      if (!list.length) setHasMore(false);
      else setVideos((prev) => [...prev, ...list]);
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить ещё');
    } finally {
      setLoadingMore(false);
    }
  };

  const likeVideo = async (v: Video) => {
    const liked = !!(v.likes && v.likes.user_likes);
    try {
      await api('likes.' + (liked ? 'delete' : 'add'), {
        type: 'video',
        owner_id: String(v.owner_id),
        item_id: String(v.id),
      });
      setVideos((prev) =>
        prev.map((x) =>
          x.id === v.id && x.owner_id === v.owner_id
            ? {
                ...x,
                likes: {
                  count: Math.max(0, (x.likes?.count || 0) + (liked ? -1 : 1)),
                  user_likes: liked ? 0 : 1,
                },
              }
            : x,
        ),
      );
    } catch (e: any) {
      onError(e?.message || 'Ошибка');
    }
  };

  if (selected) {
    const src = videoUrl(selected);
    const liked = !!(selected.likes && selected.likes.user_likes);
    return (
      <div className="ovk-page" style={{ background: '#000' }}>
        <header className="ovk-header" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="ovk-header__row">
            <button
              className="ovk-header__action"
              onClick={() => setSelected(null)}
              style={{ display: 'flex', alignItems: 'center', paddingLeft: 4, color: '#fff' }}
            >
              <IconBack color="#fff" /> <span style={{ marginLeft: 4 }}>Назад</span>
            </button>
            <div
              className="ovk-header__title"
              style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 15 }}
            >
              {selected.title}
            </div>
            <div style={{ width: 70 }} />
          </div>
        </header>
        <div style={{ padding: 12 }}>
          {src ? (
            <video
              controls
              autoPlay
              playsInline
              style={{ width: '100%', borderRadius: 8, background: '#000' }}
              poster={absoluteUrl(selected.photo_800 || selected.photo_320 || '')}
            >
              <source src={src} />
            </video>
          ) : (
            <div style={{ color: '#8e8e93', padding: 24, textAlign: 'center' }}>
              Файл видео недоступен через API
            </div>
          )}
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginTop: 12 }}>{selected.title}</div>
          {selected.description ? (
            <div style={{ color: '#8e8e93', fontSize: 14, marginTop: 6 }}>{selected.description}</div>
          ) : null}
          <button
            className={liked ? 'liked' : ''}
            onClick={() => likeVideo(selected)}
            style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: liked ? '#2688eb' : '#8e8e93',
              fontSize: 14,
            }}
          >
            <IconHeart filled={liked} color={liked ? '#2688eb' : '#8e8e93'} />
            {selected.likes ? selected.likes.count : 0}
          </button>
        </div>
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
        <>
          {videos.map((v) => (
            <div
              key={v.owner_id + '_' + v.id}
              className="ovk-cell"
              onClick={() => setSelected(v)}
              style={{ alignItems: 'flex-start' }}
            >
              <div
                style={{
                  width: 120,
                  height: 68,
                  borderRadius: 6,
                  background: '#000',
                  flexShrink: 0,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {v.photo_320 || v.photo_800 ? (
                  <img
                    src={absoluteUrl(v.photo_320 || v.photo_800)}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : null}
                {v.duration ? (
                  <div
                    style={{
                      position: 'absolute',
                      right: 4,
                      bottom: 4,
                      background: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      fontSize: 11,
                      padding: '1px 4px',
                      borderRadius: 3,
                    }}
                  >
                    {fmtDur(v.duration)}
                  </div>
                ) : null}
              </div>
              <div className="ovk-cell__body">
                <div className="ovk-cell__title" style={{ fontWeight: 600 }}>
                  {v.title}
                </div>
                {v.views != null ? <div className="ovk-cell__subtitle">{v.views} просмотров</div> : null}
              </div>
            </div>
          ))}
          {hasMore ? (
            <button className="ovk-more-btn" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Загрузка...' : 'Показать ещё'}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
