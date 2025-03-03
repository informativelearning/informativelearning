FROM pierrezemb/gostatic

# Copy favicon and critical files first
COPY favicon.ico /srv/http/favicon.ico
COPY js/ /srv/http/js/

# Then copy remaining files
COPY . /srv/http/

EXPOSE 8080
CMD ["-port","8080","-https-promote", "-enable-logging"]
