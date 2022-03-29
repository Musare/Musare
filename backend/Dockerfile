FROM node:16

RUN npm install -g nodemon

RUN mkdir -p /opt/app
WORKDIR /opt/app
ADD ./ /opt/app

RUN npm install

CMD npm run docker:dev
