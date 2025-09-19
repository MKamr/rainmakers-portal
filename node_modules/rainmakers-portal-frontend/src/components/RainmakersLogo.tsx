interface RainmakersLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function RainmakersLogo({ size = 'md', showText = true, className = '' }: RainmakersLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  }

  return (
    <div className={`flex items-center ${className}`}>
      <div className={`flex-shrink-0 ${sizeClasses[size]} matrix-logo-container`}>
        <img 
          src="/rainmakers-logo-large.png" 
          alt="Rainmakers Logo" 
          className="w-full h-full object-contain matrix-logo-image"
        />
      </div>
      {showText && (
        <div className="ml-3">
          <h1 className={`font-semibold text-gray-900 dark:text-white matrix-logo-text ${textSizeClasses[size]}`}>
            Rainmakers
          </h1>
        </div>
      )}
    </div>
  )
}
