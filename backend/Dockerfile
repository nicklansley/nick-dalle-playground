# FROM nvidia/cuda:11.4.3-cudnn8-devel-ubuntu20.04
FROM nvidia/cuda:11.7.1-cudnn8-devel-ubuntu22.04
# expose
EXPOSE 8080

# set working directory
WORKDIR /app

# install pip
RUN apt-get update && apt-get install -y python3-pip

# install git
RUN apt-get install -y git

# update pip
RUN pip3 install --upgrade pip

# add requirements
COPY ./requirements.txt /app/requirements.txt

# install requirements
RUN pip3 install -r requirements.txt

# install jax[cuda]
# RUN pip3 install --upgrade "jax[cuda]" -f https://storage.googleapis.com/jax-releases/jax_releases.html
RUN pip install "jax[cuda11_cudnn82]" -f https://storage.googleapis.com/jax-releases/jax_cuda_releases.html

# add source code
COPY . /app

# run server
# CMD python3 app.py --port 8080 --model_version mini Mega Mega_full
CMD python3 app.py --port 8080 --model_version Mega_full
