FROM node:16

RUN npm install -g nodemon

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY package.json /opt/app/package.json
COPY package-lock.json /opt/app/package-lock.json

RUN npm install

COPY . /opt/app

CMD npm run docker:dev
