# Rainmakers Portal Backend Environment Variables
# Add these to your Vercel environment variables

## === CORE CONFIGURATION ===
NODE_ENV=production
PORT=3001

## === JWT SECRET ===
JWT_SECRET=rainmakers-super-secret-jwt-key-2024-production

## === DISCORD OAUTH ===
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://rainmakers-portal-backend.vercel.app/auth/discord/callback

## === FIREBASE CONFIGURATION ===
FIREBASE_PROJECT_ID=rainmakers-portal
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@rainmakers-portal.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCaeTyqbWjfgqga\nEOKgzqsAoR03CNUAzISjuR/qeVJdyPDYGeLQAlOzqG6QQ3hXohq+Y4hd1T0nTWUq\nbv+X0h8qkoefZJ4+wVGddM6C0Emu3tHzVVoWkCqjcmVm2D9k3dynqCZ6db1w/W6U\nKsnVuEP/sov2nSJAQpchstRYAMj0rRcuGAEP+ZyYr4hygfL3uymccS0noC7qzsc4\nhIfr75dVmp1vm1jBdY+Js4WF3Yr/wpiRag83PfRccAVyAvrmYDHC6NPuL7vPRALK\nzjjzKKzWuzyPpmH1EYs/GLfssR/aw86wKLP6GgPFYok+FmpDCWrPJdEToI8nvoCf\n0X9LDt/1AgMBAAECggEAA10F2y7+xvTZC9GUMFBDNa7oz8SsS37hYKzFYIRqEE6V\nIFPdvRwJo4Qp7zqGLuAP+R5BHyF1hMy4GeazlPmAMFTU+z1rjNxbsteS9faHJRIV\nQy53oC8kLaL8ZXMjW/97jLnb0mXFG5DBEI58Y/x+uMCz95BhhbNxB4WjxhNsE9EM\nFlCCoCvQ56MO/K7rMPGDlN5ArDLGz3aaIRo9DbGQu9cB9iAucWylW60WRwzpGI2Z\n8jKCCDWYxVJbyrPgcsPayc9GL5E2bwt5OS4Z//V1xaQt1KZVUfAEJGFf+f3lvbyf\nZgvVX5T4lo7Zu7Qbr2SKo6xMKrvIXoQCSHwo2D1n7wKBgQDVTnKuXIziPO2ECQlP\nDsp9ai05j4o02eclAQeYn12fjBvAbVT+q9mNURlJ19uFj2gp5SwiSzwfVqWV3OBj\nAXnC7LQwVfGUotwhHn8xooiEhpmsDKY9YNih9M5NePEUNOF28R1v8z489v8d2426\nTMIjbRc/+itaXmn29WdwWG+14wKBgQC5ZESVw/rxLMU+g/ruJfNb9sXXyQXCU/Ku\nKQei2uqJc1QFdee5RPI7RhFQ6hrAtq8pP+PSx5Mu3nVEqf7a1hrPN5dNYSdrF3O5\nVFKGSt83bz8hoXW85P5cgZqdhD+CphFsDGfF5pqFy/zElDo85Nhzd9DmfYZPl/73\n1LvtXgo6RwKBgB5CZ7BmfrHldMhDQ+fMMFuEQXAl9bQzqT+tmrdC/FQS2yj8GY+b\nL1yFwbGhBoo24s72rMEcrSXA8/KDh+1jmzNUwucMeh3c0J9+JQsUhItQUOKAVODm\nKTUodk+1NXXpXoayA7wK5KxfWaeRqtRf6TZ/VkoEIjxKonufKpJcaVSDAoGATNBA\nopULGnZkW1yv0ZCj3ozGuHuwCS5jNMoHQfDWkJDaVVDe7CKnAuwrLI1y/Do1JTA1\noxXR4++EQyj0UZO4k/cCl6sTfAnBhx5q+v12sy9CxxpxAA0ZXxbMC0vKTMWmHlCd\nhp/fkmRMnN6Vqrle/ai9Q2LrDXt6xxC7tMPsFO0CgYBrE9c7BlRo3gtRNVapNyHr\nF09BtKYoYD3avoET3VeDOFHJ1OA6rA6DknsYxKnY8r9w1gGKlDLXdVXZwEMR3lZp\n3jWHY6xorzHeocaxUeXz30e0MNWDBFki2H5tz240eSNj9LSoSM+BRkxgCZMxl7R2\noWHrcTUdOxM3AJiuvFZP+Q==\n-----END PRIVATE KEY-----\n"

## === FRONTEND URL ===
FRONTEND_URL=https://rainmakers-portal-frontend.vercel.app

## === GHL (GoHighLevel) CONFIGURATION ===
GHL_BASE_URL=https://rest.gohighlevel.com/v1
# Note: GHL API keys will be stored in Firebase config collection, not environment variables

## === MICROSOFT ONEDRIVE CONFIGURATION ===
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_REDIRECT_URI=https://rainmakers-portal-backend.vercel.app/auth/onedrive/callback

## === SESSION SECRET ===
SESSION_SECRET=rainmakers-session-secret-2024-production

## === VERCEL DETECTION ===
VERCEL=1
