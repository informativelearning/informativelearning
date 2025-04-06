# Use Node 18 on Alpine Linux
FROM node:18-alpine

# Set environment to production
ENV NODE_ENV=production

# Standard Node.js port (matches fly.toml and app expectations)
ENV PORT=8080
EXPOSE 8080/tcp

# Optional: Keep original labels if desired
# LABEL maintainer="TitaniumNetwork Ultraviolet Team"
# LABEL summary="Ultraviolet Proxy Image"
# LABEL description="Example application of Ultraviolet which can be deployed in production."

# Set working directory
WORKDIR /app

# Install pnpm globally using npm (comes with Node image)
RUN npm install -g pnpm

# --- Dependency Installation ---
# Copy only package manifests first to leverage Docker cache
COPY ["package.json", "pnpm-lock.yaml*", "./"]

# REMOVED: OS build tools (apk add python3 make g++) - Not typically needed for 'pg' driver

# Install ALL dependencies (including devDeps needed for potential install scripts)
# --frozen-lockfile: Ensures exact versions from lockfile are used
# --unsafe-perm=true: Allows build scripts to run inside Docker if needed by any package
RUN pnpm install --frozen-lockfile --unsafe-perm=true

# --- Application Code ---
# Copy the rest of your application code (src, static, etc.)
COPY . .

# --- Inject Custom verify.js into UV Assets ---
# This finds the default UV public asset folder and copies your verify.js into it.
# NOTE: This only places the file; it doesn't add a <script> tag to the default index.html.
RUN find /app/node_modules -path '*/ultraviolet-static/public' -exec echo "Copying verify.js to {}" \; -exec cp static/js/verify.js {} \;

# --- Run Command ---
# Use ENTRYPOINT for the main command (node)
ENTRYPOINT [ "node" ]
# Use CMD for the argument to ENTRYPOINT (Your Fastify server)
CMD ["src/index.js"]