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
      onError: (error) => {
        console.error('Auth API Error:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      },
      onSuccess: (data) => {
        console.log('Auth API Success:', data)
      }
    }
  )

  useEffect(() => {
    console.log('useAuth useEffect:', { userData, isQueryLoading, error })
    
    const token = localStorage.getItem('token')
    console.log('Token exists:', !!token)
    
    if (!token) {
      console.log('No token, setting user to null')
      setUser(null)
      setIsLoading(false)
      return
    }

    // If we have a token, wait for the API call to complete
    if (isQueryLoading) {
      console.log('Still loading API call...')
      return // Still loading, don't set user yet
    }

    if (error) {
      console.log('API call failed, clearing auth')
      // API call failed, clear everything
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      setIsLoading(false)
      return
    }

    if (userData) {
      console.log('Using fresh API data:', userData)
      // API call succeeded, use fresh data
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
    } else {
      console.log('No userData from API, checking localStorage')
      // No user data from API, check localStorage as fallback
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser)
          console.log('Using localStorage data:', parsedUser)
          setUser(parsedUser)
        } catch (error) {
          console.error('Error parsing localStorage user:', error)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
        }
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
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
    }
  }

  return {
    user,
    isLoading,
    login,
    logout
  }
}