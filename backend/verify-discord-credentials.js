require('dotenv').config();
const crypto = require('crypto');

console.log('🔍 Verifying Discord OAuth Credentials...\n');

// Get credentials (same way as the service does)
const clientId = (process.env.DISCORD_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
const clientSecret = (process.env.DISCORD_CLIENT_SECRET || '').trim().replace(/^["']|["']$/g, '');

console.log('📋 Current Configuration:');
console.log(`   DISCORD_CLIENT_ID: ${clientId ? clientId : '❌ MISSING'} (Length: ${clientId.length})`);
console.log(`   DISCORD_CLIENT_SECRET: ${clientSecret ? clientSecret.substring(0, 8) + '...' : '❌ MISSING'} (Length: ${clientSecret.length})`);
console.log('');

// Validate
if (!clientId || !clientSecret) {
  console.error('❌ ERROR: Discord credentials are missing from backend/.env');
  console.log('\n📝 Please add these to backend/.env:');
  console.log('   DISCORD_CLIENT_ID=your_client_id');
  console.log('   DISCORD_CLIENT_SECRET=your_client_secret');
  process.exit(1);
}

if (clientId.length < 17 || clientId.length > 19) {
  console.warn('⚠️  WARNING: Discord Client ID should be 17-19 digits');
}

if (clientSecret.length < 30) {
  console.warn('⚠️  WARNING: Discord Client Secret seems too short');
}

// Expected values from env.example
const expectedClientId = '1413650646556479490';
const expectedClientSecretStart = 'w7t72_e';

console.log('🔍 Validation:');
console.log(`   Client ID matches expected: ${clientId === expectedClientId ? '✅' : '⚠️  NO'}`);
console.log(`   Client Secret starts with expected: ${clientSecret.startsWith(expectedClientSecretStart) ? '✅' : '⚠️  NO'}`);
console.log('');

if (clientId !== expectedClientId) {
  console.warn('⚠️  Client ID does not match the expected value from env.example');
}

if (!clientSecret.startsWith(expectedClientSecretStart)) {
  console.warn('⚠️  Client Secret does not match the expected value from env.example');
  console.log('');
  console.log('🔑 The client secret may have been reset in Discord Developer Portal.');
  console.log('   If you see "Reset Secret" button in Discord, the secret has changed.');
  console.log('');
}

console.log('📋 Next Steps:');
console.log('1. Go to Discord Developer Portal: https://discord.com/developers/applications');
console.log(`2. Select your application (Client ID: ${clientId})`);
console.log('3. Go to OAuth2 → General');
console.log('4. Check the Client Secret:');
console.log('   - If you see "Reset Secret", the secret has been changed');
console.log('   - Click "Reset Secret" to get a new one');
console.log('   - Copy the new Client Secret immediately (shown only once)');
console.log('5. Update backend/.env with the correct Client Secret');
console.log('6. Make sure there are NO quotes around the values');
console.log('7. Restart your backend server');
console.log('');
console.log('✅ If credentials are correct and you still get invalid_client error,');
console.log('   the Client Secret has likely been reset and needs to be updated.');

