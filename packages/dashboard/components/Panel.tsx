import type { ReactNode } from 'react'

interface PanelProps {
  title: string
  titleRight?: ReactNode
  children: ReactNode
  className?: string
}

export function Panel({ title, titleRight, children, className = '' }: PanelProps) {
  return (
    <div className={`panel ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-semibold tracking-wider text-gray-400 uppercase">{title}</h2>
        {titleRight && <div className="text-sm">{titleRight}</div>}
      </div>
      {children}
    </div>
  )
}
