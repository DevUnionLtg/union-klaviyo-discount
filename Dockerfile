FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

COPY package.json package-lock.json* ./

# Install all dependencies (including dev) for building
RUN npm ci && npm cache clean --force

COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

ENV NODE_ENV=production

CMD ["npm", "run", "docker-start"]
