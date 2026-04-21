'use client';

interface Props {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton({ width = '100%', height = 16, className = '', rounded = 'sm' }: Props) {
  const radiusMap = {
    none: '0',
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    full: '999px',
  };

  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: radiusMap[rounded],
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-md)] p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <Skeleton width={32} height={32} rounded="full" />
        <div className="flex-1 flex flex-col gap-1.5">
          <Skeleton width="60%" height={12} />
          <Skeleton width="40%" height={10} />
        </div>
        <Skeleton width={42} height={18} rounded="full" />
      </div>
      <div className="flex flex-col gap-1.5 ml-[42px]">
        <Skeleton width="80%" height={10} />
        <Skeleton width="60%" height={10} />
        <Skeleton width="70%" height={10} />
      </div>
    </div>
  );
}
