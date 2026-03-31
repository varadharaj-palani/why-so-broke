import { useId } from 'react'
import { Dialog, DialogPanel, DialogTitle, DialogDescription } from '@headlessui/react'

interface ConfirmModalProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const titleId = useId()
  const descId = useId()

  return (
    <Dialog open={open} onClose={onCancel} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          className="rounded-xl p-6 w-full max-w-sm shadow-xl"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <DialogTitle id={titleId} className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription id={descId} className="text-sm mb-5" style={{ color: 'var(--text3)' }}>
              {description}
            </DialogDescription>
          )}
          {!description && <div className="mb-5" />}
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium border rounded-lg"
              style={{ color: 'var(--text2)', borderColor: 'var(--border2)', background: 'var(--surface)' }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg"
              style={{ background: 'var(--red)' }}
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
