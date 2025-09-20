import admin from 'firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!admin.apps.length) {
  console.log('Initializing Firebase Admin...');
  
  try {
    // Always try to use service account file first (works in both dev and production)
    const serviceAccount = require('../../firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('Firebase initialized with service account file');
  } catch (error) {
    console.warn('Service account file not found, trying environment variables...');
    
    // Fallback to environment variables
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    
    if (!privateKey || !clientEmail || !projectId) {
      console.error('Missing Firebase credentials. Both service account file and environment variables are not available.');
      throw new Error('Firebase credentials not properly configured');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        privateKey: privateKey.replace(/\\n/g, '\n'),
        clientEmail: clientEmail
      }),
      projectId: projectId
    });
    console.log('Firebase initialized with environment variables');
  }
}

// In-memory storage for development
const inMemoryStore: { [collection: string]: { [id: string]: any } } = {};

const db = getFirestore();

export interface User {
  id: string;
  discordId: string;
  username: string;
  email: string;
  avatar?: string;
  isAdmin: boolean;
  isWhitelisted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Deal {
  id: string;
  userId: string;
  title: string;
  description: string;
  value: number;
  stage: string;
  status: 'active' | 'won' | 'lost' | 'paused';
  ghlOpportunityId?: string;
  ghlContactId?: string;
  oneDriveFolderId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Document {
  id: string;
  dealId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  oneDriveFileId?: string;
  oneDriveWebUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class FirebaseService {
  // User operations
  static async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const userRef = db.collection('users').doc();
    const now = Timestamp.now();
    
    const user: User = {
      id: userRef.id,
      ...userData,
      createdAt: now,
      updatedAt: now
    };
    
    await userRef.set(user);
    return user;
  }

  static async getUserById(userId: string): Promise<User | null> {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      return userDoc.exists ? (userDoc.data() as User) : null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  static async getUserByDiscordId(discordId: string): Promise<User | null> {
    try {
      const usersSnapshot = await db.collection('users')
        .where('discordId', '==', discordId)
        .limit(1)
        .get();
      
      if (usersSnapshot.empty) {
        return null;
      }
      
      return usersSnapshot.docs[0].data() as User;
    } catch (error) {
      console.error('Error getting user by Discord ID:', error);
      return null;
    }
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const userRef = db.collection('users').doc(userId);
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      
      await userRef.update(updateData);
      return await this.getUserById(userId);
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  static async getAllUsers(): Promise<User[]> {
    try {
      const usersSnapshot = await db.collection('users').get();
      return usersSnapshot.docs.map(doc => doc.data() as User);
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  // Deal operations
  static async createDeal(dealData: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deal> {
    const dealRef = db.collection('deals').doc();
    const now = Timestamp.now();
    
    const deal: Deal = {
      id: dealRef.id,
      ...dealData,
      createdAt: now,
      updatedAt: now
    };
    
    await dealRef.set(deal);
    return deal;
  }

  static async getDealById(dealId: string): Promise<Deal | null> {
    try {
      const dealDoc = await db.collection('deals').doc(dealId).get();
      return dealDoc.exists ? (dealDoc.data() as Deal) : null;
    } catch (error) {
      console.error('Error getting deal by ID:', error);
      return null;
    }
  }

  static async getDealsByUserId(userId: string): Promise<Deal[]> {
    try {
      const dealsSnapshot = await db.collection('deals')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      return dealsSnapshot.docs.map(doc => doc.data() as Deal);
    } catch (error) {
      console.error('Error getting deals by user ID:', error);
      return [];
    }
  }

  static async getAllDeals(): Promise<Deal[]> {
    try {
      const dealsSnapshot = await db.collection('deals')
        .orderBy('createdAt', 'desc')
        .get();
      
      return dealsSnapshot.docs.map(doc => doc.data() as Deal);
    } catch (error) {
      console.error('Error getting all deals:', error);
      return [];
    }
  }

  static async updateDeal(dealId: string, updates: Partial<Deal>): Promise<Deal | null> {
    try {
      const dealRef = db.collection('deals').doc(dealId);
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      
      await dealRef.update(updateData);
      return await this.getDealById(dealId);
    } catch (error) {
      console.error('Error updating deal:', error);
      return null;
    }
  }

  static async deleteDeal(dealId: string): Promise<boolean> {
    try {
      await db.collection('deals').doc(dealId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting deal:', error);
      return false;
    }
  }

  // Document operations
  static async createDocument(documentData: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document> {
    const documentRef = db.collection('documents').doc();
    const now = Timestamp.now();
    
    const document: Document = {
      id: documentRef.id,
      ...documentData,
      createdAt: now,
      updatedAt: now
    };
    
    await documentRef.set(document);
    return document;
  }

  static async getDocumentById(documentId: string): Promise<Document | null> {
    try {
      const documentDoc = await db.collection('documents').doc(documentId).get();
      return documentDoc.exists ? (documentDoc.data() as Document) : null;
    } catch (error) {
      console.error('Error getting document by ID:', error);
      return null;
    }
  }

  static async getDocumentsByDealId(dealId: string): Promise<Document[]> {
    try {
      const documentsSnapshot = await db.collection('documents')
        .where('dealId', '==', dealId)
        .orderBy('createdAt', 'desc')
        .get();
      
      return documentsSnapshot.docs.map(doc => doc.data() as Document);
    } catch (error) {
      console.error('Error getting documents by deal ID:', error);
      return [];
    }
  }

  static async getDocumentsByUserId(userId: string): Promise<Document[]> {
    try {
      const documentsSnapshot = await db.collection('documents')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      return documentsSnapshot.docs.map(doc => doc.data() as Document);
    } catch (error) {
      console.error('Error getting documents by user ID:', error);
      return [];
    }
  }

  static async updateDocument(documentId: string, updates: Partial<Document>): Promise<Document | null> {
    try {
      const documentRef = db.collection('documents').doc(documentId);
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      
      await documentRef.update(updateData);
      return await this.getDocumentById(documentId);
    } catch (error) {
      console.error('Error updating document:', error);
      return null;
    }
  }

  static async deleteDocument(documentId: string): Promise<boolean> {
    try {
      await db.collection('documents').doc(documentId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }

  // Admin operations
  static async makeUserAdmin(userId: string): Promise<boolean> {
    try {
      await this.updateUser(userId, { isAdmin: true, isWhitelisted: true });
      return true;
    } catch (error) {
      console.error('Error making user admin:', error);
      return false;
    }
  }

  static async removeUserAdmin(userId: string): Promise<boolean> {
    try {
      await this.updateUser(userId, { isAdmin: false });
      return true;
    } catch (error) {
      console.error('Error removing user admin:', error);
      return false;
    }
  }

  static async whitelistUser(userId: string): Promise<boolean> {
    try {
      await this.updateUser(userId, { isWhitelisted: true });
      return true;
    } catch (error) {
      console.error('Error whitelisting user:', error);
      return false;
    }
  }

  static async removeUserFromWhitelist(userId: string): Promise<boolean> {
    try {
      await this.updateUser(userId, { isWhitelisted: false });
      return true;
    } catch (error) {
      console.error('Error removing user from whitelist:', error);
      return false;
    }
  }

  // Analytics operations
  static async getDealAnalytics(): Promise<{
    totalDeals: number;
    totalValue: number;
    dealsByStage: { [stage: string]: number };
    dealsByStatus: { [status: string]: number };
    dealsByMonth: { [month: string]: number };
  }> {
    try {
      const dealsSnapshot = await db.collection('deals').get();
      const deals = dealsSnapshot.docs.map(doc => doc.data() as Deal);
      
      const totalDeals = deals.length;
      const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
      
      const dealsByStage = deals.reduce((acc, deal) => {
        acc[deal.stage] = (acc[deal.stage] || 0) + 1;
        return acc;
      }, {} as { [stage: string]: number });
      
      const dealsByStatus = deals.reduce((acc, deal) => {
        acc[deal.status] = (acc[deal.status] || 0) + 1;
        return acc;
      }, {} as { [status: string]: number });
      
      const dealsByMonth = deals.reduce((acc, deal) => {
        const month = deal.createdAt.toDate().toISOString().substring(0, 7); // YYYY-MM
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as { [month: string]: number });
      
      return {
        totalDeals,
        totalValue,
        dealsByStage,
        dealsByStatus,
        dealsByMonth
      };
    } catch (error) {
      console.error('Error getting deal analytics:', error);
      return {
        totalDeals: 0,
        totalValue: 0,
        dealsByStage: {},
        dealsByStatus: {},
        dealsByMonth: {}
      };
    }
  }

  static async getUserAnalytics(): Promise<{
    totalUsers: number;
    adminUsers: number;
    whitelistedUsers: number;
    usersByMonth: { [month: string]: number };
  }> {
    try {
      const usersSnapshot = await db.collection('users').get();
      const users = usersSnapshot.docs.map(doc => doc.data() as User);
      
      const totalUsers = users.length;
      const adminUsers = users.filter(user => user.isAdmin).length;
      const whitelistedUsers = users.filter(user => user.isWhitelisted).length;
      
      const usersByMonth = users.reduce((acc, user) => {
        const month = user.createdAt.toDate().toISOString().substring(0, 7); // YYYY-MM
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as { [month: string]: number });
      
      return {
        totalUsers,
        adminUsers,
        whitelistedUsers,
        usersByMonth
      };
    } catch (error) {
      console.error('Error getting user analytics:', error);
      return {
        totalUsers: 0,
        adminUsers: 0,
        whitelistedUsers: 0,
        usersByMonth: {}
      };
    }
  }
}