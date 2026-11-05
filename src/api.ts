const API_BASE = 'https://api.openvk.org/method/';
const TOKEN_URL = 'https://openvk.org/token';
const API_VERSION = '5.106';
const CLIENT_ID = '5027722';
const ANUBIS_PASS = 'https://openvk.org/.within.website/x/cmd/anubis/api/pass-challenge';

export interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  photo_50?: string;
  photo_100?: string;
  photo_200?: string;
  screen_name?: string;
  online?: number;
  status?: string;
  last_seen?: { time: number; platform?: number };
}

export interface FeedItem {
  type: string;
  source_id: number;
  date: number;
  text?: string;
  post_id?: number;
  id?: number;
  attachments?: any[];
  likes?: { count: number; user_likes?: number };
  comments?: { count: number };
  reposts?: { count: number };
  owner_id?: number;
}

export interface FeedResponse {
  items: FeedItem[];
  profiles?: UserProfile[];
  groups?: { id: number; name: string; photo_50?: string; photo_100?: string }[];
  next_from?: string;
}

export interface Conversation {
  last_message: {
    text: string;
    date: number;
    from_id: number;
    out: number;
  };
  peer: {
    id: number;
    type: string;
    local_id?: number;
  };
  unread_count?: number;
}

export interface Message {
  id: number;
  from_id: number;
  peer_id: number;
  date: number;
  text: string;
  out: number;
  attachments?: any[];
}

export class ApiError extends Error {
  code?: number;
  captchaSid?: string;
  captchaImg?: string;
  constructor(message: string, code?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

let authToken: string | null = null;

export function setToken(t: string | null) {
  authToken = t;
  try {
    if (t) localStorage.setItem('ovk_token', t);
    else {
      localStorage.removeItem('ovk_token');
      localStorage.removeItem('ovk_uid');
    }
  } catch {}
}

export function getToken(): string | null {
  if (authToken) return authToken;
  try {
    authToken = localStorage.getItem('ovk_token');
  } catch {}
  return authToken;
}

export function getStoredUserId(): number {
  try {
    return Number(localStorage.getItem('ovk_uid') || 0) || 0;
  } catch {
    return 0;
  }
}

/* ------------------------- external hooks ------------------------- */

let captchaSolver: ((img: string, sid: string) => Promise<string | null>) | null = null;
export function setCaptchaSolver(fn: ((img: string, sid: string) => Promise<string | null>) | null) {
  captchaSolver = fn;
}

let authErrorHandler: (() => void) | null = null;
export function setAuthErrorHandler(fn: (() => void) | null) {
  authErrorHandler = fn;
}

export function absoluteUrl(u?: string): string {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return 'https:' + u;
  return 'https://openvk.org' + (u.startsWith('/') ? u : '/' + u);
}

/* ------------------------- Anubis fallback ------------------------ */

function isAnubisChallenge(text: string): boolean {
  return text.indexOf('anubis_challenge') !== -1;
}

async function sha256Hex(input: string): Promise<string | null> {
  try {
    const subtle = globalThis.crypto && (globalThis.crypto as any).subtle;
    if (!subtle) return null;
    const buf = await subtle.digest('SHA-256', new TextEncoder().encode(input));
    const bytes = new Uint8Array(buf);
    let out = '';
    for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
    return out;
  } catch {
    return null;
  }
}

async function solveAnubis(html: string, pageUrl: string): Promise<boolean> {
  try {
    const m = html.match(/id="anubis_challenge"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) return false;
    const parsed = JSON.parse(m[1]);
    const ch = parsed && parsed.challenge;
    if (!ch || !ch.randomData || !ch.id) return false;
    const difficulty = Number(ch.difficulty) || 0;
    const fullBytes = Math.floor(difficulty / 2);
    const needHalf = difficulty % 2 === 1;
    const deadline = Date.now() + 20000;
    let nonce = 0;
    while (Date.now() < deadline) {
      const hex = await sha256Hex(String(ch.randomData) + String(nonce));
      if (!hex) return false;
      let ok = true;
      for (let i = 0; i < fullBytes; i++) {
        if (hex.substr(i * 2, 2) !== '00') {
          ok = false;
          break;
        }
      }
      if (ok && needHalf && hex.substr(fullBytes * 2, 1) !== '0') ok = false;
      if (ok) {
        const passUrl =
          ANUBIS_PASS +
          '?id=' + encodeURIComponent(String(ch.id)) +
          '&response=' + hex +
          '&nonce=' + nonce +
          '&redir=' + encodeURIComponent(pageUrl) +
          '&elapsedTime=120';
        try {
          await fetch(passUrl, { cache: 'no-store' });
        } catch {}
        return true;
      }
      nonce++;
    }
    return false;
  } catch {
    return false;
  }
}

async function request(url: string, init: RequestInit, canSolve = true): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (canSolve && isAnubisChallenge(text)) {
    const solved = await solveAnubis(text, url);
    if (solved) return request(url, init, false);
  }
  try {
    return JSON.parse(text);
  } catch {
    const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
    return { error: 'parse', error_msg: `HTTP ${res.status}: ${clean || 'пустой ответ'}` };
  }
}

/* ------------------------------ auth ------------------------------ */

export async function login(username: string, password: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: CLIENT_ID,
    client_secret: '',
    username,
    password,
    scope: 'messages,wall,photos,video,docs,audio,groups,friends,stats,offline',
    v: API_VERSION,
  }).toString();

  const data = await request(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (data && data.access_token) {
    setToken(data.access_token);
    if (data.user_id) {
      try {
        localStorage.setItem('ovk_uid', String(data.user_id));
      } catch {}
    }
    return data.access_token;
  }

  const err = data && data.error;
  if (err && typeof err === 'object') {
    const code = Number(err.error_code);
    const msg = String(err.error_msg || '');
    if (code === 28) throw new ApiError('Неверный логин или пароль', 28);
    if (/2fa|two.?factor|код подтверждения/i.test(msg)) {
      throw new ApiError('Включена двухфакторная авторизация — войдите через сайт openvk.org', code);
    }
    if (/captcha/i.test(msg)) {
      throw new ApiError('OpenVK требует капчу. Повторите попытку.', code);
    }
    throw new ApiError(msg || 'Не удалось войти', code);
  }
  const desc = (data && (data.error_description || data.error)) || 'Не удалось войти';
  throw new ApiError(String(desc));
}

