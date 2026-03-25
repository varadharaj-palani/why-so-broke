import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useToast } from './ToastContext'
import { importsApi } from '../api/imports'
import { ImportJob } from '../types'

interface ImportProgressContextType {
  activeJobId: string | null
  activeJobStatus: ImportJob['status'] | null
  setActiveJobId: (id: string | null) => void
}

const ImportProgressContext = createContext<ImportProgressContextType | undefined>(undefined)

export function ImportProgressProvider({ children }: { children: ReactNode }) {
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [activeJobStatus, setActiveJobStatus] = useState<ImportJob['status'] | null>(null)
  const { showToast } = useToast()

  // Poll active job every 4 seconds
  useEffect(() => {
    if (!activeJobId) return

    const interval = setInterval(async () => {
      try {
        const res = await importsApi.get(activeJobId)
        const job = res.data

        setActiveJobStatus(job.status)

        // On terminal status
        if (job.status === 'completed') {
          showToast(`Import complete — ${job.parsed_rows || 0} transactions ready to review`, 'success')
          setActiveJobId(null)
          setActiveJobStatus(null)
        } else if (job.status === 'failed') {
          showToast(`Import failed: ${job.error_message || 'Unknown error'}`, 'error')
          setActiveJobId(null)
          setActiveJobStatus(null)
        }
      } catch (err) {
        console.error('Failed to poll import job:', err)
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [activeJobId, showToast])

  return (
    <ImportProgressContext.Provider value={{ activeJobId, activeJobStatus, setActiveJobId }}>
      {children}
    </ImportProgressContext.Provider>
  )
}

export function useImportProgress() {
  const context = useContext(ImportProgressContext)
  if (!context) {
    throw new Error('useImportProgress must be used within ImportProgressProvider')
  }
  return context
}
