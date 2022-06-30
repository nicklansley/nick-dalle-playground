FROM python:3.10-alpine
RUN apk update && apk upgrade && apk add --no-cache curl
EXPOSE 3000

WORKDIR /app

COPY *.html /app
COPY *.js /app
COPY *.py /app
COPY naughtywords.txt /app

#CMD ["python", "-m", "http.server", "3000"]
CMD ["python", "server.py"]
