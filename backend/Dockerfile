FROM node:16.15 AS musare_backend

RUN npm install -g nodemon

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY package.json /opt/app/package.json
COPY package-lock.json /opt/app/package-lock.json

RUN npm install

COPY . /opt/app

ENTRYPOINT npm run docker:dev

EXPOSE 8080/tcp
EXPOSE 8080/udp
