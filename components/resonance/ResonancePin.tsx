import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export type ResonancePinColor = 'warm' | 'cool' | 'calm';

export type ResonancePinProps = {
  id: string;
  x: number;
  y: number;
  color: ResonancePinColor;
  delay?: number;
  size?: number;
  label?: string;
  onSelect?: (id: string) => void;
  className?: string;
};

const resonanceColorMap: Record<
  ResonancePinColor,
  { core: string; glow: string }
> = {
  warm: {
    core: 'rgba(255, 209, 107, 0.95)',
    glow: 'rgba(255, 209, 107, 0.6)'
  },
  cool: {
    core: 'rgba(96, 164, 255, 0.9)',
    glow: 'rgba(96, 164, 255, 0.6)'
  },
  calm: {
    core: 'rgba(188, 138, 255, 0.9)',
    glow: 'rgba(188, 138, 255, 0.6)'
  }
};

// ResonancePin：共鸣发光点，使用 transform/opacity 动画保证性能
export function ResonancePin({
  id,
  x,
  y,
  color,
  delay = 0,
  size = 14,
  label,
  onSelect,
  className
}: ResonancePinProps) {
  const palette = resonanceColorMap[color];

  const style: CSSProperties = {
    left: `${x}%`,
    top: `${y}%`,
    width: size,
    height: size
  };

  const coreStyle: CSSProperties = {
    backgroundColor: palette.core,
    boxShadow: `0 0 8px ${palette.glow}, 0 0 18px ${palette.glow}`,
    animationDelay: `${delay}ms`
  };

  return (
    <button
      type="button"
      className={cn('resonance-pin', className)}
      style={style}
      aria-label={label ?? '共鸣点'}
      onClick={() => onSelect?.(id)}
    >
      <span className="resonance-pin-core" style={coreStyle} />
    </button>
  );
}
