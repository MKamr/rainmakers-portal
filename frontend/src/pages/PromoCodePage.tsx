import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PaymentForm from '../components/PaymentForm'

export function PromoCodePage() {
  const [searchParams] = useSearchParams()
  const plan = 'monthly' as 'monthly'
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

  // PaymentForm already has its own container, logo, and header
  // We just need to pass the hasTrial prop and custom header text
  return (
    <PaymentForm 
      plan={plan} 
      email={email || undefined} 
      discordId={discordId || undefined} 
      discordUsername={discordUsername || undefined}
      hasTrial={true}
      customHeader={{
        title: 'PROMO CODE SUBSCRIPTION',
        subtitle: '✨ 7-Day Free Trial • Apple Pay & Google Pay Available'
      }}
    />
  )
}

