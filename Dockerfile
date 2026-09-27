FROM oven/bun:1.3.5 AS build

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile

COPY . .
ARG CLERK_PUBLISHABLE_KEY
RUN VITE_CLERK_PUBLISHABLE_KEY="${CLERK_PUBLISHABLE_KEY}" bun run build

FROM oven/bun:1.3.5-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile --production

COPY apps/api/src apps/api/src
COPY apps/api/drizzle-postgres apps/api/drizzle-postgres
COPY packages/shared/src packages/shared/src
COPY --from=build /app/apps/web/dist apps/web/dist

EXPOSE 3001
CMD ["bun", "run", "--cwd", "apps/api", "start"]
