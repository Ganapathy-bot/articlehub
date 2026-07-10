# ArticleHub production image
FROM node:20-bookworm-slim

WORKDIR /app

# OpenSSL legacy provider needed for react-scripts 3 build
ENV NODE_OPTIONS=--openssl-legacy-provider
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev=false

COPY . .
RUN npm run build

# Host platforms inject PORT
ENV PORT=5000
EXPOSE 5000

CMD ["node", "server/index.js"]
