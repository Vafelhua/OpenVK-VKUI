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
  const [editing, setEditing] = useState<{ id?: number; title: string; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<any>('notes.get', { user_id: userId, count: 100, sort: 1 });
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

  const save = async () => {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) {
      onError('Введите заголовок');
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        await api('notes.edit', { note_id: String(editing.id), title, text: editing.text });
        setNotes((prev) => prev.map((n) => (n.id === editing.id ? { ...n, title, text: editing.text } : n)));
        setSelected((prev) => (prev && prev.id === editing.id ? { ...prev, title, text: editing.text } : prev));
      } else {
        const res = await api<any>('notes.create', { title, text: editing.text, privacy: 0, comment_privacy: 0 });
        const created = res && typeof res === 'object' ? res : null;
        const id = created ? Number(created.id || created.note_id || 0) : 0;
        setNotes((prev) => [{ id, title, text: editing.text }, ...prev]);
      }
      setEditing(null);
    } catch (e: any) {
      onError(e?.message || 'Не удалось сохранить заметку');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (n: Note) => {
    try {
      await api('notes.delete', { note_id: String(n.id) });
      setNotes((prev) => prev.filter((x) => x.id !== n.id));
      setSelected(null);
      onError('Заметка удалена');
    } catch (e: any) {
      onError(e?.message || 'Не удалось удалить');
    }
  };

  if (editing) {
    return (
      <div className="ovk-page">
        <header className="ovk-header">
          <div className="ovk-header__row">
            <button
              className="ovk-header__action"
              onClick={() => setEditing(null)}
              style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}
            >
              <IconBack color="#2688eb" /> <span style={{ marginLeft: 4 }}>Назад</span>
            </button>
            <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center' }}>
              {editing.id ? 'Редактировать' : 'Новая заметка'}
            </div>
            <button className="ovk-header__action" onClick={save} disabled={saving} style={{ fontWeight: 600 }}>
              {saving ? '...' : 'Готово'}
            </button>
          </div>
        </header>
        <div style={{ padding: 12 }}>
          <input
            className="ovk-login__field"
            placeholder="Заголовок"
            value={editing.title}
            onChange={(e: any) => setEditing({ ...editing, title: e.target.value })}
            style={{ width: '100%', marginBottom: 10 }}
          />
          <textarea
            placeholder="Текст заметки"
            value={editing.text}
            onChange={(e: any) => setEditing({ ...editing, text: e.target.value })}
            style={{ width: '100%', minHeight: 220, padding: 12, borderRadius: 8, border: '1px solid #d7d8db', fontSize: 15 }}
          />
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="ovk-page">
        <header className="ovk-header">
          <div className="ovk-header__row">
            <button
              className="ovk-header__action"
              onClick={() => setSelected(null)}
              style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}
            >
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
        <div style={{ display: 'flex', gap: 10, padding: 16 }}>
          <button
            className="ovk-btn-primary"
            style={{ flex: 1 }}
            onClick={() => setEditing({ id: selected.id, title: selected.title, text: selected.text || '' })}
          >
            Редактировать
          </button>
          <button className="ovk-btn-secondary" style={{ flex: 1 }} onClick={() => remove(selected)}>
            Удалить
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
            Заметки
          </div>
          <button
            className="ovk-header__action"
            onClick={() => setEditing({ title: '', text: '' })}
            style={{ fontWeight: 600 }}
          >
            Создать
          </button>
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
              <div className="ovk-cell__title" style={{ fontWeight: 600 }}>
                {n.title}
              </div>
              {n.text ? <div className="ovk-cell__subtitle">{n.text.slice(0, 100)}</div> : null}
            </div>
            <div className="ovk-cell__meta">›</div>
          </div>
        ))
      )}
    </div>
  );
}
