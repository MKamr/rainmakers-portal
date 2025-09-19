# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production

# Copy backend source code
COPY backend/ ./backend/

# Build backend
WORKDIR /app/backend
RUN npm run build

# Expose port
EXPOSE $PORT

# Start backend
CMD ["npm", "start"]
