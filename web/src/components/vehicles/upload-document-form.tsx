'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useUploadDocument } from '@/hooks/use-documents'
import { useToast } from '@/providers/toast-provider'
import { Modal, Field, inputCls } from '@/components/ui/modal'

const DOCUMENT_TYPES = [
  'INSURANCE',
  'REGISTRATION',
  'INSPECTION_CERT',
  'WARRANTY',
  'RECEIPT',
  'OTHER',
] as const

interface Props {
  vehicleId: string
  onClose: () => void
  onSuccess: () => void
}

export function UploadDocumentForm({ vehicleId, onClose, onSuccess }: Props) {
  const t = useTranslations()
  const { toast } = useToast()
  const mutation = useUploadDocument(vehicleId)
  const fileRef = useRef<HTMLInputElement>(null)

  const [type, setType] = useState<string>(DOCUMENT_TYPES[0])
  const [label, setLabel] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [fileError, setFileError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setFileError(t('documents.fileRequired'))
      return
    }
    setFileError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    formData.append('label', label)
    if (expiresAt) formData.append('expiresAt', expiresAt)

    mutation.mutate(formData, {
      onSuccess: () => {
        toast(t('common.saveSuccess'))
        onSuccess()
      },
      onError: () => toast(t('common.error'), 'error'),
    })
  }

  return (
    <Modal onClose={onClose} title={t('documents.upload')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('documents.type')}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={inputCls}
          >
            {DOCUMENT_TYPES.map((dt) => (
              <option key={dt} value={dt}>
                {t(`documentType.${dt}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('documents.label')}>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            className={inputCls}
            placeholder={t('documents.labelPlaceholder')}
          />
        </Field>

        <Field label={t('documents.expiresAt')}>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label={t('documents.file')} error={fileError}>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-gray-300 file:text-sm file:bg-white hover:file:bg-gray-50"
          />
          <p className="text-xs text-gray-400 mt-1">{t('documents.fileHint')}</p>
        </Field>

        {mutation.error && (
          <p className="text-sm text-red-600">{t('common.error')}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 rounded-md py-2 text-sm"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? t('common.loading') : t('documents.upload')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
