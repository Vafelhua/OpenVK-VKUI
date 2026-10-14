let el: HTMLAudioElement | null = null;
let current: Track | null = null;
let playing = false;
const listeners = new Set<() => void>();

export interface Track {
  id: number;
  owner_id: number;
  artist: string;
  title: string;
  duration: number;
  url?: string;
}

interface State {
  current: Track | null;
  playing: boolean;
}

let state: State = { current: null, playing: false };

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
    el.addEventListener('play', () => setState({ playing: true }));
    el.addEventListener('pause', () => setState({ playing: false }));
    el.addEventListener('ended', () => setState({ playing: false }));
    el.addEventListener('error', () => setState({ playing: false }));
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
    if (playing) a.pause();
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
  setState({ current: t, playing: !!t.url });
}

export function togglePlay() {
  const a = ensure();
  if (!current) return;
  if (playing) a.pause();
  else if (current.url) a.play().catch(() => {});
}

export function stopTrack() {
  if (el) {
    el.pause();
    el.removeAttribute('src');
  }
  current = null;
  setState({ current: null, playing: false });
}
