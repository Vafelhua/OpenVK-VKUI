import { useState } from 'react';
import { api, asList, FeedItem, UserProfile, resolveUser, absoluteUrl } from '../api';
import { IconHeart, IconComment, IconShare, IconSend } from './Icons';
import { playTrack } from '../player';
import { copyToClipboard } from '../utils/external';

function timeAgo(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return Math.floor(diff / 60) + ' мин';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (d.toDateString() === now.toDateString()) return hh + ':' + mm;
  const y = new Date(now.getTime() - 86400000);
  if (d.toDateString() === y.toDateString()) return 'вчера';
  return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0');
}

function linkify(text: string): any[] {
  const parts: any[] = [];
  const re = /(https?:\/\/[^\s<]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <a key={k++} href={m[0]} target="_blank" rel="noopener noreferrer">
        {m[0]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function bestPhoto(photo: any): { url: string; w?: number; h?: number } | null {
  if (!photo) return null;
  const sizes = photo.sizes || [];
  const best =
    sizes.find((x: any) => x.type === 'x') ||
    sizes.find((x: any) => x.type === 'y') ||
    sizes.find((x: any) => x.type === 'z') ||
    sizes[sizes.length - 1];
  if (best && best.url) return { url: absoluteUrl(best.url), w: best.width, h: best.height };
  if (photo.photo_604) return { url: absoluteUrl(photo.photo_604) };
  return null;
}

interface CommentItem {
  id: number;
  from_id: number;
  date: number;
  text: string;
  likes?: { count: number; user_likes?: number };
  reply_to_comment?: number;
}

export function PostCard({
  item,
  profiles,
  groups,
  onLike,
  onRepost,
  onOpenAuthor,
  onError,
}: {
  item: FeedItem;
  profiles?: UserProfile[];
  groups?: any[];
  onLike?: (item: FeedItem) => void;
  onRepost?: (item: FeedItem) => void;
  onOpenAuthor?: (id: number) => void;
  onError?: (msg: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [commentProfiles, setCommentProfiles] = useState<UserProfile[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [sending, setSending] = useState(false);
  const [votedPoll, setVotedPoll] = useState<Record<string, number[]>>({});

  const author = resolveUser(item.source_id, profiles, groups);
  const liked = !!(item.likes && item.likes.user_likes);
  const oid = item.owner_id != null ? item.owner_id : item.source_id;
  const pid = item.post_id || item.id || 0;

  const photos: { url: string }[] = [];
  const others: any[] = [];
  if (item.attachments) {
    for (const a of item.attachments) {
      if (a.type === 'photo' && a.photo) {
        const p = bestPhoto(a.photo);
        if (p) photos.push(p);
      } else {
        others.push(a);
      }
    }
  }

  const loadComments = async () => {
    const data = await api<any>('wall.getComments', {
      owner_id: String(oid),
      post_id: String(pid),
      count: 30,
      extended: 1,
      fields: 'photo_50',
    });
    setComments(asList<CommentItem>(data));
    if (data && !Array.isArray(data) && Array.isArray(data.profiles)) {
      setCommentProfiles(data.profiles);
    }
  };

  const openComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }
    setShowComments(true);
    if (comments !== null) return;
    setLoadingComments(true);
    try {
      await loadComments();
    } catch (e: any) {
      setComments([]);
      if (onError) onError(e?.message || 'Комментарии недоступны');
    } finally {
      setLoadingComments(false);
    }
  };

  const sendComment = async () => {
    const t = commentText.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await api('wall.addComment', {
        owner_id: String(oid),
        post_id: String(pid),
        message: t,
        from_group: 0,
      });
      setCommentText('');
      await loadComments();
    } catch (e: any) {
      if (onError) onError(e?.message || 'Не удалось отправить комментарий');
    } finally {
      setSending(false);
    }
  };

  const likeComment = async (c: CommentItem) => {
    const already = !!(c.likes && c.likes.user_likes);
    try {
      await api('likes.' + (already ? 'delete' : 'add'), {
        type: 'comment',
        owner_id: String(oid),
        item_id: String(c.id),
      });
      setComments((prev) =>
        (prev || []).map((x) =>
          x.id === c.id
            ? {
                ...x,
                likes: {
                  count: Math.max(0, (x.likes?.count || 0) + (already ? -1 : 1)),
                  user_likes: already ? 0 : 1,
                },
              }
            : x,
        ),
      );
    } catch (e: any) {
      if (onError) onError(e?.message || 'Ошибка');
    }
  };

  const votePoll = async (poll: any) => {
    const key = String(poll.id);
    const selected = votedPoll[key];
    if (!selected || !selected.length) {
      if (onError) onError('Выберите вариант ответа');
      return;
    }
    try {
      await api('polls.addVote', {
        poll_id: poll.owner_id != null ? `${poll.owner_id}_${poll.id}` : String(poll.id),
        answer_ids: selected.join(','),
      });
      setVotedPoll((prev) => ({ ...prev, [key]: selected }));
    } catch (e: any) {
      if (onError) onError(e?.message || 'Не удалось проголосовать');
    }
  };

  const toggleVote = (poll: any, answerId: number) => {
    const key = String(poll.id);
    const selected = votedPoll[key] || [];
    const multiple = !!poll.multiple;
    let next: number[];
    if (multiple) {
      next = selected.includes(answerId) ? selected.filter((x) => x !== answerId) : [...selected, answerId];
    } else {
      next = [answerId];
    }
    setVotedPoll((prev) => ({ ...prev, [key]: next }));
  };

  const renderAttachment = (a: any, idx: number) => {
    if (a.type === 'poll' && a.poll) {
      const poll = a.poll;
      const selected = votedPoll[String(poll.id)] || (poll.answer_ids || []).map((x: any) => Number(x));
      const total = (poll.answers || []).reduce((s: number, x: any) => s + (Number(x.votes) || 0), 0);
      const voted = !!(poll.answer_ids && poll.answer_ids.length);
      return (
        <div className="ovk-poll" key={'a' + idx}>
          <div className="ovk-poll__q">{poll.question}</div>
          {(poll.answers || []).map((ans: any) => {
            const isSel = selected.includes(Number(ans.id));
            const pct = total > 0 ? Math.round(((Number(ans.votes) || 0) / total) * 100) : 0;
            return (
              <div
                key={ans.id}
                className={'ovk-poll__a' + (isSel ? ' selected' : '')}
                onClick={() => toggleVote(poll, Number(ans.id))}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{ans.text}</span>
                  <span style={{ color: '#818c99', fontSize: 12 }}>{voted ? pct + '%' : ''}</span>
                </div>
                {voted ? <div className="ovk-poll__bar" style={{ width: pct + '%' }} /> : null}
              </div>
            );
          })}
          {!voted ? (
            <button className="ovk-btn-primary ovk-poll__btn" onClick={() => votePoll(poll)}>
              Голосовать
            </button>
          ) : (
            <div className="ovk-poll__meta">{total} голосов</div>
          )}
        </div>
      );
    }
    if (a.type === 'audio' && a.audio) {
      return (
        <div
          className="ovk-audio-attach"
          key={'a' + idx}
          onClick={() =>
            playTrack(
              {
                id: a.audio.id,
                owner_id: a.audio.owner_id,
                artist: a.audio.artist || '',
                title: a.audio.title || '',
                duration: a.audio.duration || 0,
                url: a.audio.url,
              },
              onError,
            )
          }
        >
          <span style={{ fontSize: 18 }}>♪</span>
          <div style={{ minWidth: 0 }}>
            <div className="ovk-audio-attach__title">{a.audio.title}</div>
            <div className="ovk-audio-attach__artist">{a.audio.artist}</div>
          </div>
        </div>
      );
    }
    if (a.type === 'video' && a.video) {
      const poster = absoluteUrl(a.video.photo_320 || a.video.photo_800 || '');
      return (
        <div className="ovk-link-attach" key={'a' + idx}>
          {poster ? <img src={poster} alt="" className="ovk-link-attach__img" /> : null}
          <div className="ovk-link-attach__body">
            <div className="ovk-link-attach__title">{a.video.title}</div>
            <div className="ovk-link-attach__desc">Видео</div>
          </div>
        </div>
      );
    }
    if (a.type === 'doc' && a.doc) {
      return (
        <div className="ovk-link-attach" key={'a' + idx}>
          <div className="ovk-doc-icon">{(a.doc.ext || 'FILE').toUpperCase().slice(0, 4)}</div>
          <div className="ovk-link-attach__body">
            <div className="ovk-link-attach__title">{a.doc.title}</div>
            <div className="ovk-link-attach__desc">Документ</div>
          </div>
        </div>
      );
    }
    if (a.type === 'link' && a.link) {
      return (
        <div
          className="ovk-link-attach"
          key={'a' + idx}
          onClick={async () => {
            const ok = await copyToClipboard(a.link.url);
            if (onError) onError(ok ? 'Ссылка скопирована' : a.link.url);
          }}
        >
          {a.link.photo && a.link.photo.photo_130 ? (
            <img src={absoluteUrl(a.link.photo.photo_130)} alt="" className="ovk-link-attach__img" />
          ) : null}
          <div className="ovk-link-attach__body">
            <div className="ovk-link-attach__title">{a.link.title || a.link.url}</div>
            <div className="ovk-link-attach__desc">{a.link.url}</div>
          </div>
        </div>
      );
    }
    if (a.type === 'sticker' && a.sticker) {
      const imgs = a.sticker.images || [];
      const best = imgs.length ? imgs[imgs.length - 1] : null;
      const url = best ? best.url : a.sticker.photo_128 || a.sticker.photo_64;
      return url ? (
        <img key={'a' + idx} src={absoluteUrl(url)} alt="" className="ovk-post__sticker" />
      ) : null;
    }
    if (a.type === 'note' && a.note) {
      return (
        <div className="ovk-link-attach" key={'a' + idx}>
          <div className="ovk-link-attach__body">
            <div className="ovk-link-attach__title">{a.note.title}</div>
            <div className="ovk-link-attach__desc">Заметка</div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <article className="ovk-post">
      <div className="ovk-post__head">
        {author.photo ? (
          <img
            className="ovk-avatar ovk-avatar--sm"
            src={author.photo}
            alt=""
            onClick={() => onOpenAuthor && onOpenAuthor(item.source_id)}
          />
        ) : (
          <div className="ovk-avatar ovk-avatar--sm" onClick={() => onOpenAuthor && onOpenAuthor(item.source_id)} />
        )}
        <div className="ovk-post__author" onClick={() => onOpenAuthor && onOpenAuthor(item.source_id)}>
          {author.name}
          <span>{timeAgo(item.date)}</span>
        </div>
      </div>
      {item.text ? <div className="ovk-post__text">{linkify(item.text)}</div> : null}
      {photos.length > 0 ? (
        <div className={'ovk-post__photos' + (photos.length === 1 ? ' ovk-post__photos--1' : '')}>
          {photos.slice(0, 4).map((p, i) => (
            <img key={i} src={p.url} loading="lazy" alt="" />
          ))}
        </div>
      ) : null}
      {others.map(renderAttachment)}
      <div className="ovk-post__actions">
        <button className={liked ? 'liked' : ''} onClick={() => onLike && onLike(item)}>
          <IconHeart filled={liked} color={liked ? '#2688eb' : '#818c99'} />
          {item.likes ? item.likes.count : 0}
        </button>
        <button onClick={openComments}>
          <IconComment color={showComments ? '#2688eb' : '#818c99'} />
          {item.comments ? item.comments.count : 0}
        </button>
        <button onClick={() => onRepost && onRepost(item)}>
          <IconShare color="#818c99" />
          {item.reposts ? item.reposts.count : 0}
        </button>
      </div>

      {showComments ? (
        <div className="ovk-comments">
          {loadingComments ? (
            <div className="ovk-loading" style={{ padding: 12 }}>
              Загрузка...
            </div>
          ) : comments === null ? null : comments.length === 0 ? (
            <div className="ovk-comments__empty">Нет комментариев</div>
          ) : (
            comments.map((c) => {
              const cu = resolveUser(c.from_id, commentProfiles, []);
              const cliked = !!(c.likes && c.likes.user_likes);
              return (
                <div className="ovk-comment" key={c.id}>
                  {cu.photo ? (
                    <img className="ovk-comment__avatar" src={cu.photo} alt="" />
                  ) : (
                    <div className="ovk-comment__avatar" />
                  )}
                  <div className="ovk-comment__body">
                    <div className="ovk-comment__name">{cu.name}</div>
                    <div className="ovk-comment__text">{c.text}</div>
                    <div className="ovk-comment__time">
                      <span>{timeAgo(c.date)}</span>
                      <button className={'ovk-comment__like' + (cliked ? ' liked' : '')} onClick={() => likeComment(c)}>
                        <IconHeart filled={cliked} color={cliked ? '#2688eb' : '#818c99'} size={14} />
                        {c.likes ? c.likes.count : ''}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div className="ovk-comments__composer">
            <input
              placeholder="Комментарий..."
              value={commentText}
              onChange={(e: any) => setCommentText(e.target.value)}
              onKeyDown={(e: any) => {
                if (e.key === 'Enter') sendComment();
              }}
            />
            <button onClick={sendComment} disabled={sending || !commentText.trim()}>
              <IconSend color={commentText.trim() ? '#2688eb' : '#a8adb5'} />
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
