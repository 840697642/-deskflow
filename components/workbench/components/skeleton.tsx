import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

/**
 * 骨架屏组件
 * 用于内容加载时的占位显示
 */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-md bg-muted/60', className)} />
}
