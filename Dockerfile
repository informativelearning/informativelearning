FROM pierrezemb/gostatic

# Explicitly copy favicon first
COPY favicon.ico /srv/http/favicon.ico

# Then copy everything else
COPY . /srv/http/

CMD ["-port","8080","-https-promote", "-enable-logging"]
