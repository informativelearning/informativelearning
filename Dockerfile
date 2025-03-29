# Use Node 18 on Alpine Linux
FROM node:18-alpine

# Set environment to production
ENV NODE_ENV=production

# Standard Node.js port (matches fly.toml and app expectations)
ENV PORT=8080
EXPOSE 8080/tcp

# Keep the original labels
LABEL maintainer="TitaniumNetwork Ultraviolet Team"
LABEL summary="Ultraviolet Proxy Image"
LABEL description="Example application of Ultraviolet which can be deployed in production."

# Set working directory
WORKDIR /app

# Install pnpm globally using npm (comes with Node image)
RUN npm install -g pnpm

# --- Dependency Installation ---
# Copy only package manifests first to leverage Docker cache
# Use pnpm's lock file
COPY ["package.json", "pnpm-lock.yaml*", "./"]

# Install OS build tools needed for native addons (like sqlite3)
RUN apk add --no-cache python3 make g++

# Install dependencies using pnpm
# --frozen-lockfile: Ensures exact versions from lockfile are used
# --prod: Skips devDependencies
# --unsafe-perm=true: Allows build scripts (like sqlite3's) to run inside Docker. CRITICAL for sqlite3.
RUN pnpm install --frozen-lockfile --prod --unsafe-perm=true

# --- Application Code ---
# Copy the rest of your application code (src, static, etc.)
COPY . .

# --- Run Command ---
# Use ENTRYPOINT for the main command (node)
ENTRYPOINT [ "node" ]
# Use CMD for the argument to ENTRYPOINT (Ultraviolet-App's entry point)
CMD ["src/index.js"]