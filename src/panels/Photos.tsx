import { useEffect, useRef, useState, useCallback } from 'react';
import { api, asList, absoluteUrl, uploadAlbumPhoto } from '../api';
import { IconBack, IconHeart, IconClose } from '../components/Icons';

interface Album {
  id: number;
  owner_id: number;
  title: string;
  size?: number;
  thumb_src?: string;
}

interface Photo {
  id: number;
  owner_id: number;
  sizes?: { type: string; url: string; width?: number; height?: number }[];
  photo_604?: string;
  text?: string;
  likes?: { count: number; user_likes?: number };
  date?: number;
}

interface Props {
  meId: number;
  onBack: () => void;
  onError: (msg: string) => void;
}

function photoUrl(p: Photo): string | null {
  const sizes = p.sizes || [];
  const best =
    sizes.find((x) => x.type === 'x') ||
    sizes.find((x) => x.type === 'y') ||
    sizes.find((x) => x.type === 'z') ||
    sizes[sizes.length - 1];
  if (best && best.url) return absoluteUrl(best.url);
  if (p.photo_604) return absoluteUrl(p.photo_604);
  return null;
}

export function PhotosPanel({ meId, onBack, onError }: Props) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [albumId, setAlbumId] = useState<number | null>(null);
  const [albumTitle, setAlbumTitle] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [viewer, setViewer] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<any>('photos.getAlbums', {
        owner_id: String(meId),
        count: 100,
        need_system: 1,
        photo_sizes: 1,
      });
      setAlbums(asList<Album>(data));
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить альбомы');
    } finally {
      setLoading(false);
    }
  }, [meId, onError]);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  const openAlbum = async (a: Album) => {
    setAlbumId(a.id);
    setAlbumTitle(a.title || 'Альбом');
    setPhotos([]);
    setHasMore(true);
    setPhotosLoading(true);
    try {
      const data = await api<any>('photos.get', {
        owner_id: String(meId),
        album_id: String(a.id),
        count: 50,
        offset: 0,
        extended: 1,
        photo_sizes: 1,
      });
      const list = asList<Photo>(data);
      setPhotos(list);
      setHasMore(list.length >= 50);
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить фотографии');
    } finally {
      setPhotosLoading(false);
    }
  };

  const loadMorePhotos = async () => {
    if (albumId == null || photosLoading) return;
    setPhotosLoading(true);
    try {
      const data = await api<any>('photos.get', {
        owner_id: String(meId),
        album_id: String(albumId),
        count: 50,
        offset: photos.length,
        extended: 1,
        photo_sizes: 1,
      });
      const list = asList<Photo>(data);
      if (!list.length) setHasMore(false);
      else setPhotos((prev) => [...prev, ...list]);
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить ещё');
    } finally {
      setPhotosLoading(false);
    }
  };

  const upload = async (e: any) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const id = await uploadAlbumPhoto(file, albumId != null && albumId >= 0 ? albumId : undefined);
      if (id) onError('Фотография загружена');
      if (albumId != null) {
        const data = await api<any>('photos.get', {
          owner_id: String(meId),
          album_id: String(albumId),
          count: 50,
          offset: 0,
          extended: 1,
          photo_sizes: 1,
        });
        setPhotos(asList<Photo>(data));
      }
    } catch (err: any) {
      onError(err?.message || 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const likePhoto = async (p: Photo, idx: number) => {
    const liked = !!(p.likes && p.likes.user_likes);
    try {
      await api('likes.' + (liked ? 'delete' : 'add'), {
        type: 'photo',
        owner_id: String(p.owner_id),
        item_id: String(p.id),
      });
      setPhotos((prev) =>
        prev.map((x, i) =>
          i === idx
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

  if (viewer != null && photos[viewer]) {
    const p = photos[viewer];
    const src = photoUrl(p);
    const liked = !!(p.likes && p.likes.user_likes);
    return (
      <div className="ovk-page" style={{ background: '#000', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: 10, color: '#fff' }}>
          <button
            onClick={() => setViewer(null)}
            style={{ background: 'none', border: 'none', color: '#fff', display: 'flex', alignItems: 'center' }}
          >
            <IconClose color="#fff" /> <span style={{ marginLeft: 6 }}>Закрыть</span>
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => likePhoto(p, viewer)}
            style={{
              background: 'none',
              border: 'none',
              color: liked ? '#2688eb' : '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <IconHeart filled={liked} color={liked ? '#2688eb' : '#fff'} />
            {p.likes ? p.likes.count : 0}
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'calc(100% - 50px)',
            padding: 12,
          }}
        >
          {src ? <img src={src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : null}
        </div>
        <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 16px' }}>
          <button
            className="ovk-btn-secondary"
            disabled={viewer <= 0}
            onClick={() => setViewer(viewer - 1)}
          >
            ‹
          </button>
          <button
            className="ovk-btn-secondary"
            disabled={viewer >= photos.length - 1}
            onClick={() => setViewer(viewer + 1)}
          >
            ›
          </button>
        </div>
      </div>
    );
  }

  if (albumId != null) {
    return (
      <div className="ovk-page">
        <header className="ovk-header">
          <div className="ovk-header__row">
            <button
              className="ovk-header__action"
              onClick={() => {
                setAlbumId(null);
                setPhotos([]);
              }}
              style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}
            >
              <IconBack color="#2688eb" /> <span style={{ marginLeft: 4 }}>Альбомы</span>
            </button>
            <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center', fontSize: 15 }}>
              {albumTitle}
            </div>
            <button
              className="ovk-header__action"
              onClick={() => fileRef.current && fileRef.current.click()}
              disabled={uploading}
              style={{ fontWeight: 600 }}
            >
              {uploading ? '...' : 'Фото'}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={upload} />
        </header>

        {photosLoading && photos.length === 0 ? (
          <div className="ovk-loading">Загрузка...</div>
        ) : photos.length === 0 ? (
          <div className="ovk-empty">Нет фотографий</div>
        ) : (
          <>
            <div className="ovk-photos-grid">
              {photos.map((p, i) => {
                const src = photoUrl(p);
                return src ? (
                  <div key={p.owner_id + '_' + p.id} className="ovk-photo-cell" onClick={() => setViewer(i)}>
                    <img src={src} alt="" loading="lazy" />
                  </div>
                ) : null;
              })}
            </div>
            {hasMore ? (
              <button className="ovk-more-btn" onClick={loadMorePhotos} disabled={photosLoading}>
                {photosLoading ? 'Загрузка...' : 'Показать ещё'}
              </button>
            ) : null}
          </>
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
            Фотографии
          </div>
          <div style={{ width: 70 }} />
        </div>
      </header>

      {loading ? (
        <div className="ovk-loading">Загрузка...</div>
      ) : albums.length === 0 ? (
        <div className="ovk-empty">Нет альбомов</div>
      ) : (
        albums.map((a) => (
          <div key={a.owner_id + '_' + a.id} className="ovk-cell" onClick={() => openAlbum(a)}>
            <div className="ovk-album-thumb">{a.size != null ? a.size : ''}</div>
            <div className="ovk-cell__body">
              <div className="ovk-cell__title" style={{ fontWeight: 600 }}>
                {a.title}
              </div>
              <div className="ovk-cell__subtitle">{a.size != null ? a.size + ' фото' : 'Альбом'}</div>
            </div>
            <div className="ovk-cell__meta">›</div>
          </div>
        ))
      )}
    </div>
  );
}
