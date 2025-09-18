const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();

async function makeUserAdmin(discordId) {
  try {
    console.log(`Looking for user with Discord ID: ${discordId}`);
    
    // Find user by Discord ID
    const usersSnapshot = await db.collection('users')
      .where('discordId', '==', discordId)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      console.log('❌ User not found with that Discord ID');
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    
    console.log(`Found user: ${userData.username} (${userData.email})`);
    
    // Update user to be admin and whitelisted
    await userDoc.ref.update({
      isAdmin: true,
      isWhitelisted: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ User successfully promoted to admin!');
    console.log('You can now access the admin dashboard.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

// Get Discord ID from command line argument
const discordId = process.argv[2];

if (!discordId) {
  console.log('Usage: node make-admin.js <discord-id>');
  console.log('Example: node make-admin.js 924037593010683914');
  process.exit(1);
}

makeUserAdmin(discordId);
