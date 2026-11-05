let el: HTMLAudioElement | null = null;
let current: Track | null = null;
const listeners = new Set<() => void>();

export interface Track {
  id: number;
  owner_id: number;
  artist: string;
  title: string;
  duration: number;
  url?: string;
  lyrics?: number;
}

interface State {
  current: Track | null;
  playing: boolean;
  position: number;
  duration: number;
}

let state: State = { current: null, playing: false, position: 0, duration: 0 };

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  emit();
}

function emit() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

function ensure(): HTMLAudioElement {
  if (!el) {
    el = new Audio();
    el.preload = 'metadata';
    el.addEventListener('play', () => setState({ playing: true }));
    el.addEventListener('pause', () => setState({ playing: false }));
    el.addEventListener('ended', () => setState({ playing: false, position: 0 }));
    el.addEventListener('error', () => setState({ playing: false }));
    el.addEventListener('timeupdate', () => {
      const d = el && isFinite(el.duration) ? el.duration : 0;
      setState({ position: el ? el.currentTime : 0, duration: d });
    });
    el.addEventListener('loadedmetadata', () => {
      const d = el && isFinite(el.duration) ? el.duration : 0;
      setState({ duration: d });
    });
  }
  return el;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getState(): State {
  return state;
}

export function playTrack(t: Track, onError?: (msg: string) => void) {
  const a = ensure();
  if (current && current.id === t.id && current.owner_id === t.owner_id) {
    if (state.playing) a.pause();
    else a.play().catch(() => onError && onError('Не удалось воспроизвести'));
    return;
  }
  current = t;
  if (t.url) {
    a.src = t.url;
    a.play().catch(() => {
      setState({ playing: false });
      if (onError) onError('Нет доступа к аудио');
    });
  } else {
    if (onError) onError('Трек без ссылки');
  }
  setState({ current: t, playing: !!t.url, position: 0, duration: t.duration || 0 });
}

export function togglePlay() {
  const a = ensure();
  if (!current) return;
  if (state.playing) a.pause();
  else if (current.url) a.play().catch(() => {});
}

export function seek(seconds: number) {
  const a = ensure();
  if (!current) return;
  try {
    a.currentTime = Math.max(0, seconds);
    setState({ position: Math.max(0, seconds) });
  } catch {}
}

export function stopTrack() {
  if (el) {
    try {
      el.pause();
      el.currentTime = 0;
      el.removeAttribute('src');
      el.load();
    } catch {}
  }
  current = null;
  setState({ current: null, playing: false, position: 0, duration: 0 });
}
