import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '@/api/types'

interface AuthContextType {
  user: User | null
  login: (user: User) => void
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
  isCentralStaff: boolean
  isStoreStaff: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const USER_STORAGE_KEY = 'user'

function parseStoredUser(): User | null {
  try {
    const token = localStorage.getItem('token')
    const saved = localStorage.getItem(USER_STORAGE_KEY)
    if (!token || !saved) return null
    const parsed = JSON.parse(saved) as Record<string, unknown>
    if (!parsed || typeof parsed.role_id !== 'number' || typeof parsed.username !== 'string') return null
    return {
      user_id: typeof parsed.user_id === 'number' ? parsed.user_id : Number(parsed.user_id) || 0,
      user_code: typeof parsed.user_code === 'string' ? parsed.user_code : '',
      username: parsed.username,
      role_id: parsed.role_id,
      store_id: parsed.store_id == null ? null : Number(parsed.store_id) || null,
      is_active: typeof parsed.is_active === 'boolean' ? parsed.is_active : true,
      created_at: typeof parsed.created_at === 'string' ? parsed.created_at : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(parseStoredUser)

  const login = (userData: User) => {
    setUser(userData)
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData))
    } catch {
      // ignore quota / disabled storage
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem(USER_STORAGE_KEY)
  }

  const isAuthenticated = !!user
  const isAdmin = user?.role_id === 1
  const isCentralStaff = user?.role_id === 2
  const isStoreStaff = user?.role_id === 3

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isAdmin, isCentralStaff, isStoreStaff }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
