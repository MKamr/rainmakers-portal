import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PaymentForm from './PaymentForm'

export function PaymentCheckout() {
  const [searchParams] = useSearchParams()
  const plan = searchParams.get('plan') as 'monthly' | null
  const [email, setEmail] = useState<string>('')
  const [discordId, setDiscordId] = useState<string>('')
  const [discordUsername, setDiscordUsername] = useState<string>('')

  useEffect(() => {
    // Get email, discordId, and discordUsername from URL params first
    const emailParam = searchParams.get('email')
    const discordIdParam = searchParams.get('discordId')
    const discordUsernameParam = searchParams.get('username')
    
    if (emailParam) {
      setEmail(emailParam)
    }
    if (discordIdParam) {
      setDiscordId(discordIdParam)
    }
    if (discordUsernameParam) {
      setDiscordUsername(discordUsernameParam)
    }
    
    // Get email and discordId from localStorage if not in URL and user is logged in
    if (!emailParam || !discordIdParam) {
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser)
          if (user.email && !emailParam) {
            setEmail(user.email)
          }
          if (user.discordId && !discordIdParam) {
            setDiscordId(user.discordId)
          }
          if (user.username && !discordUsernameParam) {
            setDiscordUsername(user.username)
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, [searchParams])

  if (!plan || plan !== 'monthly') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-red-400">Invalid plan. Only monthly subscription is available.</p>
        </div>
      </div>
    )
  }

  return <PaymentForm plan={plan} email={email || undefined} discordId={discordId || undefined} discordUsername={discordUsername || undefined} />
}

