# 🚀 Rainmakers Portal

A secure Rainmakers-branded portal with Discord OAuth login, synced with GoHighLevel (GHL) APIs for appointments & deals, and Microsoft OneDrive (Graph API) for centralized document storage.

## 🔥 Features

- **Discord OAuth2 Authentication** with whitelist management
- **GoHighLevel Integration** for appointments and deals
- **Microsoft OneDrive Integration** for document storage
- **Admin Dashboard** for configuration and user management
- **Real-time Updates** powered by Firebase Firestore
- **Modern UI** with Tailwind CSS and React

## 🛠 Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** Firebase Firestore
- **Authentication:** Discord OAuth2 + JWT
- **APIs:** GoHighLevel API, Microsoft Graph API
- **File Storage:** Microsoft OneDrive

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm run install:all
   ```

2. **Setup Environment Variables**
   - Copy `backend/.env.example` to `backend/.env`
   - Fill in your API keys and configuration

3. **Setup Firebase**
   - Create a Firebase project
   - Download service account key
   - Update Firebase configuration in `.env`

4. **Start Development Servers**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
Rainmakers Portal/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── controllers/    # API controllers
│   │   ├── middleware/     # Auth, validation
│   │   ├── routes/         # API routes
│   │   ├── services/       # GHL, OneDrive, Discord services
│   │   └── utils/          # Utilities
│   └── package.json
├── frontend/               # React TypeScript app
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Dashboard pages
│   │   ├── services/       # API calls
│   │   └── hooks/          # Custom hooks
│   └── package.json
└── shared/                 # Shared types
```

## 🔐 Environment Variables

### Backend (.env)
```env
# Server
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-here
SESSION_SECRET=your-session-secret-here

# Firebase (Already configured for rainmakers-portal project)
FIREBASE_PROJECT_ID=rainmakers-portal
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@rainmakers-portal.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# Discord OAuth
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_REDIRECT_URI=http://localhost:3001/auth/discord/callback

# GoHighLevel API
GHL_API_KEY=your-ghl-api-key
GHL_BASE_URL=https://rest.gohighlevel.com/v1

# Microsoft Graph API
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_REDIRECT_URI=http://localhost:3001/auth/microsoft/callback
MICROSOFT_TENANT_ID=common

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api
VITE_DISCORD_CLIENT_ID=your-discord-client-id
VITE_MICROSOFT_CLIENT_ID=your-microsoft-client-id
VITE_FIREBASE_PROJECT_ID=rainmakers-portal
VITE_FIREBASE_API_KEY=AIzaSyBO6_83KDTsLYLesrcCRklHMdqBz3Qc1Xs
VITE_FIREBASE_AUTH_DOMAIN=rainmakers-portal.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=rainmakers-portal.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=672672716720
VITE_FIREBASE_APP_ID=1:672672716720:web:3bf2a0e6fb801632a2a875
VITE_FIREBASE_MEASUREMENT_ID=G-D1KMRGHL59
```

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/discord` - Discord OAuth callback
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Deals
- `GET /api/deals` - Get user's deals
- `POST /api/deals` - Create new deal
- `PUT /api/deals/:id` - Update deal
- `DELETE /api/deals/:id` - Delete deal

### Appointments
- `GET /api/appointments` - Get user's appointments
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment

### Documents
- `GET /api/documents/:dealId` - Get deal documents
- `POST /api/documents/upload` - Upload document
- `DELETE /api/documents/:id` - Delete document

### Admin
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id` - Update user (whitelist/admin)
- `POST /api/admin/onedrive/connect` - Connect OneDrive
- `GET /api/admin/analytics` - Get analytics

## 🔥 Firebase Collections

- `users` - User profiles and permissions
- `deals` - Deal submissions and tracking
- `appointments` - Calendar appointments
- `documents` - File metadata
- `configurations` - System settings
- `onedrive_tokens` - OneDrive access tokens

## 🚀 Deployment

1. **Backend:** Deploy to Vercel, Railway, or similar
2. **Frontend:** Deploy to Vercel, Netlify, or similar
3. **Database:** Firebase Firestore (already hosted)
4. **File Storage:** Microsoft OneDrive (already hosted)

## 📝 License

Private - Rainmakers Portal
