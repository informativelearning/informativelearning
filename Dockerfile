FROM nginx:alpine

# Install curl for healthcheck
RUN apk --no-cache add curl

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy website files
COPY . /usr/share/nginx/html

# Fix permissions
RUN chown -R nginx:nginx /usr.share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:8080/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
