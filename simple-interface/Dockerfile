FROM python:3.10-alpine

EXPOSE 3000

WORKDIR /app

COPY index.html /app
COPY index.js /app
COPY index.html /app/dalle-playground/
COPY index.js /app/dalle-playground/

CMD ["python", "-m", "http.server", "3000"]
