# Frontend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --only=production

# Copy frontend source code
COPY frontend/ ./frontend/

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# Install serve for production
RUN npm install -g serve

# Expose port
EXPOSE $PORT

# Start frontend
CMD ["serve", "-s", "dist", "-l", "$PORT"]
