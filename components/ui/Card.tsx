'use client'

import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  /** 卡片標題（可選） */
  title?: string
}

export function Card({ children, className = '', title }: CardProps) {
  return (
    <div
      className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 ${className}`}
    >
      {title && (
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>
      )}
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  )
}
