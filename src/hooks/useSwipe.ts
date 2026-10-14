import { useRef } from 'react';

export function useSwipe(onSwipeLeft?: () => void, onSwipeRight?: () => void, threshold = 50) {
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);

  const onTouchStart = (e: any) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    tracking.current = true;
  };

  const onTouchEnd = (e: any) => {
    if (!tracking.current) return;
    tracking.current = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;
    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && onSwipeLeft) onSwipeLeft();
      else if (dx > 0 && onSwipeRight) onSwipeRight();
    }
  };

  return { onTouchStart, onTouchEnd };
}
