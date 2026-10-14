import { useEffect, useState, useCallback } from 'react';
import { api, asList } from '../api';
import { IconBack } from '../components/Icons';

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
}

function fmtSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' Б';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
  return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
}

export function DocsPanel({ onBack, onError }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<any>('docs.get', { count: 100, ext: 1 });
      setDocs(asList<Doc>(data));
    } catch (e: any) {
      onError(e?.message || 'Документы недоступны');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = q
    ? docs.filter((d) => (d.title || '').toLowerCase().includes(q.toLowerCase()))
    : docs;

  return (
    <div className="ovk-page">
      <header className="ovk-header">
        <div className="ovk-header__row">
          <button className="ovk-header__action" onClick={onBack} style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
            <IconBack color="#2688eb" /> <span style={{ marginLeft: 4 }}>Назад</span>
          </button>
          <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center' }}>
            Документы
          </div>
          <div style={{ width: 70 }} />
        </div>
        <div className="ovk-search" style={{ margin: '0 12px 8px' }}>
          <input
            placeholder="Поиск"
            value={q}
            onChange={(e: any) => setQ(e.target.value)}
          />
        </div>
      </header>

      {loading ? (
        <div className="ovk-loading">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="ovk-empty">{q ? 'Ничего не найдено' : 'Нет документов'}</div>
      ) : (
        filtered.map((d) => (
          <div
            key={d.owner_id + '_' + d.id}
            className="ovk-cell"
            onClick={() => {
              if (d.url) window.open(d.url, '_blank');
            }}
          >
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
                fontSize: 11,
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
              <div className="ovk-cell__subtitle">
                {[d.ext, fmtSize(d.size)].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div className="ovk-cell__meta">›</div>
          </div>
        ))
      )}
    </div>
  );
}