/* ----------------------------- api call --------------------------- */

function apiErrorFrom(data: any): ApiError {
  const msg = String(data.error_msg || (typeof data.error === 'string' ? data.error : '') || 'Ошибка API');
  const err = new ApiError(msg, Number(data.error_code));
  err.captchaSid = data.captcha_sid ? String(data.captcha_sid) : undefined;
  err.captchaImg = data.captcha_img ? absoluteUrl(String(data.captcha_img)) : undefined;
  return err;
}

async function apiCall(method: string, params: Record<string, string | number | undefined>, extra: Record<string, string> = {}): Promise<any> {
  const token = getToken();
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  for (const [k, v] of Object.entries(extra)) q.set(k, v);
  if (token) q.set('access_token', token);
  q.set('v', API_VERSION);

  const data = await request(API_BASE + method + '?' + q.toString(), { method: 'GET' });

  if (data && data.error) {
    const code = Number(data.error_code ?? (data.error && data.error.error_code));
    const msg = String(data.error_msg || (data.error && data.error.error_msg) || '');
    if (code === 5 || code === 270 || /invalid access token/i.test(msg)) {
      if (authErrorHandler) authErrorHandler();
    }
    if (code === 14 && captchaSolver && data.captcha_sid) {
      let key: string | null = null;
      try {
        key = await captchaSolver(absoluteUrl(String(data.captcha_img || '')), String(data.captcha_sid));
      } catch {
        key = null;
      }
      if (key) {
        return apiCall(method, params, { captcha_sid: String(data.captcha_sid), captcha_key: key });
      }
    }
    throw apiErrorFrom(data);
  }
  return data && data.response !== undefined ? data.response : data;
}

export function api<T = any>(method: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  return apiCall(method, params) as Promise<T>;
}

export function asList<T>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data.items)) return data.items as T[];
  if (data.id !== undefined) return [data as T];
  return [];
}

/* ------------------- conversation shape helpers ------------------- */

export function conversationPeerId(item: any): number {
  if (!item) return 0;
  const c = item.conversation ? item.conversation : item;
  const p = c.peer;
  if (typeof p === 'number') return p;
  if (p && typeof p.id === 'number') return p.id;
  if (typeof c.peer_id === 'number') return c.peer_id;
  if (p && typeof p.local_id === 'number') return p.type === 'group' ? -p.local_id : p.local_id;
  return 0;
}

export function conversationLastMessage(item: any): any {
  if (!item) return null;
  return item.last_message || (item.conversation && item.conversation.last_message) || null;
}

export function conversationUnread(item: any): number {
  if (!item) return 0;
  const v = item.unread_count != null ? item.unread_count : item.conversation && item.conversation.unread_count;
  return Number(v) || 0;
}

/* ------------------------------ users ----------------------------- */

export function resolveUser(
  id: number,
  profiles?: UserProfile[],
  groups?: any[],
): { name: string; photo?: string } {
  if (id > 0) {
    const p = profiles?.find((x) => x.id === id);
    if (p) return { name: `${p.first_name} ${p.last_name}`, photo: p.photo_100 };
    return { name: 'Пользователь' };
  }
  const g = groups?.find((x) => x.id === -id);
  if (g) return { name: g.name, photo: g.photo_100 };
  return { name: 'Сообщество' };
}

