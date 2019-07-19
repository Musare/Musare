FROM node

RUN apt-get update
RUN apt-get install nginx -y

RUN npm install -g yarn
RUN yarn global add webpack@1.14.0

RUN mkdir -p /opt
WORKDIR /opt
ADD package.json /opt/package.json

RUN yarn install

RUN mkdir -p /run/nginx

EXPOSE 80

CMD nginx -c /opt/app/nginx.conf; cd /opt/app; yarn run development-watch
