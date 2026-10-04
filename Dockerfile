# Stage 1: Build packages
FROM node:20-slim AS builder
WORKDIR /app
ENV NODE_ENV=development
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY .npmrc* pnpm-lock.yaml pnpm-workspace.yaml package.json nx.json tsconfig.app.json ./
COPY packages ./packages

# Install all workspace dependencies including devDependencies for build
RUN pnpm install --no-frozen-lockfile --ignore-scripts --prod=false

# Run full monorepo build (includes frontend assets compiling and server typescript compilation)
RUN pnpm build

# Stage 2: Production runner
FROM node:20-slim AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace setup, all built packages, and node_modules from builder
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Standard production environment configurations
ENV PORT=3000
ENV DB_PROVIDER=sqlite
ENV DATABASE_URL=file:/app/data/local.db
ENV NODE_ENV=production

# Create persistent storage folder for SQLite database file
RUN mkdir -p /app/data

EXPOSE 3000

# Healthcheck to verify Express server is responding
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start server (which runs migrations and hosts the frontend)
CMD ["pnpm", "--filter", "@dineug/erd-editor-server", "start"]
