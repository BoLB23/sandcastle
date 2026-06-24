FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/realtime/package.json apps/realtime/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY . .
RUN pnpm --filter @sandcastle/db generate
RUN pnpm --filter @sandcastle/realtime build
RUN pnpm --filter @sandcastle/realtime deploy --prod /prod/realtime
RUN src="$(find /app/node_modules/.pnpm -path '*/@prisma+client@*/node_modules/.prisma/client' | head -1)" \
 && dst="$(find /prod/realtime/node_modules/.pnpm -path '*/@prisma+client@*/node_modules/.prisma/client' | head -1)" \
 && rm -rf "$dst" \
 && mkdir -p "$(dirname "$dst")" \
 && cp -R "$src" "$dst"

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /prod/realtime /app
EXPOSE 4001
CMD ["node", "dist/server.js"]
