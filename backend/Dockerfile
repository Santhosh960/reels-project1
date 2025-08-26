# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create results directory
RUN mkdir -p results logs

# Expose port
EXPOSE 8000

# Start the application
CMD ["npm", "start"]