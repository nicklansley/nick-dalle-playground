FROM python:3.10-alpine
RUN apk update && apk upgrade && apk add --no-cache curl
WORKDIR /app
COPY ./requirements.txt /app/requirements.txt
RUN pip3 install -r requirements.txt

EXPOSE 3000



COPY *.html /app
COPY *.js /app
COPY *.py /app
COPY run.sh /app
COPY naughtywords.txt /app
COPY dictionary.txt /app

#CMD ["python", "-m", "http.server", "3000"]
CMD ["sh", "run.sh"]
