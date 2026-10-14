import { CapacitorHttp } from '@capacitor/core';

const API_BASE = 'https://api.openvk.org/method/';
const TOKEN_URL = 'https://openvk.org/token';
const API_VERSION = '5.106';
const CLIENT_ID = '5027722';

export const OKHTTP_UA = 'okhttp/4.9.0';

export interface TokenResponse {
  access_token: string;
  expires_in?: number;
  user_id?: number;
  email?: string;
  error?: string;
  error_description?: string;
}

export interface ApiError {
  error_code: number;
  error_msg: string;
}

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
  photos?: { items: any[] };
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
  push_settings?: any;
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

let authToken: string | null = null;

export function setToken(t: string | null) {
  authToken = t;
  try {
    if (t) localStorage.setItem('ovk_token', t);
    else localStorage.removeItem('ovk_token');
  } catch {}
}

export function getToken(): string | null {
  if (authToken) return authToken;
  try {
    authToken = localStorage.getItem('ovk_token');
  } catch {}
  return authToken;
}

async function nativeRequest(opts: {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  data?: string | Record<string, any>;
  contentType?: string;
}): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    'User-Agent': OKHTTP_UA,
    ...opts.headers,
  };
  if (opts.contentType) headers['Content-Type'] = opts.contentType;

  const res = await CapacitorHttp.request({
    url: opts.url,
    method: opts.method,
    headers,
    data: opts.data,
    connectTimeout: 30000,
    readTimeout: 30000,
  });

  let data = res.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {}
  }
  return { status: res.status, data };
}

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

  const { data } = await nativeRequest({
    url: TOKEN_URL,
    method: 'POST',
    data: body,
    contentType: 'application/x-www-form-urlencoded',
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
  const desc =
    (data && (data.error_description || data.error)) || 'Не удалось войти';
  throw new Error(String(desc));
}

export async function api<T = any>(
  method: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const token = getToken();
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  if (token) q.set('access_token', token);
  q.set('v', API_VERSION);

  const url = API_BASE + method + '?' + q.toString();
  const { data } = await nativeRequest({ url, method: 'GET' });

  if (data && data.error) {
    const err: any = new Error(data.error_msg || 'API error');
    err.code = data.error_code;
    err.captcha_sid = data.captcha_sid;
    err.captcha_img = data.captcha_img;
    throw err;
  }
  return (data && data.response !== undefined ? data.response : data) as T;
}

export function peerIdFromConversation(c: Conversation): number {
  return c.peer.id;
}

export function titleForPeer(peerId: number, profiles?: UserProfile[], groups?: any[]): string {
  if (peerId > 0) {
    const p = profiles?.find((x) => x.id === peerId);
    return p ? `${p.first_name} ${p.last_name}` : 'Пользователь';
  }
  const g = groups?.find((x) => x.id === -peerId);
  return g ? g.name : 'Сообщество';
}

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
