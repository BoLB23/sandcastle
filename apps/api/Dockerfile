FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY . .
RUN pnpm --filter @sandcastle/db generate
RUN pnpm --filter @sandcastle/api build
RUN pnpm --filter @sandcastle/api deploy --prod /prod/api
RUN mkdir -p /prod/api/prisma \
 && cp /app/packages/db/prisma/schema.prisma /prod/api/prisma/schema.prisma \
 && cp -R /app/packages/db/prisma/migrations /prod/api/prisma/migrations
RUN src="$(find /app/node_modules/.pnpm -path '*/@prisma+client@*/node_modules/.prisma/client' | head -1)" \
 && dst="$(find /prod/api/node_modules/.pnpm -path '*/@prisma+client@*/node_modules/.prisma/client' | head -1)" \
 && rm -rf "$dst" \
 && mkdir -p "$(dirname "$dst")" \
 && cp -R "$src" "$dst"

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /prod/api /app
EXPOSE 4000
CMD ["node", "dist/server.js"]
