import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { authAPI } from '../services/api'
import { User } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { data: userData, isLoading: isQueryLoading } = useQuery(
    'user',
    authAPI.getMe,
    {
      enabled: !!localStorage.getItem('token'),
      retry: false,
      onError: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      }
    }
  )

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (error) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (userData) {
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
    }
  }, [userData])

  const login = async (code: string) => {
    try {
      const response = await authAPI.loginWithDiscord(code)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      setUser(response.user)
      return response
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear all auth data
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      
      // Force reload to ensure clean state and redirect to login
      window.location.reload()
    }
  }

  return {
    user,
    isLoading: isLoading || isQueryLoading,
    login,
    logout
  }
}
