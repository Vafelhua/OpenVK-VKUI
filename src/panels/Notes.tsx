import { useEffect, useState, useCallback } from 'react';
import { api, asList } from '../api';
import { IconBack } from '../components/Icons';

interface Note {
  id: number;
  user_id?: number;
  title: string;
  text?: string;
  date?: number;
}

interface Props {
  onBack: () => void;
  onError: (msg: string) => void;
  userId: number;
}

export function NotesPanel({ onBack, onError, userId }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Note | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<any>('notes.get', { user_id: userId, count: 50, sort: 1 });
      setNotes(asList<Note>(data));
    } catch (e: any) {
      onError(e?.message || 'Заметки недоступны');
    } finally {
      setLoading(false);
    }
  }, [userId, onError]);

  useEffect(() => {
    load();
  }, [load]);

  if (selected) {
    return (
      <div className="ovk-page">
        <header className="ovk-header">
          <div className="ovk-header__row">
            <button className="ovk-header__action" onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
              <IconBack color="#2688eb" /> <span style={{ marginLeft: 4 }}>Назад</span>
            </button>
            <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center', fontSize: 15 }}>
              {selected.title}
            </div>
            <div style={{ width: 70 }} />
          </div>
        </header>
        <div style={{ padding: 16, fontSize: 15, lineHeight: '22px', color: '#000', whiteSpace: 'pre-wrap' }}>
          {selected.text || 'Пусто'}
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
            Заметки
          </div>
          <div style={{ width: 70 }} />
        </div>
      </header>

      {loading ? (
        <div className="ovk-loading">Загрузка...</div>
      ) : notes.length === 0 ? (
        <div className="ovk-empty">Нет заметок</div>
      ) : (
        notes.map((n) => (
          <div key={n.id} className="ovk-cell" onClick={() => setSelected(n)}>
            <div className="ovk-cell__body">
              <div className="ovk-cell__title" style={{ fontWeight: 600 }}>{n.title}</div>
              {n.text ? (
                <div className="ovk-cell__subtitle">{n.text.slice(0, 100)}</div>
              ) : null}
            </div>
            <div className="ovk-cell__meta">›</div>
          </div>
        ))
      )}
    </div>
  );
}
