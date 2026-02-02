'use client'

interface LoadingSpinnerProps {
  /** 載入中文字 */
  label?: string
  /** 尺寸：sm | md | lg */
  size?: 'sm' | 'md' | 'lg'
  /** 外層 className */
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 border-2',
  md: 'h-12 w-12 border-b-2',
  lg: 'h-16 w-16 border-2',
}

export function LoadingSpinner({ label = '載入中...', size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-blue-600 ${sizeClasses[size]}`}
        aria-hidden
      />
      {label ? <p className="mt-4 text-gray-600">{label}</p> : null}
    </div>
  )
}
