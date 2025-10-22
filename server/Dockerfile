# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy source
COPY server ./server

EXPOSE 3001

CMD ["node", "server/server.js"]
