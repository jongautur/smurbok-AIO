'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { inputCls } from './modal'

interface Props {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  options: string[]
  placeholder?: string
  disabled?: boolean
}

export function Combobox({ value, onChange, onBlur, options, placeholder, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [activeIndex, setActiveIndex] = useState(-1)
  const listRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  // Keep query in sync when value changes externally (e.g. form reset)
  useEffect(() => { setQuery(value) }, [value])

  const filtered = query.length === 0
    ? options
    : options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))

  const visible = filtered.slice(0, 50)

  function select(option: string) {
    onChange(option)
    setQuery(option)
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    onChange(e.target.value)
    setOpen(true)
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); return }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, visible.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && visible[activeIndex]) select(visible[activeIndex])
      else setOpen(false)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
        onBlur?.()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onBlur])

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={inputCls}
      />

      {open && visible.length > 0 && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md shadow-lg max-h-52 overflow-y-auto text-sm border"
          style={{ backgroundColor: 'var(--surface-overlay)', borderColor: 'var(--border)' }}
        >
          {visible.map((option, i) => (
            <li
              key={option}
              role="option"
              aria-selected={i === activeIndex}
              onPointerDown={(e) => { e.preventDefault(); select(option) }}
              className="px-3 py-2 cursor-pointer"
              style={{
                backgroundColor: i === activeIndex ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : undefined,
                color: i === activeIndex ? 'var(--accent)' : 'var(--text-primary)',
              }}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
