FROM pierrezemb/gostatic

COPY . /srv/http/
EXPOSE 8080

CMD ["-port","8080","-https-promote", "-enable-logging"]
