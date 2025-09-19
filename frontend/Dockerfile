# Use Node.js 18 Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Expose port (Railway will override with PORT env var)
EXPOSE 3000

# Start the application
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]