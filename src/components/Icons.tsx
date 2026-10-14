import React from 'react';

const s = { width: 26, height: 26, display: 'block' } as const;

export const IconNews = ({ color = 'currentColor' }: { color?: string }) => (
  <svg style={s} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="1.8" />
    <path d="M7 8h10M7 12h10M7 16h6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const IconMessages = ({ color = 'currentColor' }: { color?: string }) => (
  <svg style={s} viewBox="0 0 24 24" fill="none">
    <path
      d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H9l-4 3v-3H6a2 2 0 01-2-2V6z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconFriends = ({ color = 'currentColor' }: { color?: string }) => (
  <svg style={s} viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="8" r="3.2" stroke={color} strokeWidth="1.8" />
    <circle cx="16.5" cy="9" r="2.4" stroke={color} strokeWidth="1.8" />
    <path
      d="M3.5 18c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5M14 14.2c2.2.1 3.8 1.3 4.3 3.3"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const IconGroups = ({ color = 'currentColor' }: { color?: string }) => (
  <svg style={s} viewBox="0 0 24 24" fill="none">
    <path
      d="M4 20V9l8-5 8 5v11"
      stroke={color}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M9 20v-6h6v6" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

export const IconMusic = ({ color = 'currentColor' }: { color?: string }) => (
  <svg style={s} viewBox="0 0 24 24" fill="none">
    <path
      d="M9 18V6l10-2v12"
      stroke={color}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="7" cy="18" r="2.2" stroke={color} strokeWidth="1.8" />
    <circle cx="17" cy="16" r="2.2" stroke={color} strokeWidth="1.8" />
  </svg>
);

export const IconMenu = ({ color = 'currentColor' }: { color?: string }) => (
  <svg style={s} viewBox="0 0 24 24" fill="none">
    <path
      d="M5 7h14M5 12h14M5 17h14"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const IconSearch = ({ color = 'currentColor', size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="6" stroke={color} strokeWidth="2" />
    <path d="M16 16l4 4" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconBack = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
    <path
      d="M10 2L3 10l7 8"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconHeart = ({ filled, color = 'currentColor' }: { filled?: boolean; color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? color : 'none'}>
    <path
      d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconComment = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M5 6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H10l-4 3v-3H7a2 2 0 01-2-2V6z"
      stroke={color}
      strokeWidth="1.8"
    />
  </svg>
);

export const IconShare = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6M12 4v12M8 8l4-4 4 4"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconPlay = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
    <path d="M8 5v14l11-7L8 5z" />
  </svg>
);

export const IconPause = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

export const IconClose = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconSend = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
    <path d="M3 11l18-8-8 18-2-8-8-2z" />
  </svg>
);

export const IconNote = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M9 18V6l10-2v12" stroke={color} strokeWidth="1.8" />
    <circle cx="7" cy="18" r="2" stroke={color} strokeWidth="1.8" />
    <circle cx="17" cy="16" r="2" stroke={color} strokeWidth="1.8" />
  </svg>
);
