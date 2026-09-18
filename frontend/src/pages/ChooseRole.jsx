import { useAuth, useUser } from '@clerk/clerk-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ChooseRole() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleRoleSelection = async (role) => {
    setLoading(true)
    try {
      const token = await getToken()
      console.log('[Frontend] Retrieved Clerk token:', token ? `${token.slice(0, 15)}... (len ${token.length})` : token)

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/set-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role })
      })

      if (response.ok) {
        await user.reload()
        navigate(`/${role}-dashboard`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to set role:', response.status, errorData)
        setLoading(false)
      }
    } catch (error) {
      console.error('[Frontend] Error selecting role:', error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <div className="max-w-md w-full bg-[var(--color-surface)] p-8 rounded-xl shadow-sm border border-[var(--color-border)] text-center">
        <h1 className="text-3xl font-bold mb-2">Welcome to CodeEngine</h1>
        <p className="text-[var(--color-text-secondary)] mb-8">Choose your role to get started</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={() => handleRoleSelection('student')}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-medium rounded-lg hover:bg-[var(--color-border)] transition-colors disabled:opacity-50"
          >
            I'm a Student
          </button>
          <button 
            onClick={() => handleRoleSelection('tutor')}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-[var(--color-accent)] text-white font-medium rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors shadow-sm disabled:opacity-50"
          >
            I'm a Tutor
          </button>
        </div>
      </div>
    </div>
  )

}
