'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle } from 'lucide-react'
import { Modal, Field, inputCls } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

type FeedbackType = 'BUG' | 'IDEA' | 'OTHER'

interface Props {
  onClose: () => void
}

export function ReportModal({ onClose }: Props) {
  const t = useTranslations()
  const fileRef = useRef<HTMLInputElement>(null)

  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<FeedbackType>('BUG')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) {
      setError(t('feedback.errorEmpty'))
      return
    }
    setError(null)
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('subject', subject.trim())
      formData.append('description', description.trim())
      formData.append('type', type)
      const file = fileRef.current?.files?.[0]
      if (file) formData.append('file', file)

      await api.post('/feedback', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setDone(true)
    } catch {
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <Modal onClose={onClose} title={t('feedback.title')}>
        <div className="flex flex-col items-center gap-3 py-6">
          <CheckCircle size={40} style={{ color: 'var(--primary)' }} />
          <p className="text-sm text-center" style={{ color: 'var(--text-primary)' }}>
            {t('feedback.success')}
          </p>
          <Button onClick={onClose} className="mt-2 w-full">{t('common.cancel')}</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} title={t('feedback.title')}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label={t('feedback.type')}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FeedbackType)}
            className={inputCls}
          >
            <option value="BUG">{t('feedback.typeBug')}</option>
            <option value="IDEA">{t('feedback.typeIdea')}</option>
            <option value="OTHER">{t('feedback.typeOther')}</option>
          </select>
        </Field>

        <Field label={t('feedback.subject')}>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputCls}
            maxLength={200}
            autoFocus
          />
        </Field>

        <Field label={t('feedback.description')}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputCls}
            rows={4}
            maxLength={5000}
          />
        </Field>

        <Field label={t('feedback.attachFile')}>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.mp4,.mov"
            className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:text-sm"
            style={{ color: 'var(--text-muted)' }}
          />
        </Field>

        {error && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? t('common.loading') : t('feedback.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
