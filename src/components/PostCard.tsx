import { useState } from 'react';
import { api, asList, FeedItem, UserProfile, resolveUser } from '../api';
import { IconHeart, IconComment, IconShare, IconSend, IconBack } from './Icons';

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
  return (
    String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0')
  );
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
      <a key={k++} href={m[0]} target="_blank" rel="noopener">
        {m[0]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function photoUrls(item: FeedItem): string[] {
  const photos: string[] = [];
  if (item.attachments) {
    for (const a of item.attachments) {
      if (a.type === 'photo' && a.photo) {
        const sizes = a.photo.sizes || [];
        const best = sizes.find((x: any) => x.type === 'x') || sizes[sizes.length - 1];
        if (best && best.url) photos.push(best.url);
      }
    }
  }
  return photos;
}

interface CommentItem {
  id: number;
  from_id: number;
  date: number;
  text: string;
  likes?: { count: number };
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

  const author = resolveUser(item.source_id, profiles, groups);
  const photos = photoUrls(item);
  const liked = !!(item.likes && item.likes.user_likes);
  const oid = item.owner_id != null ? item.owner_id : item.source_id;
  const pid = item.post_id || item.id || 0;

  const openComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }
    setShowComments(true);
    if (comments !== null) return;
    setLoadingComments(true);
    try {
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
    } catch (e: any) {
      if (onError) onError(e?.message || 'Не удалось отправить комментарий');
    } finally {
      setSending(false);
    }
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
          {photos.slice(0, 4).map((url, i) => (
            <img key={i} src={url} loading="lazy" alt="" />
          ))}
        </div>
      ) : null}
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
            <div className="ovk-loading" style={{ padding: 12 }}>Загрузка...</div>
          ) : comments === null ? null : comments.length === 0 ? (
            <div className="ovk-comments__empty">Нет комментариев</div>
          ) : (
            comments.map((c) => {
              const cu = resolveUser(c.from_id, commentProfiles, []);
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
                    <div className="ovk-comment__time">{timeAgo(c.date)}</div>
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
