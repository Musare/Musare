FROM node:11

RUN apt-get update
RUN apt-get install nginx -y

RUN npm install -g yarn

RUN yarn global add webpack@4.35.3
RUN yarn global add webpack-cli@3.3.5

RUN mkdir -p /opt
WORKDIR /opt
ADD package.json /opt/package.json

RUN yarn install

RUN mkdir -p /run/nginx

CMD nginx -c /opt/app/nginx.conf; cd /opt/app; yarn run dev-docker
