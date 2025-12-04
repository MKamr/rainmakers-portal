// Load environment variables FIRST, before any other imports
// This is critical because FirebaseService and other services need env vars at module load time
import dotenv from 'dotenv';
import path from 'path';

// Get directory paths
const currentDir = process.cwd();
const backendDir = path.join(currentDir, 'backend');
const rootDir = currentDir;

// Try backend/.env first
dotenv.config({ path: path.join(backendDir, '.env') });
// Fallback to root .env (for monorepo setups)
if (path.basename(currentDir) !== 'backend') {
  dotenv.config({ path: path.join(rootDir, '.env'), override: false });
}
// Also try current directory (for when running from backend directory)
dotenv.config({ override: false });

// Now import everything else (they can use the env vars)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import dealRoutes from './routes/deals';
import documentRoutes from './routes/documents';
import adminRoutes from './routes/admin';
import webhookRoutes from './routes/webhooks';
import onedriveRoutes from './routes/onedrive';
import appointmentsRoutes from './routes/appointments';
import paymentRoutes from './routes/payments';
import subscriptionRoutes from './routes/subscriptions';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';

// Import services (these need env vars, so dotenv must be called first)
import { EmailService } from './services/emailService';
import { FirebaseService } from './services/firebaseService';

const app = express();

// Trust proxy for Railway deployment (needed for rate limiting and real IP detection)
app.set('trust proxy', 1);

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
            next();
});

// Security middleware - configure helmet to allow cross-origin resource sharing
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// Body parsing middleware - single configuration with larger limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://rain.club',
      'https://www.rain.club',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://rainmakers-portal-backend-production.up.railway.app',
      'https://rainmakers-portal-backend.vercel.app'
    ];
    
            if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
    } else {
            callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));

// Explicit catch-all OPTIONS handler for Vercel serverless (ensures preflight requests are handled)
app.options('*', cors(corsOptions), (req, res) => {
  res.status(204).end();
});

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
// Payment webhook (public, uses Stripe signature verification)
app.use('/api/payments', paymentRoutes);
// Subscription routes (public for new users, authenticated optional)
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/user', authenticateToken, userRoutes);
app.use('/api/deals', authenticateToken, dealRoutes);
app.use('/api/documents', authenticateToken, documentRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/appointments', authenticateToken, appointmentsRoutes);

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
      admin: '/api/admin',
      appointments: '/api/appointments'
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
        return originalSend.call(this, data);
  };
  next();
});

// Error handling
app.use(errorHandler);

// Start server
const PORT = parseInt(process.env.PORT || '3001', 10);

app.listen(PORT, '0.0.0.0', async () => {
        // Initialize email service if configured
  try {
    const emailConfig = await FirebaseService.getEmailConfig();
    if (emailConfig && emailConfig.enabled) {
      await EmailService.initialize(emailConfig);
          } else {
          }
  } catch (error) {
      }
});

export default app;
