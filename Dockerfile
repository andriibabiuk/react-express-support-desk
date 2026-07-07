FROM oven/bun:1 AS builder
WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile

ARG VITE_SENTRY_DSN
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
RUN bun run build

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./

WORKDIR /app/server
EXPOSE 4000

CMD ["sh", "-c", "bun run migrate:deploy && bun run seed && bun run seed:ai-agent && bun run start"]
