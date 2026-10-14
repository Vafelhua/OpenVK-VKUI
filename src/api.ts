const API_BASE = 'https://api.openvk.org/method/';
const TOKEN_URL = 'https://openvk.org/token';
const API_VERSION = '5.106';
const CLIENT_ID = '5027722';

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

async function request(
  url: string,
  init: RequestInit = {},
): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: 'parse', error_msg: text.slice(0, 200) };
  }
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
  const data = await request(url, { method: 'GET' });

  if (data && data.error) {
    const err: any = new Error(data.error_msg || 'API error');
    err.code = data.error_code;
    err.captcha_sid = data.captcha_sid;
    err.captcha_img = data.captcha_img;
    throw err;
  }
  return (data && data.response !== undefined ? data.response : data) as T;
}

export function asList<T>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data.items)) return data.items as T[];
  if (data.id !== undefined) return [data as T];
  return [];
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

export async function uploadWallPhoto(
  file: File,
  ownerId?: number,
): Promise<{ ownerId: number; id: number } | null> {
  const params: Record<string, any> = {};
  if (ownerId && ownerId < 0) params.group_id = String(-ownerId);
  const up = await api<any>('photos.getWallUploadServer', params);
  const uploadUrl = up && (up.upload_url || up.response && up.response.upload_url);
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

export interface AudioTrack {
  id: number;
  owner_id: number;
  artist: string;
  title: string;
  duration: number;
  url?: string;
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
