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
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollAnswers, setPollAnswers] = useState<string[]>(['', '']);
  const [pollMultiple, setPollMultiple] = useState(false);
  const [poll, setPoll] = useState<{ id: number; owner_id: number } | null>(null);

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
    if ((!t && !photoFile && !audio && !poll) || busy) return;
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
      if (poll) {
        attachments.push('poll' + poll.owner_id + '_' + poll.id);
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
        attachments: photoFile || audio || poll ? [
          ...(photoFile ? [{ type: 'photo', photo: { sizes: [{ type: 'x', url: photoPreview }] } }] : []),
          ...(audio ? [{ type: 'audio', audio }] : []),
          ...(poll ? [{ type: 'poll', poll: { id: poll.id, question: pollQuestion, answers: pollAnswers.filter(Boolean).map((a, i) => ({ id: i + 1, text: a, votes: 0 })) } }] : []),
        ] : undefined,
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

  const createPoll = async () => {
    const q = pollQuestion.trim();
    const answers = pollAnswers.map((a) => a.trim()).filter(Boolean);
    if (!q || answers.length < 2) {
      onError('Нужен вопрос и минимум 2 варианта');
      return;
    }
    try {
      const res = await api<any>('polls.create', {
        question: q,
        add_answers: answers.join(','),
        is_multiple: pollMultiple ? 1 : 0,
        is_anonymous: 0,
      });
      const obj = res && typeof res === 'object' && !Array.isArray(res) ? res : null;
      const id = obj ? obj.id || obj.poll_id : Array.isArray(res) && res[0] ? res[0].id : typeof res === 'number' ? res : 0;
      const owner = obj ? obj.owner_id || meId : meId;
      if (!id) throw new Error('Не удалось создать опрос');
      setPoll({ id, owner_id: owner });
      setPollOpen(false);
    } catch (e: any) {
      onError(e?.message || 'Не удалось создать опрос');
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
          disabled={busy || (!text.trim() && !photoFile && !audio && !poll)}
          style={{ fontWeight: 600, opacity: busy || (!text.trim() && !photoFile && !audio && !poll) ? 0.5 : 1 }}
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

      {poll ? (
        <div className="ovk-compose__preview ovk-compose__preview--audio">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Опрос: {pollQuestion}</div>
            <div style={{ fontSize: 12, color: '#818c99' }}>
              {pollAnswers.filter(Boolean).length} варианта
            </div>
          </div>
          <button className="ovk-compose__remove" onClick={() => setPoll(null)}>
            <IconClose color="#fff" size={14} />
          </button>
        </div>
      ) : null}

      <div className="ovk-compose__toolbar">
        <button onClick={pickPhoto}>Фото</button>
        <button onClick={openAudioPicker}>Музыка</button>
        <button onClick={() => setPollOpen(true)}>Опрос</button>
      </div>

      {pollOpen ? (
        <div className="ovk-audio-picker" style={{ maxHeight: '70%' }}>
          <div className="ovk-compose__header">
            <button className="ovk-header__action" onClick={() => setPollOpen(false)}>
              Назад
            </button>
            <div className="ovk-header__title">Новый опрос</div>
            <button className="ovk-header__action" onClick={createPoll} style={{ fontWeight: 600 }}>
              Готово
            </button>
          </div>
          <div style={{ padding: 12 }}>
            <input
              placeholder="Вопрос"
              value={pollQuestion}
              onChange={(e: any) => setPollQuestion(e.target.value)}
              className="ovk-login__field"
              style={{ width: '100%', marginBottom: 10 }}
            />
            {pollAnswers.map((a, i) => (
              <div key={i} style={{ display: 'flex', marginBottom: 8 }}>
                <input
                  placeholder={'Вариант ' + (i + 1)}
                  value={a}
                  onChange={(e: any) => {
                    const next = pollAnswers.slice();
                    next[i] = e.target.value;
                    setPollAnswers(next);
                  }}
                  className="ovk-login__field"
                  style={{ flex: 1 }}
                />
                {pollAnswers.length > 2 ? (
                  <button
                    onClick={() => setPollAnswers(pollAnswers.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', color: '#e64646', padding: '0 8px', fontSize: 18 }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
            {pollAnswers.length < 10 ? (
              <button
                onClick={() => setPollAnswers([...pollAnswers, ''])}
                style={{ background: 'none', border: 'none', color: '#2688eb', padding: 0, fontSize: 14 }}
              >
                + Добавить вариант
              </button>
            ) : null}
            <label style={{ display: 'flex', alignItems: 'center', marginTop: 12, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={pollMultiple}
                onChange={(e: any) => setPollMultiple(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Множественный выбор
            </label>
          </div>
        </div>
      ) : null}

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
