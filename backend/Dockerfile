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

RUN npm install -g nodemon
RUN npm install -g node-inspector

RUN mkdir -p /opt
WORKDIR /opt
ADD package.json /opt/package.json

RUN npm install

EXPOSE 80

CMD npm run development
