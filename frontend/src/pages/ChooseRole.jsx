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
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Choose Your Role</h1>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
        <button 
          onClick={() => handleRoleSelection('student')}
          disabled={loading}
          style={{ padding: '1rem 2rem', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          I'm a Student
        </button>
        <button 
          onClick={() => handleRoleSelection('tutor')}
          disabled={loading}
          style={{ padding: '1rem 2rem', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          I'm a Tutor
        </button>
      </div>
    </div>
  )
}
