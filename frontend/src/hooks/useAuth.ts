import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { authAPI } from '../services/api'
import { User } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { data: userData, isLoading: isQueryLoading, error } = useQuery(
    'user',
    authAPI.getMe,
    {
      enabled: !!localStorage.getItem('token'),
      retry: false,
      onError: (error: any) => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      }
    }
  )

  useEffect(() => {
    const token = localStorage.getItem('token')
    
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }

    // If we have a token, wait for the API call to complete
    if (isQueryLoading) {
      return // Still loading, don't set user yet
    }

    if (error) {
      // API call failed, clear everything
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      setIsLoading(false)
      return
    }

    if (userData) {
      // API call succeeded, use fresh data
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
    } else {
      // No user data from API, check localStorage as fallback
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser)
          setUser(parsedUser)
        } catch (error) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
        }
      } else {
        setUser(null)
      }
    }

    setIsLoading(false)
  }, [userData, isQueryLoading, error])

  const login = async (code: string) => {
    try {
      const response = await authAPI.loginWithDiscord(code)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      setUser(response.user)
      return response
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      throw error
    }
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      // Logout error
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      // Redirect to login page after logout
      window.location.href = '/'
    }
  }

  return {
    user,
    isLoading,
    login,
    logout
  }
}