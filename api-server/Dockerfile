# Use official Node.js runtime as base image
FROM node:18-alpine

# Install wget for health checks
RUN apk add --no-cache wget

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install ALL dependencies (including devDependencies for ts-node)
RUN npm install

# Copy source code
COPY . .

# Create data and uploads directories with proper permissions
RUN mkdir -p /app/data /app/uploads && chown -R node:node /app/data /app/uploads

# Switch to non-root user
USER node

# Expose port
EXPOSE 3469

# Start the application with ts-node using npm
CMD ["npx", "ts-node", "src/app.ts"]
