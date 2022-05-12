FROM node:16.15

RUN apt-get update
RUN apt-get install nginx -y

RUN npm install -g webpack@5.72.0 webpack-cli@4.9.2

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY package.json /opt/app/package.json
COPY package-lock.json /opt/app/package-lock.json

RUN npm install

COPY . /opt/app

RUN mkdir -p /run/nginx

RUN chmod u+x bootstrap.sh

CMD bash /opt/app/bootstrap.sh
