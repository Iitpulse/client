# IITP Admin Dashboard - Next.js + Bun
#
# In Coolify, set Base Directory to: src-next
#
# @iitpulse/ui is a private package on GitHub Packages. The committed .npmrc names only the registry; the token
# arrives as the build argument NPM_TOKEN (a read:packages token, set in Coolify as a build-time variable) and is
# used only in the `deps` stage below. That stage is discarded: the later stages copy node_modules out of it, so
# the token is in no layer, history entry or file of the final image.
#   docker build --build-arg NPM_TOKEN=... -t iitp-admin .
#
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies (the only stage that sees NPM_TOKEN)
FROM base AS deps
ARG NPM_TOKEN
COPY package.json bun.lock .npmrc ./
# The token is read with printenv, never written as $NPM_TOKEN: BuildKit prints each RUN line with its build args
# substituted, so a $NPM_TOKEN here would show the token in the build log.
RUN token="$(printenv NPM_TOKEN)"; \
  if [ -z "$token" ]; then echo "NPM_TOKEN build arg (read:packages) is required for @iitpulse/ui" >&2; exit 1; fi; \
  printf '//npm.pkg.github.com/:_authToken=%s\n' "$token" >> .npmrc; \
  bun install --frozen-lockfile; status=$?; rm -f .npmrc; exit $status

# Build stage
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_API_GATEWAY
ENV NEXT_PUBLIC_API_GATEWAY=${NEXT_PUBLIC_API_GATEWAY}

# Ensure public folder exists for build
RUN mkdir -p public

# Build Next.js app
RUN bun run build

# Production stage
FROM base AS release
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy standalone build
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000

CMD ["bun", "run", "server.js"]
