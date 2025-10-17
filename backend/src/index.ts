import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import dealRoutes from './routes/deals';
import documentRoutes from './routes/documents';
import adminRoutes from './routes/admin';
import webhookRoutes from './routes/webhooks';
import onedriveRoutes from './routes/onedrive';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';

// Import services
import { EmailService } from './services/emailService';
import { FirebaseService } from './services/firebaseService';

dotenv.config();

const app = express();

// Trust proxy for Railway deployment (needed for rate limiting and real IP detection)
app.set('trust proxy', 1);

// Body parsing middleware (must come before request logging)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`🌐 [${timestamp}] ${req.method} ${req.path}`);
  console.log(`📍 Headers:`, {
    'user-agent': req.headers['user-agent'],
    'origin': req.headers.origin,
    'referer': req.headers.referer,
    'authorization': req.headers.authorization ? 'Bearer ***' : 'none',
    'content-type': req.headers['content-type']
  });
  console.log(`🔍 Query:`, req.query);
  console.log(`📦 Body:`, req.body);
  console.log('---');
  next();
});

// Security middleware
app.use(helmet());

// Increase body size limits for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://rain.club',
      'https://www.rain.club',
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    
    console.log('🌐 [CORS] Request origin:', origin);
    console.log('🌐 [CORS] Allowed origins:', allowedOrigins);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ [CORS] Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log('❌ [CORS] Origin blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Cookie parsing middleware
app.use(cookieParser());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes - Public routes first to avoid conflicts
// Public OneDrive routes (no authentication required) - MUST be first
app.use('/api/onedrive', onedriveRoutes);
app.use('/api/auth', authRoutes);
// Discord OAuth callback (separate route for browser redirect) - explicit mounting
app.use('/auth', authRoutes);
// OneDrive OAuth callback and PKCE (public, no authentication required)
app.use('/auth', adminRoutes);
// Webhook routes (public, no authentication required)
app.use('/api/webhooks', webhookRoutes);
app.use('/api/user', authenticateToken, userRoutes);
app.use('/api/deals', authenticateToken, dealRoutes);
app.use('/api/documents', authenticateToken, documentRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);

// Root route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Rainmakers Portal Backend is running!',
    status: 'OK',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      authCallback: '/auth/discord/callback',
      webhooks: '/api/webhooks',
      deals: '/api/deals',
      documents: '/api/documents',
      admin: '/api/admin'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Response logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`📤 [${new Date().toISOString()}] Response ${res.statusCode} for ${req.method} ${req.path}`);
    console.log(`📋 Response data:`, typeof data === 'string' ? JSON.parse(data || '{}') : data);
    console.log('---');
    return originalSend.call(this, data);
  };
  next();
});

// Error handling
app.use(errorHandler);

// Start server
const PORT = parseInt(process.env.PORT || '3001', 10);

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Rainmakers Portal Backend running on port ${PORT}`);
  console.log(`🔥 Database: Firebase Firestore`);
  console.log(`🌐 Frontend URL: https://www.rain.club`);
  
  // Initialize email service if configured
  try {
    const emailConfig = await FirebaseService.getEmailConfig();
    if (emailConfig && emailConfig.enabled) {
      await EmailService.initialize(emailConfig);
      console.log(`📧 Email Service: Configured and ready`);
    } else {
      console.log(`📧 Email Service: Not configured`);
    }
  } catch (error) {
    console.log(`📧 Email Service: Failed to initialize - ${error}`);
  }
});

export default app;
