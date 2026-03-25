import { useState, useEffect } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthContext, AuthContextType } from './hooks/useAuth'
import { User } from './types'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import UnverifiedPage from './pages/UnverifiedPage'
import ImportPage from './pages/ImportPage'
import BudgetsPage from './pages/BudgetsPage'
import SettingsPage from './pages/SettingsPage'
import AppShell from './components/layout/AppShell'
import { ToastProvider } from './contexts/ToastContext'
import { ImportProgressProvider } from './contexts/ImportProgressContext'

function ProtectedRoute() {
  const token = localStorage.getItem('token')
  const location = useLocation()
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />
  return <AppShell><Outlet /></AppShell>
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    window.location.href = '/login'
  }

  const value: AuthContextType = { user, token, login, logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/transactions', element: <TransactionsPage /> },
      { path: '/unverified', element: <UnverifiedPage /> },
      { path: '/import', element: <ImportPage /> },
      { path: '/budgets', element: <BudgetsPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return (
    <ToastProvider>
      <ImportProgressProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ImportProgressProvider>
    </ToastProvider>
  )
}
