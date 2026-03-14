import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  HomeIcon, ListBulletIcon, ExclamationCircleIcon,
  ArrowUpTrayIcon, ChartBarIcon, Cog6ToothIcon
} from '@heroicons/react/24/outline'

const navItems = [
  { to: '/', label: 'Dashboard', icon: HomeIcon },
  { to: '/transactions', label: 'Transactions', icon: ListBulletIcon },
  { to: '/unverified', label: 'Unverified', icon: ExclamationCircleIcon },
  { to: '/import', label: 'Import', icon: ArrowUpTrayIcon },
  { to: '/budgets', label: 'Budgets', icon: ChartBarIcon },
  { to: '/settings', label: 'Settings', icon: Cog6ToothIcon },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 min-h-screen">
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">💸 Why So Broke</h1>
          <p className="text-xs text-gray-500 mt-1">{user?.display_name || user?.username}</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">
        <div className="flex-1 p-4 pb-20 md:pb-4 max-w-5xl mx-auto w-full">
          {children}
        </div>

        {/* Bottom nav — mobile only */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
          {navItems.slice(0, 5).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                  isActive ? 'text-green-600' : 'text-gray-500'
                }`
              }
            >
              <Icon className="w-6 h-6 mb-0.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  )
}
