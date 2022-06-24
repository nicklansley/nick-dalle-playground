FROM nginx:1.21-alpine

# These two lines are product port 443 with gs1.org private key
# COPY nginx.pem /etc/nginx/nginx.pem
#COPY prod_443.conf.nginx /etc/nginx/nginx.conf

# OR use this for development (port 80 output)
COPY dev_80.conf.nginx /etc/nginx/nginx.conf

RUN chmod 777 /etc/nginx/
