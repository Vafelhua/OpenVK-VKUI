import { FeedItem, UserProfile, resolveUser } from '../api';
import { IconHeart, IconComment, IconShare } from './Icons';

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
    String(d.getDate()).padStart(2, '0') +
    '.' +
    String(d.getMonth() + 1).padStart(2, '0')
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

export function PostCard({
  item,
  profiles,
  groups,
  onLike,
  onOpenAuthor,
}: {
  item: FeedItem;
  profiles?: UserProfile[];
  groups?: any[];
  onLike?: (item: FeedItem) => void;
  onOpenAuthor?: (id: number) => void;
}) {
  const author = resolveUser(item.source_id, profiles, groups);
  const photos = photoUrls(item);
  const liked = !!(item.likes && item.likes.user_likes);
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
          <div
            className="ovk-avatar ovk-avatar--sm"
            onClick={() => onOpenAuthor && onOpenAuthor(item.source_id)}
          />
        )}
        <div
          className="ovk-post__author"
          onClick={() => onOpenAuthor && onOpenAuthor(item.source_id)}
        >
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
        <button>
          <IconComment color="#818c99" />
          {item.comments ? item.comments.count : 0}
        </button>
        <button>
          <IconShare color="#818c99" />
          {item.reposts ? item.reposts.count : 0}
        </button>
      </div>
    </article>
  );
}
