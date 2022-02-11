FROM node:16

RUN npm install -g nodemon

RUN mkdir -p /opt
WORKDIR /opt
ADD package.json /opt/package.json
ADD package-lock.json /opt/package-lock.json

RUN npm install

CMD npm run docker:dev