export async function enrichWallAuthors(
  items: FeedItem[],
  profiles: UserProfile[],
  groups: any[],
): Promise<{ profiles: UserProfile[]; groups: any[] }> {
  const missingUsers = new Set<number>();
  const missingGroups = new Set<number>();
  for (const it of items) {
    const sid = it.source_id;
    if (!sid) continue;
    if (sid > 0) {
      if (!profiles.some((p) => p.id === sid)) missingUsers.add(sid);
    } else {
      if (!groups.some((g) => g.id === -sid)) missingGroups.add(-sid);
    }
  }
  const newProfiles: UserProfile[] = [];
  const newGroups: any[] = [];
  if (missingUsers.size) {
    try {
      const u = await api<any>('users.get', {
        user_ids: Array.from(missingUsers).join(','),
        fields: 'photo_100',
      });
      newProfiles.push(...asList<UserProfile>(u));
    } catch {}
  }
  if (missingGroups.size) {
    try {
      const g = await api<any>('groups.getById', {
        group_id: Array.from(missingGroups).join(','),
        fields: 'photo_100',
      });
      newGroups.push(...asList<any>(g));
    } catch {}
  }
  return {
    profiles: [...profiles, ...newProfiles],
    groups: [...groups, ...newGroups],
  };
}

/* ----------------------------- uploads ---------------------------- */

export async function uploadWallPhoto(
  file: File,
  ownerId?: number,
): Promise<{ ownerId: number; id: number } | null> {
  const params: Record<string, any> = {};
  if (ownerId && ownerId < 0) params.group_id = String(-ownerId);
  const up = await api<any>('photos.getWallUploadServer', params);
  const uploadUrl = up && (up.upload_url || (up.response && up.response.upload_url));
  if (!uploadUrl) throw new Error('Нет ссылки для загрузки');
  const fd = new FormData();
  fd.append('photo', file, file.name || 'photo.jpg');
  const res = await request(uploadUrl, { method: 'POST', body: fd });
  if (!res || !res.photo) throw new Error('Ошибка загрузки фото');
  const saved = await api<any>('photos.saveWallPhoto', {
    server: res.server,
    photo: res.photo,
    hash: res.hash,
    ...(ownerId && ownerId < 0 ? { group_id: String(-ownerId) } : {}),
  });
  const list = asList<any>(saved);
  if (!list.length) throw new Error('Не удалось сохранить фото');
  const ph = list[0];
  return { ownerId: ph.owner_id, id: ph.id };
}

export async function uploadAlbumPhoto(
  file: File,
  albumId?: number,
  groupId?: number,
): Promise<number | null> {
  const params: Record<string, any> = {};
  if (albumId) params.album_id = String(albumId);
  if (groupId) params.group_id = String(groupId);
  const up = await api<any>('photos.getUploadServer', params);
  const uploadUrl = up && (up.upload_url || (up.response && up.response.upload_url));
  if (!uploadUrl) throw new Error('Нет ссылки для загрузки');
  const fd = new FormData();
  fd.append('photo', file, file.name || 'photo.jpg');
  const res = await request(uploadUrl, { method: 'POST', body: fd });
  if (!res || !res.photo) throw new Error('Ошибка загрузки фото');
  const saved = await api<any>('photos.save', {
    server: res.server,
    photos_list: res.photos_list || res.photo,
    hash: res.hash,
    ...(albumId ? { album_id: String(albumId) } : {}),
    ...(groupId ? { group_id: String(groupId) } : {}),
  });
  const list = asList<any>(saved);
  return list.length ? Number(list[0].id) : null;
}

export async function uploadDocument(
  file: File,
): Promise<{ ownerId: number; id: number; title: string } | null> {
  const up = await api<any>('docs.getUploadServer', {});
  const uploadUrl = up && up.upload_url;
  if (!uploadUrl) throw new Error('Нет ссылки для загрузки');
  const fd = new FormData();
  fd.append('file', file, file.name || 'document');
  const res = await request(uploadUrl, { method: 'POST', body: fd });
  if (!res || !res.file) throw new Error('Ошибка загрузки документа');
  const saved = await api<any>('docs.save', { file: res.file, title: file.name });
  const list = asList<any>(saved);
  if (!list.length) throw new Error('Не удалось сохранить документ');
  return { ownerId: Number(list[0].owner_id), id: Number(list[0].id), title: String(list[0].title || file.name) };
}

export async function uploadMessagePhoto(
  file: File,
  peerId?: number,
): Promise<string | null> {
  const params: Record<string, any> = {};
  if (peerId) params.peer_id = String(peerId);
  const up = await api<any>('photos.getMessagesUploadServer', params);
  const uploadUrl = up && (up.upload_url || (up.response && up.response.upload_url));
  if (!uploadUrl) throw new Error('Нет ссылки для загрузки');
  const fd = new FormData();
  fd.append('photo', file, file.name || 'photo.jpg');
  const res = await request(uploadUrl, { method: 'POST', body: fd });
  if (!res || !res.photo) throw new Error('Ошибка загрузки фото');
  const saved = await api<any>('photos.saveMessagesPhoto', {
    server: res.server,
    photo: res.photo,
    hash: res.hash,
  });
  const list = asList<any>(saved);
  if (!list.length) throw new Error('Не удалось сохранить фото');
  const ph = list[0];
  return 'photo' + ph.owner_id + '_' + ph.id + (ph.access_key ? '_' + ph.access_key : '');
}

export interface AudioTrack {
  id: number;
  owner_id: number;
  artist: string;
  title: string;
  duration: number;
  url?: string;
  lyrics?: number;
}
