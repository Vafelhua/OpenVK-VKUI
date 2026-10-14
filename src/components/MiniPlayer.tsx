import { useEffect, useState, useSyncExternalStore } from 'react';
import { getState, subscribe, togglePlay, stopTrack } from '../player';
import { IconPlay, IconPause, IconClose, IconNote } from './Icons';

export function usePlayer() {
  useSyncExternalStore(subscribe, getState, getState);
  return { ...getState(), togglePlay, stopTrack };
}

export function MiniPlayer({ onOpenMusic }: { onOpenMusic: () => void }) {
  const { current, playing } = usePlayer();
  if (!current) return null;
  return (
    <div className="ovk-miniplayer" onClick={onOpenMusic}>
      <div className="ovk-miniplayer__art">
        <IconNote color="#2688eb" />
      </div>
      <div className="ovk-miniplayer__info">
        <div className="ovk-miniplayer__title">{current.title}</div>
        <div className="ovk-miniplayer__artist">{current.artist}</div>
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
