FROM redis:7.0.2-alpine3.16
COPY redis.conf /usr/local/etc/redis/redis.conf
COPY redis.conf /data/db/dummy.txt
RUN chmod a+rwx -R /data/db && rm /data/db/dummy.txt
RUN apk add nodejs npm
RUN npm i redis http-server
CMD [ "redis-server", "/usr/local/etc/redis/redis.conf" ]