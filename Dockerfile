# Stage 1: Build packages
FROM node:20-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json nx.json tsconfig.app.json ./
# Copy all package.json files first to cache dependencies layers
COPY packages/app/package.json ./packages/app/
COPY packages/erd-editor/package.json ./packages/erd-editor/
COPY packages/erd-editor-schema/package.json ./packages/erd-editor-schema/
COPY packages/erd-editor-shiki-worker/package.json ./packages/erd-editor-shiki-worker/
COPY packages/go/package.json ./packages/go/
COPY packages/intellij-webview/package.json ./packages/intellij-webview/
COPY packages/r-html/package.json ./packages/r-html/
COPY packages/schema-sql-parser/package.json ./packages/schema-sql-parser/
COPY packages/shared/package.json ./packages/shared/
COPY packages/vite-plugin-r-html/package.json ./packages/vite-plugin-r-html/
COPY packages/vscode-bridge/package.json ./packages/vscode-bridge/
COPY packages/vscode-extension/package.json ./packages/vscode-extension/
COPY packages/vscode-replication-store-worker/package.json ./packages/vscode-replication-store-worker/
COPY packages/vscode-webview/package.json ./packages/vscode-webview/
COPY packages/server/package.json ./packages/server/

# Install workspace dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code of all packages
COPY packages ./packages

# Recreate symlinks in package-level node_modules directories
RUN pnpm install --frozen-lockfile --ignore-scripts

# Run full monorepo build (includes frontend assets compiling and server typescript compilation)
RUN pnpm build

# Stage 2: Production runner
FROM node:20-slim AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace setup and built code
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/package.json
COPY --from=builder /app/packages/server/drizzle.config.ts ./packages/server/drizzle.config.ts
COPY --from=builder /app/packages/server/drizzle ./packages/server/drizzle
COPY --from=builder /app/packages/app/dist ./packages/app/dist

# Install production dependencies for the server package only
RUN pnpm install --prod --ignore-scripts --no-frozen-lockfile --filter @dineug/erd-editor-server

# Standard production environment configurations
ENV PORT=3000
ENV DB_PROVIDER=sqlite
ENV DATABASE_URL=file:/app/data/local.db
ENV NODE_ENV=production

# Create persistent storage folder for SQLite database file
RUN mkdir -p /app/data

EXPOSE 3000

# Start server (which runs migrations and hosts the frontend)
CMD ["pnpm", "--filter", "@dineug/erd-editor-server", "start"]
