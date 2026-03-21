import { useAuth } from '../../hooks/useAuth'

export default function ProfilePanel() {
  const { user, logout } = useAuth()

  return (
    <div>
      <h3 className="text-[15px] font-medium mb-4" style={{ color: 'var(--text)' }}>Profile</h3>
      <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-[18px] font-semibold"
            style={{ background: 'var(--gl)', color: 'var(--green)' }}
          >
            {(user?.display_name || user?.username || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[15px] font-medium" style={{ color: 'var(--text)' }}>
              {user?.display_name || user?.username}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text3)' }}>Personal account</p>
          </div>
        </div>
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={logout}
            className="text-[13px] font-medium"
            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
