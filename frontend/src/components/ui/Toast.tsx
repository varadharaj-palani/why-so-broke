import { useEffect, useState } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const isSuccess = type === 'success'

  return (
    <div
      role={isSuccess ? 'status' : 'alert'}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${
        isSuccess ? 'bg-green-600' : 'bg-red-600'
      }`}
    >
      {isSuccess ? (
        <CheckCircleIcon className="w-4 h-4 shrink-0" />
      ) : (
        <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
      )}
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-75 hover:opacity-100">✕</button>
    </div>
  )
}

interface ToastState {
  message: string
  type: 'success' | 'error'
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type })
  }

  function clearToast() {
    setToast(null)
  }

  return { toast, showToast, clearToast }
}
