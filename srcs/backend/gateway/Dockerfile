FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

FROM node:20

WORKDIR /app

RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -s /bin/bash -m nodejs

COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/src ./src

USER nodejs

ENV NODE_ENV=production
ENV LOG_LEVEL=info

EXPOSE 3000

CMD ["node", "src/app.js"]
