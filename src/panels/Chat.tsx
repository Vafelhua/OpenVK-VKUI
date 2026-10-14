import { useEffect, useState, useCallback, useRef } from 'react';
import { api, Message } from '../api';
import { IconBack, IconSend } from '../components/Icons';

interface Props {
  peerId: number;
  title: string;
  onBack: () => void;
  onError: (msg: string) => void;
}

function fmtTime(ts: number): string {
  const d = new Date(ts * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function ChatPanel({ peerId, title, onBack, onError }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: Message[] }>('messages.getHistory', {
        peer_id: peerId,
        count: 50,
        extended: 0,
      });
      if (data && data.items) {
        const asc = data.items.slice().reverse();
        setMessages(asc);
      }
    } catch (e: any) {
      onError(e?.message || 'Не удалось загрузить историю');
    } finally {
      setLoading(false);
    }
  }, [peerId, onError]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const res = await api<number | { message_id: number }>('messages.send', {
        peer_id: peerId,
        message: t,
        random_id: Math.floor(Math.random() * 1e9),
      });
      setText('');
      await load();
    } catch (e: any) {
      onError(e?.message || 'Не удалось отправить');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ovk-chat" style={{ height: '100%', paddingBottom: 0 }}>
      <header className="ovk-header" style={{ position: 'relative' }}>
        <div className="ovk-header__row">
          <button className="ovk-header__action" onClick={onBack} style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
            <IconBack color="#2688eb" /> <span style={{ marginLeft: 4 }}>Назад</span>
          </button>
          <div className="ovk-header__title" style={{ flex: 1, textAlign: 'center' }}>
            {title}
          </div>
          <div style={{ width: 60 }} />
        </div>
      </header>

      <div className="ovk-chat__list" ref={listRef}>
        {loading ? (
          <div className="ovk-loading">Загрузка…</div>
        ) : (
          messages.map((m) => (
            <div className="ovk-msg__row" key={m.id}>
              <div className={`ovk-msg ${m.out ? 'ovk-msg--out' : 'ovk-msg--in'}`}>
                <div>{m.text}</div>
                <div className="ovk-msg__time">{fmtTime(m.date)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="ovk-chat__composer">
        <input
          placeholder="Сообщение"
          value={text}
          onChange={(e: any) => setText(e.target.value)}
          onKeyDown={(e: any) => {
            if (e.key === 'Enter') send();
          }}
        />
        <button onClick={send} disabled={sending || !text.trim()} style={{ display: 'flex', alignItems: 'center' }}>
          {sending ? '...' : <IconSend color="#2688eb" />}
        </button>
      </div>
    </div>
  );
}
