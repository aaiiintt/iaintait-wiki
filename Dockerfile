FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm run db:sync

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built code and dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/local.db ./local.db

# Copy markdown source directories for real-time tool reads
COPY --from=builder /app/projects ./projects
COPY --from=builder /app/collaborators ./collaborators
COPY --from=builder /app/agencies ./agencies
COPY --from=builder /app/industry ./industry
COPY --from=builder /app/README.md ./README.md

EXPOSE 8080
ENV PORT=8080
CMD ["npx", "tsx", "server/index.ts"]
