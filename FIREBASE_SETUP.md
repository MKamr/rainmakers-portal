# 🔥 Firebase Setup Guide

This guide will help you set up Firebase for the Rainmakers Portal.

## 1. Firebase Project Configuration

Your Firebase project is already configured with the following details:
- **Project ID**: `rainmakers-portal`
- **Project Name**: Rainmakers Portal
- **Web App ID**: `1:672672716720:web:3bf2a0e6fb801632a2a875`

## 2. Enable Required Services

### Firestore Database
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your `rainmakers-portal` project
3. Navigate to **Firestore Database**
4. Click **Create database**
5. Choose **Start in test mode** (we'll add security rules later)
6. Select a location (choose closest to your users)

### Authentication (Optional - for future features)
1. Go to **Authentication** in Firebase Console
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Enable **Email/Password** if needed for future features

## 3. Generate Service Account Key

### For Backend (Required)
1. Go to **Project Settings** (gear icon)
2. Navigate to **Service accounts** tab
3. Click **Generate new private key**
4. Download the JSON file
5. Rename it to `firebase-service-account.json`
6. Place it in the `backend/` directory
7. Update `backend/.env` with the values from the JSON file:

```env
FIREBASE_PROJECT_ID=rainmakers-portal
FIREBASE_PRIVATE_KEY_ID=your-private-key-id-from-json
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_FROM_JSON\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@rainmakers-portal.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id-from-json
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
```

## 4. Deploy Security Rules

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:
   ```bash
   firebase init firestore
   ```

4. Deploy the security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

5. Deploy the indexes:
   ```bash
   firebase deploy --only firestore:indexes
   ```

## 5. Test Firebase Connection

### Backend Test
1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Check the console for:
   ```
   🚀 Rainmakers Portal Backend running on port 3001
   🔥 Database: Firebase Firestore
   ```

### Frontend Test
1. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

2. Open browser to `http://localhost:3000`
3. Check browser console for Firebase connection logs

## 6. Firebase Collections Structure

The following collections will be created automatically:

```
rainmakers-portal/
├── users/                    # User profiles and permissions
│   ├── {userId}/
│   │   ├── discordId: string
│   │   ├── username: string
│   │   ├── email: string
│   │   ├── isAdmin: boolean
│   │   └── isWhitelisted: boolean
├── deals/                    # Real estate deals
│   ├── {dealId}/
│   │   ├── dealId: string
│   │   ├── propertyName: string
│   │   ├── loanAmount: number
│   │   └── userId: string
├── appointments/             # Calendar appointments
├── documents/               # File metadata
├── configurations/          # System settings
└── onedrive_tokens/         # OAuth tokens
```

## 7. Security Rules

The security rules ensure:
- Users can only access their own data
- Admins can access all data
- Proper authentication is required
- Data validation and type checking

## 8. Monitoring and Analytics

### Firebase Analytics
- Already configured with your measurement ID
- Tracks user interactions and app performance
- View in Firebase Console > Analytics

### Firestore Monitoring
- Monitor database usage in Firebase Console
- Set up alerts for unusual activity
- Review security rules violations

## 9. Production Considerations

### Security
- Review and update security rules before production
- Enable App Check for additional security
- Set up proper backup strategies

### Performance
- Monitor query performance
- Add composite indexes as needed
- Consider data archiving strategies

### Scaling
- Firestore automatically scales
- Monitor usage and costs
- Consider data partitioning for large datasets

## 10. Troubleshooting

### Common Issues

**"Permission denied" errors:**
- Check security rules
- Verify user authentication
- Ensure proper data structure

**Connection timeouts:**
- Check network connectivity
- Verify Firebase project configuration
- Review service account permissions

**Missing collections:**
- Collections are created automatically on first write
- Check data structure matches expected format
- Verify user permissions

### Support
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Console](https://console.firebase.google.com/)
