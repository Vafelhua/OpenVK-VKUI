import { useEffect, useRef, useState, useCallback } from 'react';
import { api, asList, absoluteUrl, uploadDocument } from '../api';
import { IconBack } from '../components/Icons';
import { copyToClipboard } from '../utils/external';

interface Doc {
  id: number;
  owner_id: number;
  title: string;
  ext?: string;
  url?: string;
  size?: number;
  type?: number;
  date?: number;
}

interface Props {
  onBack: () => void;
  onError: (msg: string) => void;
  ownerId?: number;
}

function fmtSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' Б';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
  return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
}

export function DocsPanel({ onBack, onError, ownerId }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { count: 100, offset: 0 };
      if (ownerId) params.owner_id = String(ownerId);
      const data = await api<any>('docs.get', params);
      const list = asList<Doc>(data);
      setDocs(list);
      setHasMore(list.length >= 100);
    } catch (e: any) {
      onError(e?.message || 'Документы недоступны');
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
      const params: Record<string, any> = { count: 100, offset: docs.length };
      if (ownerId) params.owner_id = String(ownerId);
      const data = await api<any>('docs.get', params);
      const list = asList<Doc>(data);
      if (!list.length) setHasMore(false);
      else setDocs((prev) => [...prev, ...list]);
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить ещё');
    } finally {
      setLoadingMore(false);
    }
  };

  const onPickFile = async (e: any) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadDocument(file);
      onError('Документ загружен');
      await load();
    } catch (err: any) {
      onError(err?.message || 'Не удалось загрузить документ');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const openDoc = async (d: Doc) => {
    if (!d.url) {
      onError('Ссылка недоступна');
      return;
    }
    const ok = await copyToClipboard(absoluteUrl(d.url));
    onError(ok ? 'Ссылка на документ скопирована — откройте в Safari' : absoluteUrl(d.url));
  };

  const filtered = q
    ? docs.filter((d) => (d.title || '').toLowerCase().includes(q.toLowerCase()))
    : docs;

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
            Документы
          </div>
          <button
            className="ovk-header__action"
            onClick={() => fileRef.current && fileRef.current.click()}
            disabled={uploading}
            style={{ fontWeight: 600 }}
          >
            {uploading ? '...' : 'Загрузить'}
          </button>
        </div>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={onPickFile} />
        <div className="ovk-search" style={{ margin: '0 12px 8px' }}>
          <input placeholder="Поиск" value={q} onChange={(e: any) => setQ(e.target.value)} />
        </div>
      </header>

      {loading ? (
        <div className="ovk-loading">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="ovk-empty">{q ? 'Ничего не найдено' : 'Нет документов'}</div>
      ) : (
        <>
          {filtered.map((d) => (
            <div key={d.owner_id + '_' + d.id} className="ovk-cell" onClick={() => openDoc(d)}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  background: '#2688eb',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                  textTransform: 'uppercase',
                }}
              >
                {(d.ext || d.title || '?').slice(-4)}
              </div>
              <div className="ovk-cell__body">
                <div className="ovk-cell__title" style={{ fontWeight: 600 }}>
                  {d.title}
                </div>
                <div className="ovk-cell__subtitle">{[d.ext, fmtSize(d.size)].filter(Boolean).join(' · ')}</div>
              </div>
              <div className="ovk-cell__meta">›</div>
            </div>
          ))}
          {hasMore && !q ? (
            <button className="ovk-more-btn" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Загрузка...' : 'Показать ещё'}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
