import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { unverifiedApi } from '../../api/imports'
import {
  HomeIcon, ListBulletIcon, ExclamationCircleIcon,
  ArrowUpTrayIcon, ChartBarIcon, Cog6ToothIcon,
  SunIcon, MoonIcon, ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'

const overviewNav = [
  { to: '/', label: 'Dashboard', icon: HomeIcon },
  { to: '/transactions', label: 'Transactions', icon: ListBulletIcon },
  { to: '/unverified', label: 'Unverified', icon: ExclamationCircleIcon, badge: true },
]

const manageNav = [
  { to: '/import', label: 'Import', icon: ArrowUpTrayIcon },
  { to: '/budgets', label: 'Budgets', icon: ChartBarIcon },
  { to: '/settings', label: 'Settings', icon: Cog6ToothIcon },
]

const mobileNav = [...overviewNav, ...manageNav].slice(0, 5)

function NavItem({
  to, label, icon: Icon, badge, badgeCount,
}: {
  to: string; label: string; icon: React.ComponentType<{ className?: string }>
  badge?: boolean; badgeCount?: number
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-4 py-2.5 text-[13px] border-r-2 transition-all select-none ${
          isActive
            ? 'bg-[var(--gl)] text-[var(--green)] font-medium border-[var(--green)]'
            : 'text-[var(--text2)] border-transparent hover:bg-[var(--bg)] hover:text-[var(--text)]'
        }`
      }
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {badge && badgeCount != null && badgeCount > 0 && (
        <span className="text-[10px] font-medium bg-[var(--al)] text-[var(--amber)] px-1.5 py-0.5 rounded-full leading-none">
          {badgeCount}
        </span>
      )}
    </NavLink>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const { dark, toggleDark } = useTheme()
  const [pendingCount, setPendingCount] = useState<number>(0)

  useEffect(() => {
    unverifiedApi.list({ status: 'pending', per_page: 1 })
      .then(r => setPendingCount(r.data.total))
      .catch(() => {})
  }, [])

  const displayName = user?.display_name || user?.username || ''
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Topbar */}
      <header
        className="flex-shrink-0 h-12 flex items-center justify-between px-5 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2 text-[15px] font-medium">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" fill="var(--green)" opacity="0.15" />
            <text x="10" y="14.5" textAnchor="middle" fontSize="11" fill="var(--green)" fontFamily="sans-serif">₹</text>
          </svg>
          Why So Broke
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[12px]" style={{ color: 'var(--text3)' }}>{displayName}</span>
          <button
            onClick={toggleDark}
            className="flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-full border text-[12px] transition-colors hover:border-[var(--green)]"
            style={{ borderColor: 'var(--border2)', background: 'var(--bg)', color: 'var(--text2)' }}
            aria-label="Toggle dark mode"
          >
            {dark ? <SunIcon className="w-3.5 h-3.5" /> : <MoonIcon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop only */}
        <aside
          className="hidden md:flex flex-col flex-shrink-0 w-[200px] border-r"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {/* User info */}
          <div className="px-4 py-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{displayName}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>Personal account</div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-2 overflow-y-auto">
            <p className="text-[10px] font-medium uppercase tracking-[0.6px] px-4 py-1.5"
              style={{ color: 'var(--text4)' }}>Overview</p>
            {overviewNav.map(item => (
              <NavItem key={item.to} {...item} badgeCount={item.badge ? pendingCount : undefined} />
            ))}

            <p className="text-[10px] font-medium uppercase tracking-[0.6px] px-4 py-1.5 mt-2"
              style={{ color: 'var(--text4)' }}>Manage</p>
            {manageNav.map(item => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>

          {/* Sign out */}
          <div className="px-4 py-3.5 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-[12px] transition-colors"
              style={{ color: 'var(--text3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text2)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
            >
              <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div className="p-6 max-w-5xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex border-t"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {mobileNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-[var(--green)]' : 'text-[var(--text3)]'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
