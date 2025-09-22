import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { authAPI } from '../services/api'
import { User } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  console.log('🔄 useAuth hook called:', {
    hasToken: !!localStorage.getItem('token'),
    currentUser: user,
    isLoading
  })

  const { data: userData, isLoading: isQueryLoading, error } = useQuery(
    'user',
    authAPI.getMe,
    {
      enabled: !!localStorage.getItem('token'),
      retry: false,
      onError: (error: any) => {
        console.error('❌ Auth API Error:', error)
        console.error('🔍 Error details:', {
          message: error?.message || 'Unknown error',
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data
        })
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      },
      onSuccess: (data) => {
        console.log('✅ Auth API Success:', data)
        console.log('📊 User data analysis:', {
          hasId: !!data.id,
          hasDiscordId: !!data.discordId,
          username: data.username,
          email: data.email,
          isAdmin: data.isAdmin,
          isWhitelisted: data.isWhitelisted,
          avatar: data.avatar
        })
      }
    }
  )

  useEffect(() => {
    console.log('🔄 useAuth useEffect triggered:', { 
      userData, 
      isQueryLoading, 
      error: error ? {
        message: (error as any)?.message || 'Unknown error',
        status: (error as any)?.response?.status,
        data: (error as any)?.response?.data
      } : null
    })
    
    const token = localStorage.getItem('token')
    console.log('🔑 Token check:', { 
      exists: !!token,
      preview: token ? `${token.substring(0, 20)}...` : 'none'
    })
    
    if (!token) {
      console.log('❌ No token found, setting user to null')
      setUser(null)
      setIsLoading(false)
      return
    }

    // If we have a token, wait for the API call to complete
    if (isQueryLoading) {
      console.log('⏳ Still loading API call...')
      return // Still loading, don't set user yet
    }

    if (error) {
      console.log('❌ API call failed, clearing auth')
      console.log('🔍 Error details:', {
        message: (error as any)?.message || 'Unknown error',
        status: (error as any)?.response?.status,
        statusText: (error as any)?.response?.statusText,
        data: (error as any)?.response?.data
      })
      // API call failed, clear everything
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      setIsLoading(false)
      return
    }

    if (userData) {
      console.log('✅ Using fresh API data:', userData)
      console.log('📊 Final user analysis:', {
        id: userData.id,
        username: userData.username,
        isAdmin: userData.isAdmin,
        isWhitelisted: userData.isWhitelisted,
        typeOfIsAdmin: typeof userData.isAdmin,
        typeOfIsWhitelisted: typeof userData.isWhitelisted
      })
      // API call succeeded, use fresh data
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
    } else {
      console.log('⚠️ No userData from API, checking localStorage')
      // No user data from API, check localStorage as fallback
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser)
          console.log('📦 Using localStorage data:', parsedUser)
          setUser(parsedUser)
        } catch (error) {
          console.error('❌ Error parsing localStorage user:', error)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
        }
      } else {
        console.log('❌ No saved user in localStorage either')
        setUser(null)
      }
    }

    console.log('🏁 Setting isLoading to false')
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