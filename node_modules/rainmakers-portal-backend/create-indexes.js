const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();

async function createIndexes() {
  try {
    console.log('Creating Firestore indexes...');
    
    // Create documents index
    const documentsIndex = {
      collectionGroup: 'documents',
      fields: [
        { fieldPath: 'userId', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' }
      ]
    };
    
    // Create appointments index
    const appointmentsIndex = {
      collectionGroup: 'appointments',
      fields: [
        { fieldPath: 'userId', order: 'ASCENDING' },
        { fieldPath: 'startTime', order: 'ASCENDING' }
      ]
    };
    
    // Create deals index
    const dealsIndex = {
      collectionGroup: 'deals',
      fields: [
        { fieldPath: 'userId', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' }
      ]
    };
    
    // Create users index for discordId queries
    const usersIndex = {
      collectionGroup: 'users',
      fields: [
        { fieldPath: 'discordId', order: 'ASCENDING' }
      ]
    };
    
    console.log('Indexes will be created automatically when queries are run.');
    console.log('Or create them manually in Firebase Console:');
    console.log('1. Go to Firebase Console > Firestore > Indexes');
    console.log('2. Create composite indexes for:');
    console.log('   - documents: userId (ASC), createdAt (DESC)');
    console.log('   - appointments: userId (ASC), startTime (ASC)');
    console.log('   - deals: userId (ASC), createdAt (DESC)');
    console.log('   - users: discordId (ASC)');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

createIndexes();
