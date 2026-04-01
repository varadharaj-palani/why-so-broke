import { useEffect, useRef, useState } from 'react'
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline'

interface MenuItem {
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}

interface DropdownMenuProps {
  items: MenuItem[]
}

export default function DropdownMenu({ items }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
        style={{ background: 'none', border: 'none' }}
      >
        <EllipsisVerticalIcon className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 bg-[var(--surface)] border border-[var(--border2)] rounded-lg shadow-lg min-w-[110px] overflow-hidden">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); item.onClick(); setOpen(false) }}
              className={`w-full text-left px-3.5 py-2 text-sm flex items-center gap-2 transition-colors ${
                item.variant === 'danger'
                  ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950'
                  : 'text-[var(--text2)] hover:bg-[var(--bg)] hover:text-[var(--text)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
