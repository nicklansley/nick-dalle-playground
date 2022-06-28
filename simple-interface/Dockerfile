FROM python:3.10-alpine

EXPOSE 3000

WORKDIR /app

COPY *.html /app
COPY *.js /app
COPY naughtywords.txt /app
COPY *.html /app/dalle-playground/
COPY *.js /app/dalle-playground/
COPY naughtywords.txt /app/dalle-playground/

CMD ["python", "-m", "http.server", "3000"]
