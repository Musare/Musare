FROM node

RUN apt-get update

RUN npm install -g nodemon
RUN npm install -g snyk

RUN mkdir -p /opt
WORKDIR /opt
ADD package.json /opt/package.json

RUN npm install

EXPOSE 80

CMD npm run docker:dev
