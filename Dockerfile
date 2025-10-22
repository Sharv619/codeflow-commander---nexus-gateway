# Frontend build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Backend stage
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server/server.js ./server/
COPY package.json ./
COPY package-lock.json ./

# Install backend dependencies
RUN npm install express body-parser cors

EXPOSE 3001
EXPOSE 5173

CMD ["node", "server/server.js"]
