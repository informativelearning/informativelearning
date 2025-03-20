# Use an official Node.js runtime as the base image
FROM node:14-bullseye

# Set the working directory in the container
WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies with explicit rebuild of native modules
RUN npm install --build-from-source

# Create data directory with appropriate permissions
RUN mkdir -p /app/data && chmod 777 /app/data

# Copy the rest of your application code
COPY . .

# Set environment variables
ENV NODE_ENV=production

# Expose the port your app runs on
EXPOSE 8080

# Command to run your app
CMD ["node", "server.js"]