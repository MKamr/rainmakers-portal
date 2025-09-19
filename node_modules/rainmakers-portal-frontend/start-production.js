const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Rainmakers Portal Frontend...');
const currentDir = process.cwd();
console.log(`📁 Current directory: ${currentDir}`);

const distPath = path.join(currentDir, 'dist');

// Ensure dist folder exists, if not, run build
if (!fs.existsSync(distPath)) {
  console.log('🔍 dist folder not found. Running build...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completed successfully.');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ dist folder found.');
}

// Determine the port
const PORT = process.env.PORT || 3000;
console.log(`🌐 Starting serve on port: ${PORT}`);

// Start the serve process
try {
  execSync(`npx serve -s dist -l ${PORT}`, { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Serve command failed:', error.message);
  process.exit(1);
}
