import admin from 'firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!admin.apps.length) {
  console.log('Initializing Firebase Admin...');
  
  // In production (Vercel), use environment variables
  if (process.env.NODE_ENV === 'production') {
    console.log('Production environment detected, using environment variables...');
    
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    
    if (!privateKey || !clientEmail || !projectId) {
      console.error('Missing Firebase environment variables:', {
        privateKey: !!privateKey,
        clientEmail: !!clientEmail,
        projectId: !!projectId
      });
      throw new Error('Firebase credentials not properly configured in production');
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
  } else {
    // Development - try service account file first
    try {
      const serviceAccount = require('../../firebase-service-account.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      console.log('Firebase initialized with service account file');
    } catch (error) {
      console.warn('Service account file not found, using environment variables...');
      
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      
      if (!privateKey || !clientEmail) {
        console.warn('Firebase credentials not found. Using in-memory storage for development.');
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'rainmakers-portal'
        });
      } else {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID || 'rainmakers-portal',
            privateKey: privateKey.replace(/\\n/g, '\n'),
            clientEmail: clientEmail
          }),
          projectId: process.env.FIREBASE_PROJECT_ID || 'rainmakers-portal'
        });
        console.log('Firebase initialized with environment variables');
      }
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

export interface Deal {
  id: string;
  dealId: string;
  propertyName: string;
  propertyAddress: string;
  loanAmount: number;
  purchasePrice: number;
  propertyType: string;
  noi?: number;
  dscr?: number;
  requestedLeverage?: number;
  notes?: string;
  status: string;
  ghlOpportunityId?: string;
  pipelineId?: string;
  stageId?: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Contact/Sponsor Details
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactId?: string;
  businessName?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  timeZone?: string;
  lastActivityDateSalesforce?: string;
  phone?: string;
  contactSource?: string;
  contactType?: string;
  contactDocumentUpload?: string;
  opportunitySource?: string;
  
  // Company Details
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyAddress?: string;
  companyState?: string;
  companyCity?: string;
  companyDescription?: string;
  companyPostalCode?: string;
  companyCountry?: string;
  
  // Lead Property Details
  leadPropertyType?: string;
  leadPropertyAddress?: string;
  leadPropertyCity?: string;
  leadPropertyState?: string;
  leadPropertyPurchaseDate?: string;
  
  // Document Fields
  fileUpload?: string;
  
  applicationDate?: string;
  sponsorName?: string;
  sponsorNetWorth?: string;
  sponsorLiquidity?: string;
  
  // Opportunity Details
  opportunityName?: string;
  pipeline?: string;
  stage?: string;
  opportunityValue?: number;
  owner?: string;
  followers?: string[];
  tags?: string[];
  additionalContacts?: string[];
  lostReason?: string;
  applicationDocumentUpload?: string;
  applicationAdditionalInformation?: string;
  
  // Property Details
  propertyAPN?: string;
  propertyVintage?: string;
  propertyStatus?: string;
  numberOfUnits?: number;
  originalPurchaseDate?: string;
  occupancyPercentage?: number;
  appraisedValue?: number;
  debitYield?: number;
  propertyCapEx?: number;
  costBasis?: number;
  managementEntity?: string;
  occupancyPercentageDate?: string;
  
  // Loan Details
  loanType?: string;
  loanTerm?: number;
  interestRate?: number;
  amortizationPeriod?: number;
  prepaymentPenalty?: string;
  loanPurpose?: string;
  borrowingEntity?: string;
  lender?: string;
  unpaidPrincipalBalance?: number;
  dealType?: string;
  investmentType?: string;
  ltv?: number;
  hcOriginationFee?: string;
  ysp?: number;
  processingFee?: string;
  lenderOriginationFee?: string;
  term?: string;
  index?: string;
  indexPercentage?: number;
  spreadPercentage?: number;
  ratePercentage?: number;
  amortization?: string;
  exitFee?: string;
  recourse?: string;
  fixedMaturityDate?: string;
  floatingMaturityDate?: string;
  
  // Additional Financial Details
  capRate?: number;
  cashFlow?: number;
  totalProjectCost?: number;
  renovationCost?: number;
  closingCosts?: number;
  
  // Audit Information
  createdBy?: string;
  createdOn?: string;
  auditLogs?: string;
}

export interface Document {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  tags: string[];
  oneDriveId?: string;
  oneDriveUrl?: string;
  userId: string;
  dealId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Configuration {
  id: string;
  key: string;
  value: string;
  description?: string;
  isEncrypted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OneDriveToken {
  id: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Timestamp;
  scope: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class FirebaseService {
  // Helper function to check if we should use in-memory storage
  private static useInMemoryStore(): boolean {
    try {
      require('../../firebase-service-account.json');
      return false; // Service account file exists, use Firebase
    } catch {
      return !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL;
    }
  }

  // User operations
  static async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const now = Timestamp.now();
    
    // Ensure all required fields are present and filter out undefined values
    const cleanUserData = {
      discordId: userData.discordId,
      username: userData.username,
      email: userData.email,
      isAdmin: userData.isAdmin,
      isWhitelisted: userData.isWhitelisted,
      ...(userData.avatar !== undefined && { avatar: userData.avatar }),
    };
    
    if (this.useInMemoryStore()) {
      const user: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...cleanUserData,
        createdAt: now,
        updatedAt: now,
      };
      
      if (!inMemoryStore.users) inMemoryStore.users = {};
      inMemoryStore.users[user.id] = user;
      return user;
    }
    
    const userRef = db.collection('users').doc();
    const user: User = {
      id: userRef.id,
      ...cleanUserData,
      createdAt: now,
      updatedAt: now,
    };
    
    await userRef.set(user);
    return user;
  }

  static async getUserById(id: string): Promise<User | null> {
    if (this.useInMemoryStore()) {
      return inMemoryStore.users?.[id] || null;
    }
    
    const userDoc = await db.collection('users').doc(id).get();
    return userDoc.exists ? (userDoc.data() as User) : null;
  }

  static async getUserByDiscordId(discordId: string): Promise<User | null> {
    if (this.useInMemoryStore()) {
      const users = inMemoryStore.users || {};
      return Object.values(users).find((user: any) => user.discordId === discordId) || null;
    }
    
    const usersSnapshot = await db.collection('users')
      .where('discordId', '==', discordId)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) return null;
    
    const userDoc = usersSnapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as User;
  }

