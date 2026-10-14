import { useState } from 'react';
import { api, asList, uploadWallPhoto, AudioTrack, FeedItem } from '../api';
import { IconClose } from './Icons';

interface Props {
  meId: number;
  ownerId: number;
  onClose: () => void;
  onPosted: (item: FeedItem) => void;
  onError: (msg: string) => void;
  placeholder?: string;
}

export function WallComposer({ meId, ownerId, onClose, onPosted, onError, placeholder }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [audio, setAudio] = useState<AudioTrack | null>(null);
  const [audioPickerOpen, setAudioPickerOpen] = useState(false);
  const [audioList, setAudioList] = useState<AudioTrack[]>([]);
  const [audioQ, setAudioQ] = useState('');
  const [audioLoading, setAudioLoading] = useState(false);

  const pickPhoto = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      setPhotoFile(f);
      setPhotoPreview(URL.createObjectURL(f));
    };
    inp.click();
  };

  const openAudioPicker = async () => {
    setAudioPickerOpen(true);
    setAudioLoading(true);
    try {
      const data = await api<any>('audio.get', { count: 50, q: audioQ || undefined });
      setAudioList(asList<AudioTrack>(data));
    } catch {
      setAudioList([]);
    } finally {
      setAudioLoading(false);
    }
  };

  const searchAudio = async () => {
    setAudioLoading(true);
    try {
      const data = await api<any>('audio.search', { q: audioQ.trim(), count: 50 });
      setAudioList(asList<AudioTrack>(data));
    } catch {
      setAudioList([]);
    } finally {
      setAudioLoading(false);
    }
  };

  const post = async () => {
    const t = text.trim();
    if ((!t && !photoFile && !audio) || busy) return;
    setBusy(true);
    try {
      let attachments: string[] = [];
      if (photoFile) {
        const up = await uploadWallPhoto(photoFile, ownerId);
        if (up) attachments.push('photo' + up.ownerId + '_' + up.id);
      }
      if (audio) {
        attachments.push('audio' + audio.owner_id + '_' + audio.id);
      }
      const params: Record<string, any> = { message: t };
      if (ownerId < 0) params.owner_id = String(ownerId);
      if (attachments.length) params.attachments = attachments.join(',');
      const res = await api<any>('wall.post', params);
      const ids = asList<{ id: number; owner_id: number }>(res);
      const pid = ids.length ? ids[0].id : typeof res === 'number' ? res : 0;
      onPosted({
        type: 'post',
        source_id: ownerId < 0 ? ownerId : meId,
        owner_id: ownerId,
        date: Math.floor(Date.now() / 1000),
        text: t,
        post_id: pid,
        attachments: photoFile || audio ? [...(photoFile ? [{ type: 'photo', photo: { sizes: [{ type: 'x', url: photoPreview }] } }] : []), ...(audio ? [{ type: 'audio', audio }] : [])] : undefined,
        likes: { count: 0, user_likes: 0 },
        comments: { count: 0 },
        reposts: { count: 0 },
      });
    } catch (e: any) {
      onError(e?.message || 'Не удалось опубликовать');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ovk-compose">
      <div className="ovk-compose__header">
        <button className="ovk-header__action" onClick={onClose}>
          Отмена
        </button>
        <div className="ovk-header__title">Новая запись</div>
        <button
          className="ovk-header__action"
          onClick={post}
          disabled={busy || (!text.trim() && !photoFile && !audio)}
          style={{ fontWeight: 600, opacity: busy || (!text.trim() && !photoFile && !audio) ? 0.5 : 1 }}
        >
          {busy ? '...' : 'Готово'}
        </button>
      </div>
      <textarea
        placeholder={placeholder || 'Что у вас нового?'}
        value={text}
        onChange={(e: any) => setText(e.target.value)}
        autoFocus
      />

      {photoPreview ? (
        <div className="ovk-compose__preview">
          <img src={photoPreview} alt="" />
          <button className="ovk-compose__remove" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>
            <IconClose color="#fff" size={14} />
          </button>
        </div>
      ) : null}

      {audio ? (
        <div className="ovk-compose__preview ovk-compose__preview--audio">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {audio.title}
            </div>
            <div style={{ fontSize: 12, color: '#818c99' }}>{audio.artist}</div>
          </div>
          <button className="ovk-compose__remove" onClick={() => setAudio(null)}>
            <IconClose color="#fff" size={14} />
          </button>
        </div>
      ) : null}

      <div className="ovk-compose__toolbar">
        <button onClick={pickPhoto}>Фото</button>
        <button onClick={openAudioPicker}>Музыка</button>
      </div>

      {audioPickerOpen ? (
        <div className="ovk-audio-picker">
          <div className="ovk-compose__header">
            <button className="ovk-header__action" onClick={() => setAudioPickerOpen(false)}>
              Назад
            </button>
            <div className="ovk-header__title">Аудио</div>
            <div style={{ width: 70 }} />
          </div>
          <div className="ovk-search" style={{ margin: '0 12px 8px' }}>
            <input
              placeholder="Поиск"
              value={audioQ}
              onChange={(e: any) => setAudioQ(e.target.value)}
              onKeyDown={(e: any) => { if (e.key === 'Enter') searchAudio(); }}
            />
            <button onClick={searchAudio} style={{ background: 'none', border: 'none', color: '#2688eb', fontWeight: 600 }}>
              Найти
            </button>
          </div>
          {audioLoading ? (
            <div className="ovk-loading">Загрузка...</div>
          ) : audioList.length === 0 ? (
            <div className="ovk-empty">Нет аудио</div>
          ) : (
            audioList.map((a) => (
              <div
                key={a.owner_id + '_' + a.id}
                className="ovk-audio"
                onClick={() => { setAudio(a); setAudioPickerOpen(false); }}
              >
                <div className="ovk-audio__body">
                  <div className="ovk-audio__title">{a.title}</div>
                  <div className="ovk-audio__artist">{a.artist}</div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
