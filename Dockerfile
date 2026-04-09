FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN apk add --no-cache libc6-compat \
  && corepack enable


FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile


FROM deps AS build

COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
COPY store ./store
COPY __tests__ ./__tests__
COPY scripts ./scripts
COPY components.json eslint.config.mjs global.d.ts next-env.d.ts next.config.ts postcss.config.mjs proxy.ts tailwind.config.ts tsconfig.json vitest.config.ts vitest.setup.ts ./

RUN pnpm build


FROM deps AS production-deps

RUN pnpm prune --prod


FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

RUN apk add --no-cache libc6-compat \
  && corepack enable \
  && addgroup -S nextjs \
  && adduser -S nextjs -G nextjs

COPY --from=production-deps --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nextjs /app/.next ./.next
COPY --from=build --chown=nextjs:nextjs /app/public ./public
COPY --from=build --chown=nextjs:nextjs /app/package.json ./package.json
COPY --from=build --chown=nextjs:nextjs /app/next.config.ts ./next.config.ts
COPY --from=build --chown=nextjs:nextjs /app/scripts ./scripts

USER nextjs

EXPOSE 3000

CMD ["pnpm", "start"]
