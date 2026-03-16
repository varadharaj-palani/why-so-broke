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
          className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm"
        >
          <DialogTitle id={titleId} className="text-base font-semibold text-gray-900 mb-1">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription id={descId} className="text-sm text-gray-500 mb-5">
              {description}
            </DialogDescription>
          )}
          {!description && <div className="mb-5" />}
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
