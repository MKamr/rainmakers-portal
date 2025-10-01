import admin from 'firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!admin.apps.length) {
  console.log('🔥 [FIREBASE] Initializing Firebase Admin...');
  
  // Try environment variables first (for production)
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  
  console.log('🔥 [FIREBASE] Environment check:', {
    hasPrivateKey: !!privateKey,
    hasClientEmail: !!clientEmail,
    hasProjectId: !!projectId,
    projectId: projectId,
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL
  });
  
  if (privateKey && clientEmail && projectId) {
    console.log('🔥 [FIREBASE] Using Firebase environment variables...');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        privateKey: privateKey.replace(/\\n/g, '\n'),
        clientEmail: clientEmail
      }),
      projectId: projectId
    });
    console.log('🔥 [FIREBASE] Firebase initialized with environment variables');
  } else {
    console.log('🔥 [FIREBASE] Environment variables not found, trying service account file...');
    try {
      // Fallback to service account file
      const serviceAccount = require('../../firebase-service-account.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      console.log('🔥 [FIREBASE] Firebase initialized with service account file');
    } catch (error) {
      console.error('🔥 [FIREBASE] Both environment variables and service account file are not available.');
      console.error('🔥 [FIREBASE] Missing Firebase credentials:', {
        privateKey: !!privateKey,
        clientEmail: !!clientEmail,
        projectId: !!projectId
      });
      throw new Error('Firebase credentials not properly configured');
    }
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

export interface DiscordAutoAccessUser {
  id: string;
  discordUsername: string;
  notes: string;
  addedBy: string;
  addedByUsername: string;
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
  propertyAddress?: string;
  propertyType?: string;
  dealType?: string;
  dealId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Document {
  id: string;
  name: string;
  url: string;
  uploadedBy: string;
  uploadedAt: Timestamp;
  fileType: string;
  fileSize: number;
}

export interface Analytics {
  totalDeals: number;
  totalValue: number;
  dealsByStatus: { [status: string]: number };
  dealsByMonth: { [month: string]: number };
}

export interface OneDriveToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Timestamp;
  scope: string;
}

export class FirebaseService {
  private static usersCollection = db.collection('users');
  private static dealsCollection = db.collection('deals');
  private static discordAutoAccessCollection = db.collection('discordAutoAccess');

  // User methods
  static async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const newUserRef = FirebaseService.usersCollection.doc();
    const now = Timestamp.now();
    const newUser: User = {
      id: newUserRef.id,
      ...userData,
      createdAt: now,
      updatedAt: now,
    };
    await newUserRef.set(newUser);
    return newUser;
  }

  static async getUserById(id: string): Promise<User | null> {
    const userDoc = await FirebaseService.usersCollection.doc(id).get();
    return userDoc.exists ? (userDoc.data() as User) : null;
  }

  static async getUserByDiscordId(discordId: string): Promise<User | null> {
    try {
      const snapshot = await FirebaseService.usersCollection.where('discordId', '==', discordId).limit(1).get();
      if (snapshot.empty) {
        return null;
      }
      return snapshot.docs[0].data() as User;
    } catch (error) {
      console.error('Error getting user by Discord ID:', error);
      throw error;
    }
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const snapshot = await FirebaseService.usersCollection.where('email', '==', email).limit(1).get();
    if (snapshot.empty) {
      return null;
    }
    return snapshot.docs[0].data() as User;
  }

  static async updateUser(id: string, userData: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const userRef = FirebaseService.usersCollection.doc(id);
    const now = Timestamp.now();
    await userRef.update({ ...userData, updatedAt: now });
    return this.getUserById(id);
  }

  static async deleteUser(id: string): Promise<void> {
    await FirebaseService.usersCollection.doc(id).delete();
  }

  static async getAllUsers(): Promise<User[]> {
    const snapshot = await FirebaseService.usersCollection.get();
    return snapshot.docs.map(doc => doc.data() as User);
  }

  // Discord Auto-Access methods
  static async getDiscordAutoAccessUsers(): Promise<DiscordAutoAccessUser[]> {
    const snapshot = await FirebaseService.discordAutoAccessCollection.get();
    return snapshot.docs.map(doc => doc.data() as DiscordAutoAccessUser);
  }

  static async getDiscordAutoAccessUserByUsername(discordUsername: string): Promise<DiscordAutoAccessUser | null> {
    try {
      const snapshot = await FirebaseService.discordAutoAccessCollection
        .where('discordUsername', '==', discordUsername)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      return snapshot.docs[0].data() as DiscordAutoAccessUser;
    } catch (error) {
      console.error('Error getting Discord auto-access user by username:', error);
      return null;
    }
  }

  static async addDiscordAutoAccessUser(userData: Omit<DiscordAutoAccessUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<DiscordAutoAccessUser> {
    const newUserRef = FirebaseService.discordAutoAccessCollection.doc();
    const now = Timestamp.now();
    const newUser: DiscordAutoAccessUser = {
      id: newUserRef.id,
      ...userData,
      createdAt: now,
      updatedAt: now,
    };
    await newUserRef.set(newUser);
    return newUser;
  }

  static async removeDiscordAutoAccessUser(id: string): Promise<boolean> {
    try {
      const userRef = FirebaseService.discordAutoAccessCollection.doc(id);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        return false;
      }
      
      await userRef.delete();
      return true;
    } catch (error) {
      console.error('Error removing Discord auto-access user:', error);
      return false;
    }
  }

  // Deal methods - Updated to handle flexible data structure and filter undefined values
  static async createDeal(dealData: any): Promise<any> {
    try {
      console.log('🔥 [FIREBASE] Creating deal with data:', dealData);
      
      const newDealRef = FirebaseService.dealsCollection.doc();
    const now = Timestamp.now();
    
      // Filter out undefined values to prevent Firestore errors
    const cleanDealData = Object.fromEntries(
        Object.entries(dealData).filter(([key, value]) => value !== undefined)
      );
      
      console.log('🔥 [FIREBASE] Cleaned deal data (removed undefined):', cleanDealData);
      
      // Create deal with flexible structure - include all provided fields
      const newDeal = {
        id: newDealRef.id,
      ...cleanDealData,
      createdAt: now,
      updatedAt: now,
      };
      
      console.log('🔥 [FIREBASE] Deal to be saved:', newDeal);
      
      await newDealRef.set(newDeal);
      console.log('✅ [FIREBASE] Deal created successfully with ID:', newDealRef.id);
      
      return newDeal;
    } catch (error) {
      console.error('❌ [FIREBASE] Error creating deal:', error);
      throw error;
    }
  }

  static async getDealById(id: string): Promise<Deal | null> {
    const dealDoc = await FirebaseService.dealsCollection.doc(id).get();
    return dealDoc.exists ? (dealDoc.data() as Deal) : null;
  }

  static async updateDeal(id: string, dealData: Partial<Omit<Deal, 'id' | 'createdAt'>>): Promise<Deal | null> {
    const dealRef = FirebaseService.dealsCollection.doc(id);
    const now = Timestamp.now();
    await dealRef.update({ ...dealData, updatedAt: now });
    return this.getDealById(id);
  }

  static async deleteDeal(id: string): Promise<void> {
    await FirebaseService.dealsCollection.doc(id).delete();
  }

  // ✅ EXACT MATCH TO YOUR QUERY STRUCTURE
  static async getDealsByUserId(userId: string): Promise<Deal[]> {
    try {
      console.log('🔥 [FIREBASE] Getting deals for user ID:', userId);
      
      // Match your exact Firebase query structure
      const dealsRef = db.collection('deals');
      const q = dealsRef.where('userId', '==', userId);
      
      const querySnapshot = await q.get();
      console.log('🔥 [FIREBASE] Query executed, found documents:', querySnapshot.docs.length);
      
      const userDeals: Deal[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('🔥 [FIREBASE] Deal document:', {
          id: doc.id,
          userId: data.userId,
          status: data.status,
          stage: data.stage,
          title: data.title,
          value: data.value
        });
        
        // Match your exact structure: { id: doc.id, ...doc.data() }
        userDeals.push({ id: doc.id, ...data } as Deal);
      });
      
      console.log('🔥 [FIREBASE] Deals for user:', userDeals.length);
      return userDeals;
    } catch (error) {
      console.error('❌ [FIREBASE] Error getting deals by user ID:', error);
      console.error('❌ [FIREBASE] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        userId
      });
      return [];
    }
  }

  static async getAllDeals(): Promise<Deal[]> {
    try {
      console.log('🔥 [FIREBASE] Getting all deals from deals collection...');
      
    const dealsSnapshot = await db.collection('deals')
      .orderBy('createdAt', 'desc')
      .get();
    
      console.log('🔥 [FIREBASE] Found total documents in deals collection:', dealsSnapshot.docs.length);
      
      const deals = dealsSnapshot.docs.map(doc => {
        // ✅ FIX: Include document ID in the response
        return { id: doc.id, ...doc.data() } as Deal;
      });
      
      console.log('🔥 [FIREBASE] Returning all deals:', deals.length);
      return deals;
    } catch (error) {
      console.error('❌ [FIREBASE] Error getting all deals:', error);
      return [];
    }
  }

  static async getDealAnalytics(): Promise<Analytics> {
    const deals = await this.getAllDeals();
    const totalDeals = deals.length;
    const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);

    const dealsByStatus = deals.reduce((acc, deal) => {
      acc[deal.status] = (acc[deal.status] || 0) + 1;
      return acc;
    }, {} as { [status: string]: number });

    const dealsByMonth = deals.reduce((acc, deal) => {
      const month = deal.createdAt.toDate().toLocaleString('default', { month: 'short', year: 'numeric' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as { [month: string]: number });

    return {
      totalDeals,
      totalValue,
      dealsByStatus,
      dealsByMonth,
    };
  }

  // Document methods
  static async addDocumentToDeal(dealId: string, documentData: Omit<Document, 'id' | 'uploadedAt'>): Promise<Document | null> {
    const deal = await this.getDealById(dealId);
    if (!deal) return null;

    const newDocument: Document = {
      id: db.collection('temp').doc().id, // Generate a unique ID for the document
      ...documentData,
      uploadedAt: Timestamp.now(),
    };

    await FirebaseService.dealsCollection.doc(dealId).update({
      documents: admin.firestore.FieldValue.arrayUnion(newDocument)
    });

    return newDocument;
  }

  static async deleteDocumentFromDeal(dealId: string, documentId: string): Promise<void> {
    const deal = await this.getDealById(dealId);
    if (!deal) return;

    const updatedDocuments = deal.documents?.filter(doc => doc.id !== documentId) || [];

    await FirebaseService.dealsCollection.doc(dealId).update({
      documents: updatedDocuments
    });
  }

  // Configuration methods
  static async getConfiguration(key: string): Promise<string | null> {
    try {
      console.log('🔧 [CONFIG] Getting configuration for key:', key);
      
      // Try configurations collection first (new structure)
    const configDoc = await db.collection('configurations').doc(key).get();
      if (configDoc.exists) {
        const data = configDoc.data();
        console.log('🔧 [CONFIG] Found in configurations collection:', { key, hasValue: !!data?.value });
        return data?.value || null;
      }
      
      // Fallback to config collection (old structure)
      const oldConfigDoc = await db.collection('config').doc(key).get();
      if (oldConfigDoc.exists) {
        const data = oldConfigDoc.data();
        console.log('🔧 [CONFIG] Found in config collection (fallback):', { key, hasValue: !!data?.value });
        return data?.value || null;
      }
      
      console.log('🔧 [CONFIG] Configuration not found:', key);
      return null;
    } catch (error) {
      console.error('❌ [CONFIG] Error getting configuration:', error);
      return null;
    }
  }

  static async setConfiguration(key: string, value: string, description?: string): Promise<void> {
    try {
      console.log('🔧 [CONFIG] Setting configuration:', { key, hasValue: !!value, description });
      
      await db.collection('configurations').doc(key).set({
      key,
      value,
        description: description || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      console.log('🔧 [CONFIG] Configuration set successfully:', key);
    } catch (error) {
      console.error('❌ [CONFIG] Error setting configuration:', error);
      throw error;
    }
  }

  // OneDrive token methods
  static async saveOneDriveToken(tokenData: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Timestamp;
    scope: string;
  }): Promise<void> {
    try {
      await db.collection('onedrive_tokens').add({
      ...tokenData,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error saving OneDrive token:', error);
      throw error;
    }
  }

  static async getLatestOneDriveToken(): Promise<OneDriveToken | null> {
    try {
      const snapshot = await db.collection('onedrive_tokens')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
      if (snapshot.empty) {
        return null;
      }
      
      const tokenDoc = snapshot.docs[0];
      return tokenDoc.data() as any;
    } catch (error) {
      console.error('Error getting latest OneDrive token:', error);
      return null;
    }
  }

  // Analytics methods
  static async getAnalytics(): Promise<Analytics> {
    try {
      const deals = await this.getAllDeals();
      const users = await this.getAllUsers();
      
      const totalDeals = deals.length;
      const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
      
      const dealsByStatus = deals.reduce((acc, deal) => {
        acc[deal.status] = (acc[deal.status] || 0) + 1;
        return acc;
      }, {} as { [status: string]: number });
      
      const dealsByMonth = deals.reduce((acc, deal) => {
        const month = deal.createdAt.toDate().toLocaleString('default', { month: 'short', year: 'numeric' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as { [month: string]: number });
      
      const usersByMonth = users.reduce((acc, user) => {
        const month = user.createdAt.toDate().toLocaleString('default', { month: 'short', year: 'numeric' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as { [month: string]: number });
      
      return {
        totalDeals,
        totalValue,
        dealsByStatus,
        dealsByMonth,
        usersByMonth: usersByMonth
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return {
        totalDeals: 0,
        totalValue: 0,
        dealsByStatus: {},
        dealsByMonth: {},
        usersByMonth: {}
      };
    }
  }
}