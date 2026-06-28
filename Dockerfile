FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
# Install serve globally
RUN npm install -g serve

# Only copy what's needed for serve + dist
COPY --from=builder /app/dist ./dist

ENV HOST=0.0.0.0
ENV PORT=8080

CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-8080}"]