  static async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    // Filter out undefined values for Firestore compatibility
    const cleanUpdates: any = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    });
    
    if (this.useInMemoryStore()) {
      if (!inMemoryStore.users?.[id]) return null;
      
      inMemoryStore.users[id] = {
        ...inMemoryStore.users[id],
        ...cleanUpdates,
        updatedAt: Timestamp.now(),
      };
      
      return inMemoryStore.users[id];
    }
    
    const userRef = db.collection('users').doc(id);
    const updateData = {
      ...cleanUpdates,
      updatedAt: Timestamp.now(),
    };
    
    await userRef.update(updateData);
    return await this.getUserById(id);
  }

  static async getAllUsers(): Promise<User[]> {
    const usersSnapshot = await db.collection('users').get();
    return usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  }

  // Deal operations
  static async createDeal(dealData: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deal> {
    const now = Timestamp.now();
    
    // Filter out undefined values to avoid Firestore errors
    const cleanDealData = Object.fromEntries(
      Object.entries(dealData).filter(([_, value]) => value !== undefined)
    );
    
    const dealRef = db.collection('deals').doc();
    const deal: Deal = {
      id: dealRef.id,
      ...cleanDealData,
      createdAt: now,
      updatedAt: now,
    } as Deal;
    
    await dealRef.set(deal);
    return deal;
  }

  static async getDealById(id: string): Promise<Deal | null> {
    const dealDoc = await db.collection('deals').doc(id).get();
    return dealDoc.exists ? (dealDoc.data() as Deal) : null;
  }

  static async getDealsByUserId(userId: string): Promise<Deal[]> {
    if (this.useInMemoryStore()) {
      // For in-memory storage, return empty array for now
      return [];
    }
    
    const dealsSnapshot = await db.collection('deals')
      .where('userId', '==', userId)
      .get();
    
    // Sort in memory to avoid index requirement
    const deals = dealsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deal));
    return deals.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }

  static async getAllDeals(): Promise<Deal[]> {
    const dealsSnapshot = await db.collection('deals')
      .orderBy('createdAt', 'desc')
      .get();
    
    return dealsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deal));
  }

  static async updateDeal(id: string, updates: Partial<Deal>): Promise<Deal | null> {
    // Filter out undefined values for Firestore compatibility
    const cleanUpdates: any = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    });
    
    const dealRef = db.collection('deals').doc(id);
    const updateData = {
      ...cleanUpdates,
      updatedAt: Timestamp.now(),
    };
    
    await dealRef.update(updateData);
    return await this.getDealById(id);
  }

  static async deleteDeal(id: string): Promise<void> {
    await db.collection('deals').doc(id).delete();
  }

  // Document operations - DISABLED
  // Documents are not stored in Firebase

  // Configuration operations
  static async getConfiguration(key: string): Promise<string | null> {
    const configDoc = await db.collection('configurations').doc(key).get();
    return configDoc.exists ? (configDoc.data() as Configuration).value : null;
  }

  static async setConfiguration(key: string, value: string, description?: string, isEncrypted: boolean = false): Promise<void> {
    const now = Timestamp.now();
    const config: Configuration = {
      id: key,
      key,
      value,
      description,
      isEncrypted,
      createdAt: now,
      updatedAt: now,
    };
    
    await db.collection('configurations').doc(key).set(config);
  }

  // OneDrive Token operations
  static async saveOneDriveToken(tokenData: Omit<OneDriveToken, 'id' | 'createdAt' | 'updatedAt'>): Promise<OneDriveToken> {
    const now = Timestamp.now();
    const tokenRef = db.collection('onedrive_tokens').doc();
    const token: OneDriveToken = {
      id: tokenRef.id,
      ...tokenData,
      createdAt: now,
      updatedAt: now,
    };
    
    await tokenRef.set(token);
    return token;
  }

  static async getLatestOneDriveToken(): Promise<OneDriveToken | null> {
    const tokensSnapshot = await db.collection('onedrive_tokens')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (tokensSnapshot.empty) return null;
    
    const tokenDoc = tokensSnapshot.docs[0];
    return { id: tokenDoc.id, ...tokenDoc.data() } as OneDriveToken;
  }

  static async updateOneDriveToken(id: string, updates: Partial<OneDriveToken>): Promise<OneDriveToken | null> {
    const tokenRef = db.collection('onedrive_tokens').doc(id);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now(),
    };
    
    await tokenRef.update(updateData);
    const tokenDoc = await tokenRef.get();
    return tokenDoc.exists ? { id: tokenDoc.id, ...tokenDoc.data() } as OneDriveToken : null;
  }
}
