FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY nest-cli.json tsconfig*.json ./
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY README.md ./README.md

RUN npm run build

EXPOSE 3002

CMD ["sh", "-c", "npx prisma migrate deploy && npm run prisma:seed && node dist/main.js"]

