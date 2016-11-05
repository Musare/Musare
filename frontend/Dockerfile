FROM alpine

RUN apk update && apk upgrade
RUN apk add openssl
RUN apk add curl
RUN apk add git
RUN apk add python
RUN apk add nodejs
RUN apk add gcc
RUN apk add g++
RUN apk add make
RUN apk add nginx

RUN npm install -g webpack

RUN mkdir -p /opt
WORKDIR /opt
ADD package.json /opt/package.json

RUN npm install

RUN mkdir -p /run/nginx

EXPOSE 80

CMD nginx -c /opt/app/nginx.conf; cd /opt/app; npm run development-watch
