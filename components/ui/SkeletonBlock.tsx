interface SkeletonBlockProps {
  width?: string | number
  height?: string | number
  className?: string
  rounded?: string
}

export function SkeletonBlock({ width, height, className = '', rounded = 'rounded' }: SkeletonBlockProps) {
  return (
    <div
      className={`animate-pulse ${rounded} ${className}`}
      style={{ width, height, background: 'var(--surface2)' }}
    />
  )
}
