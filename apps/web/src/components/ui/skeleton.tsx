import React from 'react';
import './skeleton.css';

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`skeleton-shimmer ${className || ''}`}
      style={style}
    />
  );
}
