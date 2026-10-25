FROM node:20-alpine

WORKDIR /app

# Copy package descriptors
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY src/ ./src/
COPY schema.sql ./

# Expose no ports needed as this is a background worker daemon
ENV NODE_ENV=production
ENV POLL_INTERVAL_MS=15000

# Run continuous matcher daemon (sync -> reveal -> match -> net)
CMD ["npm", "run", "daemon"]
