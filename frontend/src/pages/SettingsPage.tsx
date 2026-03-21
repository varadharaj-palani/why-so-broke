import { useState } from 'react'
import ProfilePanel from '../components/settings/ProfilePanel'
import BanksPanel from '../components/settings/BanksPanel'
import CategoriesPanel from '../components/settings/CategoriesPanel'
import ModesPanel from '../components/settings/ModesPanel'
import ExportPanel from '../components/settings/ExportPanel'
import ActivityLogPanel from '../components/settings/ActivityLogPanel'

type Panel = 'profile' | 'banks' | 'categories' | 'modes' | 'export' | 'activity'

const NAV_GROUPS = [
  {
    label: 'Account',
    items: [
      { id: 'profile' as Panel, label: 'Profile' },
      { id: 'banks' as Panel, label: 'Banks' },
    ],
  },
  {
    label: 'Customize',
    items: [
      { id: 'categories' as Panel, label: 'Categories' },
      { id: 'modes' as Panel, label: 'Payment modes' },
    ],
  },
  {
    label: 'Data',
    items: [
      { id: 'export' as Panel, label: 'Export' },
      { id: 'activity' as Panel, label: 'Activity log' },
    ],
  },
]

const PANELS: Record<Panel, React.ReactNode> = {
  profile: <ProfilePanel />,
  banks: <BanksPanel />,
  categories: <CategoriesPanel />,
  modes: <ModesPanel />,
  export: <ExportPanel />,
  activity: <ActivityLogPanel />,
}

export default function SettingsPage() {
  const [active, setActive] = useState<Panel>('profile')

  return (
    <div>
      <h2 className="text-[20px] font-medium mb-5" style={{ color: 'var(--text)' }}>Settings</h2>

      <div className="flex gap-6">
        {/* Left nav */}
        <nav className="w-44 shrink-0">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 px-3" style={{ color: 'var(--text3)' }}>
                {group.label}
              </p>
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-[13px] mb-0.5 transition-colors"
                  style={{
                    background: active === item.id ? 'var(--gl)' : 'transparent',
                    color: active === item.id ? 'var(--green)' : 'var(--text2)',
                    fontWeight: active === item.id ? 500 : 400,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          {PANELS[active]}
        </div>
      </div>
    </div>
  )
}
