import { useSyncExternalStore } from 'react';
import { getState, subscribe, togglePlay, stopTrack, seek } from '../player';
import { IconPlay, IconPause, IconClose, IconNote } from './Icons';

export function usePlayer() {
  useSyncExternalStore(subscribe, getState, getState);
  return { ...getState(), togglePlay, stopTrack, seek };
}

function fmt(t: number): string {
  if (!isFinite(t) || t < 0) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return m + ':' + String(s).padStart(2, '0');
}

export function MiniPlayer({ onOpenMusic }: { onOpenMusic: () => void }) {
  const { current, playing, position, duration } = usePlayer();
  if (!current) return null;
  const total = duration || current.duration || 0;
  const pct = total > 0 ? Math.min(100, Math.max(0, (position / total) * 100)) : 0;
  return (
    <div className="ovk-miniplayer" onClick={onOpenMusic}>
      <div className="ovk-miniplayer__art">
        <IconNote color="#2688eb" />
      </div>
      <div className="ovk-miniplayer__info">
        <div className="ovk-miniplayer__title">{current.title}</div>
        <div className="ovk-miniplayer__artist">
          {current.artist}
          {total > 0 ? ` · ${fmt(position)} / ${fmt(total)}` : ''}
        </div>
        <div className="ovk-miniplayer__progress">
          <div className="ovk-miniplayer__progress-fill" style={{ width: pct + '%' }} />
        </div>
      </div>
      <button
        className="ovk-icon-btn"
        onClick={(e: any) => {
          e.stopPropagation();
          togglePlay();
        }}
      >
        {playing ? <IconPause color="#2688eb" /> : <IconPlay color="#2688eb" />}
      </button>
      <button
        className="ovk-icon-btn"
        onClick={(e: any) => {
          e.stopPropagation();
          stopTrack();
        }}
      >
        <IconClose color="#818c99" />
      </button>
    </div>
  );
}
