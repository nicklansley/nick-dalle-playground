FROM python:3.10-alpine

EXPOSE 3000

WORKDIR /app

COPY *.html /app
COPY *.js /app
COPY *.html /app/dalle-playground/
COPY *.js /app/dalle-playground/

CMD ["python", "-m", "http.server", "3000"]
