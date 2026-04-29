'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronRight, ChevronDown, X, Plus } from 'lucide-react'
import { inputCls } from '@/components/ui/modal'

export interface ServiceEntry {
  type: string
  customName?: string
}

const CATEGORY_TREE = [
  { id: 'OIL_GROUP',        isGroup: true,  children: ['ENGINE_OIL_CHANGE', 'TRANSMISSION_OIL_CHANGE'] },
  { id: 'TIRES_GROUP',      isGroup: true,  children: ['TIRE_CHANGE', 'TIRE_ROTATION'] },
  { id: 'BRAKE_GROUP',      isGroup: true,  children: ['BRAKE_DISCS', 'BRAKE_PADS', 'BRAKE_BANDS', 'HANDBRAKE'] },
  { id: 'FILTER_GROUP',     isGroup: true,  children: ['OIL_FILTER', 'FUEL_FILTER', 'TRANSMISSION_FILTER', 'AIR_FILTER', 'CABIN_FILTER'] },
  { id: 'INSPECTION_GROUP', isGroup: true,  children: ['MAIN_INSPECTION', 'RE_INSPECTION'] },
  { id: 'TRANSMISSION_SERVICE', isGroup: false, children: [] },
  { id: 'COOLANT_FLUSH',    isGroup: false, children: [] },
  { id: 'BATTERY_REPLACEMENT', isGroup: false, children: [] },
  { id: 'WINDSHIELD_GROUP', isGroup: true,  children: ['WINDSHIELD_REPAIR', 'WINDSHIELD_REPLACEMENT'] },
  { id: 'OTHER',            isGroup: false, children: [] },
] as const

interface Props {
  value: ServiceEntry[]
  onChange: (entries: ServiceEntry[]) => void
  error?: string
}

export function ServiceTypeSelector({ value, onChange, error }: Props) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [otherName, setOtherName] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedTypes = new Set(value.map((e) => e.type))

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setActiveGroup(null)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  function addType(type: string, customName?: string) {
    if (!selectedTypes.has(type)) onChange([...value, { type, customName }])
  }

  function removeType(type: string) {
    onChange(value.filter((e) => e.type !== type))
  }

  function toggleLeaf(type: string) {
    if (selectedTypes.has(type)) removeType(type)
    else addType(type)
  }

  function handleOtherAdd() {
    const name = otherName.trim()
    if (!name) return
    if (selectedTypes.has('OTHER')) removeType('OTHER')
    addType('OTHER', name)
    setOtherName('')
    setActiveGroup(null)
  }

  function getLabel(id: string): string {
    if (id === 'OIL_GROUP')        return t('serviceCategory.OIL')
    if (id === 'TIRES_GROUP')      return t('serviceCategory.TIRES')
    if (id === 'BRAKE_GROUP')      return t('serviceCategory.BRAKE_GROUP')
    if (id === 'FILTER_GROUP')     return t('serviceCategory.FILTER_GROUP')
    if (id === 'INSPECTION_GROUP') return t('serviceCategory.INSPECTION_GROUP')
    if (id === 'WINDSHIELD_GROUP') return t('serviceCategory.WINDSHIELD_GROUP')
    return t(`serviceType.${id}`)
  }

  function getEntryLabel(entry: ServiceEntry): string {
    return entry.customName || t(`serviceType.${entry.type}`)
  }

  const activeGroupData = CATEGORY_TREE.find((c) => c.id === activeGroup)

  return (
    <div className="space-y-1.5">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((entry) => (
            <span
              key={entry.type}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: 'var(--primary)', color: 'white' }}
            >
              {getEntryLabel(entry)}
              <button
                type="button"
                onClick={() => removeType(entry.type)}
                className="hover:opacity-70 leading-none"
                aria-label={t('common.delete')}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => { setOpen((v) => !v); setActiveGroup(null) }}
          className={`${inputCls} w-full flex items-center justify-between gap-2 text-sm`}
          style={{ color: 'var(--text-muted)' }}
        >
          <span>{t('serviceRecords.selectTypes')}</span>
          <ChevronDown size={14} style={{ flexShrink: 0 }} />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 z-50 flex shadow-lg rounded-lg overflow-visible">
            {/* Main panel */}
            <div
              className="rounded-lg border overflow-hidden"
              style={{
                background: 'var(--surface-raised)',
                borderColor: 'var(--border)',
                minWidth: '190px',
              }}
            >
              {CATEGORY_TREE.map((cat) => {
                const isSelected = !cat.isGroup && selectedTypes.has(cat.id)
                const isActive = activeGroup === cat.id

                return (
                  <button
                    key={cat.id}
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-left"
                    style={{
                      background: isActive
                        ? 'color-mix(in srgb, var(--primary) 15%, transparent)'
                        : isSelected
                          ? 'color-mix(in srgb, var(--primary) 10%, transparent)'
                          : 'transparent',
                      color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                      fontWeight: isSelected ? 500 : undefined,
                    }}
                    onMouseEnter={() => setActiveGroup(cat.id)}
                    onClick={() => {
                      if (cat.isGroup) {
                        setActiveGroup(activeGroup === cat.id ? null : cat.id)
                      } else if (cat.id === 'OTHER') {
                        setActiveGroup('OTHER')
                      } else {
                        toggleLeaf(cat.id)
                      }
                    }}
                  >
                    <span>{getLabel(cat.id)}</span>
                    {cat.isGroup && (
                      <ChevronRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    )}
                    {cat.id === 'OTHER' && (
                      <ChevronRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Subcategory panel */}
            {activeGroup && activeGroup !== 'OTHER' && activeGroupData && activeGroupData.children.length > 0 && (
              <div
                className="ml-1 rounded-lg border overflow-hidden self-start"
                style={{
                  background: 'var(--surface-raised)',
                  borderColor: 'var(--border)',
                  minWidth: '200px',
                }}
              >
                {activeGroupData.children.map((childId) => {
                  const isSelected = selectedTypes.has(childId)
                  return (
                    <button
                      key={childId}
                      type="button"
                      className="w-full px-3 py-2 text-sm text-left"
                      style={{
                        background: isSelected
                          ? 'color-mix(in srgb, var(--primary) 10%, transparent)'
                          : 'transparent',
                        color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                        fontWeight: isSelected ? 500 : undefined,
                      }}
                      onClick={() => toggleLeaf(childId)}
                    >
                      {t(`serviceType.${childId}`)}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Other — custom name input panel */}
            {activeGroup === 'OTHER' && (
              <div
                className="ml-1 rounded-lg border p-2 self-start"
                style={{
                  background: 'var(--surface-raised)',
                  borderColor: 'var(--border)',
                  minWidth: '200px',
                }}
              >
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={otherName}
                    onChange={(e) => setOtherName(e.target.value)}
                    placeholder={t('serviceRecords.otherPlaceholder')}
                    className={`${inputCls} flex-1 text-sm py-1.5`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleOtherAdd() }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleOtherAdd}
                    disabled={!otherName.trim()}
                    className="px-2 rounded transition-opacity"
                    style={{
                      background: 'var(--primary)',
                      color: 'white',
                      opacity: otherName.trim() ? 1 : 0.4,
                    }}
                    aria-label={t('common.add')}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
