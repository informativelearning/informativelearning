FROM pierrezemb/gostatic

# Explicitly copy favicon first
COPY Dashboard-favicon.ico /srv/http/Dashboard-favicon.ico

# Then copy everything else
COPY . /srv/http/

# Verify file permissions
RUN ls -la /srv/http/Dashboard-favicon.ico

CMD ["-port","8080","-https-promote", "-enable-logging"]
