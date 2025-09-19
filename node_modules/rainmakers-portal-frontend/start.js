const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Rainmakers Portal Frontend...');
console.log('📁 Current directory:', process.cwd());
console.log('🔍 Checking if dist folder exists...');

try {
  // Check if dist folder exists
  const fs = require('fs');
  const distPath = path.join(process.cwd(), 'dist');
  
  if (!fs.existsSync(distPath)) {
    console.log('❌ dist folder not found, building...');
    execSync('npm run build', { stdio: 'inherit' });
  } else {
    console.log('✅ dist folder found');
  }
  
  // Start serve
  console.log('🌐 Starting serve on port:', process.env.PORT || 3000);
  execSync('npx serve -s dist -l $PORT', { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ Error starting frontend:', error.message);
  process.exit(1);
}
