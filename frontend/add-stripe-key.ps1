# PowerShell script to add Stripe publishable key to .env file
# Run this script from the frontend directory: .\add-stripe-key.ps1

$envFile = ".env"

if (Test-Path $envFile) {
    # Check if Stripe key already exists
    $content = Get-Content $envFile -Raw
    
    if ($content -match "VITE_STRIPE_PUBLISHABLE_KEY") {
        Write-Host "⚠️  Stripe publishable key already exists in .env file"
        Write-Host "Current Stripe configuration:"
        Get-Content $envFile | Select-String "STRIPE"
    } else {
        # Add Stripe configuration
        Add-Content $envFile "`n# Stripe Configuration (Test Mode)"
        Add-Content $envFile "# Get your test publishable key from: https://dashboard.stripe.com/test/apikeys"
        Add-Content $envFile "VITE_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_51SQD23D9ZJ3UMZ8opVvMeypD6UIczbgUmFp6NRMpfQAoRxionICLLGeTQdY2zA9vuoEK9qZzjKJt8bfYVe5NEqxK00NgOmmNAr"
        
        Write-Host "✅ Stripe publishable key added to .env file"
        Write-Host ""
        Write-Host "⚠️  IMPORTANT: Restart your development server for changes to take effect!"
        Write-Host "   Stop the server (Ctrl+C) and run: npm run dev"
    }
} else {
    Write-Host "❌ Error: .env file not found"
    Write-Host "   Creating .env from env.example..."
    Copy-Item "env.example" ".env"
    Write-Host "✅ Created .env file. Please run this script again."
}

