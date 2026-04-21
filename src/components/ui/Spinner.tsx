'use client';

import { CircleNotch } from '@phosphor-icons/react';

interface Props {
  size?: 12 | 14 | 16 | 20 | 24 | 32;
  className?: string;
  color?: string;
}

export function Spinner({ size = 16, className = '', color }: Props) {
  return (
    <CircleNotch
      size={size}
      weight="bold"
      className={`animate-spin ${className}`}
      style={color ? { color } : undefined}
    />
  );
}
