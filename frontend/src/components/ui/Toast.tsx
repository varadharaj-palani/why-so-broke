import { useEffect, useState } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline'

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const duration = type === 'info' ? 5000 : 3000
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, type])

  const isSuccess = type === 'success'
  const isError = type === 'error'
  const isInfo = type === 'info'

  return (
    <div
      role={isSuccess ? 'status' : isError ? 'alert' : 'status'}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${
        isSuccess ? 'bg-green-600' : isError ? 'bg-red-600' : 'bg-blue-600'
      }`}
    >
      {isSuccess && <CheckCircleIcon className="w-4 h-4 shrink-0" />}
      {isError && <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />}
      {isInfo && <ClockIcon className="w-4 h-4 shrink-0" />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-75 hover:opacity-100">✕</button>
    </div>
  )
}

interface ToastState {
  message: string
  type: 'success' | 'error' | 'info'
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
    setToast({ message, type })
  }

  function clearToast() {
    setToast(null)
  }

  return { toast, showToast, clearToast }
}
