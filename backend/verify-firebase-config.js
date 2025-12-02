require('dotenv').config();

console.log('🔍 Verifying Firebase Configuration...\n');

// Check required environment variables
const requiredVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY'
];

let allPresent = true;
const config = {};

requiredVars.forEach(varName => {
  const value = process.env[varName];
  
  if (!value) {
    console.log(`❌ ${varName}: MISSING`);
    allPresent = false;
  } else {
    // Show preview (masked)
    if (varName === 'FIREBASE_PRIVATE_KEY') {
      const preview = value.length > 50 
        ? `${value.substring(0, 30)}...${value.substring(value.length - 30)}`
        : value;
      console.log(`✅ ${varName}: PRESENT (${value.length} chars)`);
      console.log(`   Preview: ${preview}`);
      
      // Check for common issues
      if (!value.includes('BEGIN PRIVATE KEY')) {
        console.log(`   ⚠️  WARNING: Doesn't contain "BEGIN PRIVATE KEY"`);
      }
      if (!value.includes('\\n') && !value.includes('\n')) {
        console.log(`   ⚠️  WARNING: May be missing newline characters (\\n)`);
      }
    } else {
      const preview = value.length > 30 
        ? `${value.substring(0, 20)}...${value.substring(value.length - 10)}`
        : value;
      console.log(`✅ ${varName}: PRESENT`);
      console.log(`   Value: ${preview}`);
    }
    
    config[varName] = value;
  }
});

console.log('\n');

if (!allPresent) {
  console.log('❌ Some required environment variables are missing!');
  console.log('\nPlease add the following to your backend/.env file:');
  console.log('\nFIREBASE_PROJECT_ID=your-project-id');
  console.log('FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com');
  console.log('FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
  console.log('\n⚠️  Note: The private key must be wrapped in quotes and use \\n for newlines');
  process.exit(1);
}

// Try to initialize Firebase
console.log('🔧 Attempting to initialize Firebase Admin SDK...\n');

try {
  const admin = require('firebase-admin');
  
  // Clear any existing apps
  if (admin.apps.length > 0) {
    admin.apps.forEach(app => {
      try {
        app.delete();
      } catch (e) {
        // Ignore errors
      }
    });
  }
  
  // Prepare private key (handle both escaped and actual newlines)
  let privateKey = config.FIREBASE_PRIVATE_KEY;
  
  // Remove surrounding quotes if present
  privateKey = privateKey.replace(/^["']|["']$/g, '');
  
  // Replace \\n with actual newlines
  privateKey = privateKey.replace(/\\n/g, '\n');
  
  // Initialize Firebase
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.FIREBASE_PROJECT_ID,
      clientEmail: config.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey
    }),
    projectId: config.FIREBASE_PROJECT_ID
  });
  
  console.log('✅ Firebase Admin SDK initialized successfully!');
  
  // Try to connect to Firestore
  console.log('\n🔗 Testing Firestore connection...');
  
  const db = admin.firestore();
  
  // Try a simple read operation
  db.collection('_config').limit(1).get()
    .then(() => {
      console.log('✅ Firestore connection successful!');
      console.log('\n🎉 Firebase configuration is correct and working!');
      process.exit(0);
    })
    .catch((error) => {
      console.log('❌ Firestore connection failed:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      
      if (error.code === 16 || error.message?.includes('authentication')) {
        console.log('\n💡 This looks like an authentication issue:');
        console.log('   1. Check that your FIREBASE_PRIVATE_KEY is correct');
        console.log('   2. Ensure the private key includes actual newline characters (\\n)');
        console.log('   3. Verify the service account email matches your Firebase project');
        console.log('   4. Make sure the service account has proper permissions in Firebase Console');
      }
      
      process.exit(1);
    });
  
} catch (error) {
  console.log('❌ Failed to initialize Firebase Admin SDK:');
  console.error(`   Error: ${error.message}`);
  
  if (error.message?.includes('private key')) {
    console.log('\n💡 Private key format issue:');
    console.log('   - The private key must be wrapped in quotes in your .env file');
    console.log('   - Use \\n for newlines, like: FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
    console.log('   - Or use actual newlines (if your .env parser supports it)');
  }
  
  process.exit(1);
}

