FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json

RUN pnpm install --frozen-lockfile

FROM dependencies AS build

COPY packages/config packages/config
COPY apps/api apps/api

RUN pnpm --filter @ball-assistant/api prisma:generate
RUN pnpm --filter @ball-assistant/api build

FROM base AS runtime

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json

RUN pnpm install --filter @ball-assistant/api... --prod --frozen-lockfile

COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/node_modules/.prisma apps/api/node_modules/.prisma
COPY --from=build /app/apps/api/node_modules/@prisma apps/api/node_modules/@prisma

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["node", "dist/main.js"]
