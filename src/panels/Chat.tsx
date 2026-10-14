import { useEffect, useState, useCallback, useRef } from 'react';
import { api, Message, uploadMessagePhoto, asList } from '../api';
import { IconBack, IconSend } from '../components/Icons';

function asListPack(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

interface Props {
  peerId: number;
  title: string;
  onBack: () => void;
  onError: (msg: string) => void;
  refreshKey?: number;
}

function fmtTime(ts: number): string {
  const d = new Date(ts * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function msgPhotoUrl(m: Message): string | null {
  if (!m.attachments) return null;
  for (const a of m.attachments) {
    if (a.type === 'photo' && a.photo) {
      const sizes = a.photo.sizes || [];
      const best = sizes.find((x: any) => x.type === 'x') || sizes[sizes.length - 1];
      if (best && best.url) return best.url;
    }
  }
  return null;
}

function msgStickerUrl(m: any): string | null {
  if (m.sticker_id) {
    return 'https://openvk.org/images/stickers/' + m.sticker_id + '/128b.png';
  }
  if (m.attachments) {
    for (const a of m.attachments) {
      if (a.type === 'sticker' && a.sticker) {
        const imgs = a.sticker.images || [];
        const best = imgs.length ? imgs[imgs.length - 1] : null;
        if (best && best.url) return best.url;
        return a.sticker.photo_128 || a.sticker.photo_64 || null;
      }
    }
  }
  return null;
}

export function ChatPanel({ peerId, title, onBack, onError, refreshKey }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const lastRefresh = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [stickers, setStickers] = useState<any[]>([]);
  const [loadingStickers, setLoadingStickers] = useState(false);

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
    if (!refreshKey) return;
    const now = Date.now();
    if (now - lastRefresh.current < 3000) return;
    lastRefresh.current = now;
    load();
  }, [refreshKey, load]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const pickPhoto = () => {
    if (fileRef.current) fileRef.current.click();
  };

  const openStickers = async () => {
    setStickerOpen((v) => !v);
    if (stickers.length || loadingStickers) return;
    setLoadingStickers(true);
    try {
      const packs = await api<any>('stickers.getAll', { count: 50 });
      const packList = asListPack(packs);
      const all: any[] = [];
      for (const p of packList.slice(0, 8)) {
        try {
          const s = await api<any>('stickers.getFrom', { stickerpack_id: String(p.id) });
          all.push(...asListPack(s));
        } catch {}
      }
      setStickers(all);
    } catch {
      setStickers([]);
    } finally {
      setLoadingStickers(false);
    }
  };

  const sendSticker = async (st: any) => {
    const id = st.sticker_id || st.id;
    if (!id || sending) return;
    setSending(true);
    try {
      await api('messages.send', {
        peer_id: peerId,
        sticker_id: String(id),
        random_id: Math.floor(Math.random() * 1e9),
      });
      setStickerOpen(false);
      await load();
    } catch (e: any) {
      onError(e?.message || 'Не удалось отправить стикер');
    } finally {
      setSending(false);
    }
  };

  const onFile = async (e: any) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const preview = URL.createObjectURL(file);
      const att = await uploadMessagePhoto(file, peerId);
      if (att) {
        setPendingPhoto(att);
        setPendingPreview(preview);
      } else {
        URL.revokeObjectURL(preview);
      }
    } catch (err: any) {
      onError(err?.message || 'Не удалось загрузить фото');
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const send = async () => {
    const t = text.trim();
    if ((!t && !pendingPhoto) || sending) return;
    setSending(true);
    try {
      const params: Record<string, any> = {
        peer_id: peerId,
        message: t,
        random_id: Math.floor(Math.random() * 1e9),
      };
      if (pendingPhoto) params.attachment = pendingPhoto;
      await api<number | { message_id: number }>('messages.send', params);
      setText('');
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
      setPendingPhoto(null);
      setPendingPreview(null);
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
          messages.map((m) => {
            const photo = msgPhotoUrl(m);
            const sticker = msgStickerUrl(m);
            return (
              <div className="ovk-msg__row" key={m.id}>
                <div className={`ovk-msg ${m.out ? 'ovk-msg--out' : 'ovk-msg--in'}`}>
                  {sticker ? (
                    <img src={sticker} alt="Стикер" style={{ width: 96, height: 96, display: 'block', marginBottom: m.text ? 6 : 0 }} />
                  ) : null}
                  {!sticker && photo ? (
                    <img
                      src={photo}
                      alt=""
                      style={{ maxWidth: 200, borderRadius: 6, display: 'block', marginBottom: m.text ? 6 : 0 }}
                    />
                  ) : null}
                  {m.text ? <div>{m.text}</div> : null}
                  <div className="ovk-msg__time">{fmtTime(m.date)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {pendingPhoto ? (
        <div style={{ position: 'relative', padding: '6px 10px 0', background: '#ebedf0' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={pendingPreview || ''}
              alt=""
              style={{ maxWidth: 80, maxHeight: 80, borderRadius: 6, border: '1px solid #d7d8db', display: 'block' }}
            />
            <button
              onClick={() => {
                if (pendingPreview) URL.revokeObjectURL(pendingPreview);
                setPendingPhoto(null);
                setPendingPreview(null);
              }}
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                width: 20,
                height: 20,
                borderRadius: 10,
                background: '#e64646',
                color: '#fff',
                border: 'none',
                fontSize: 12,
                lineHeight: '20px',
                padding: 0,
              }}
            >
              ×
            </button>
            <div style={{ fontSize: 11, color: '#818c99', marginTop: 2 }}>Фото прикреплено</div>
          </div>
        </div>
      ) : null}

      {stickerOpen ? (
        <div style={{ background: '#ebedf0', borderTop: '1px solid #d7d8db', padding: 10, maxHeight: 200, overflowY: 'auto' }}>
          {loadingStickers ? (
            <div className="ovk-loading">Загрузка стикеров...</div>
          ) : stickers.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#818c99', fontSize: 13, padding: 12 }}>
              Нет стикеров
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {stickers.slice(0, 60).map((st: any, i: number) => {
                const img = st.photo_128 || st.photo_64 || ((st.images || [])[1] || (st.images || [])[0] || {}).url;
                return img ? (
                  <img
                    key={(st.sticker_id || st.id) + '_' + i}
                    src={img}
                    alt=""
                    onClick={() => sendSticker(st)}
                    style={{ width: 56, height: 56, margin: 4, cursor: 'pointer' }}
                  />
                ) : null;
              })}
            </div>
          )}
        </div>
      ) : null}

      <div className="ovk-chat__composer">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onFile}
        />
        <button
          onClick={openStickers}
          title="Стикеры"
          style={{ display: 'flex', alignItems: 'center', padding: '0 4px' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2688eb" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M8.5 14.5c1 1.5 2.5 2.2 3.5 2.2s2.5-.7 3.5-2.2" />
            <circle cx="9" cy="10" r="1" fill="#2688eb" stroke="none" />
            <circle cx="15" cy="10" r="1" fill="#2688eb" stroke="none" />
          </svg>
        </button>
        <button
          onClick={pickPhoto}
          disabled={uploadingPhoto}
          title="Прикрепить фото"
          style={{ display: 'flex', alignItems: 'center', padding: '0 4px' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2688eb" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="#2688eb" stroke="none" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </button>
        <input
          placeholder={uploadingPhoto ? 'Загрузка фото…' : 'Сообщение'}
          value={text}
          onChange={(e: any) => setText(e.target.value)}
          onKeyDown={(e: any) => {
            if (e.key === 'Enter') send();
          }}
        />
        <button onClick={send} disabled={sending || (!text.trim() && !pendingPhoto)} style={{ display: 'flex', alignItems: 'center' }}>
          {sending ? '...' : <IconSend color="#2688eb" />}
        </button>
      </div>
    </div>
  );
}
