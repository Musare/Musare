FROM node:12

RUN apt-get update
RUN apt-get install nginx -y

RUN npm install -g yarn

RUN yarn global add snyk
RUN yarn global add webpack@4.35.3
RUN yarn global add webpack-cli@3.3.5
RUN yarn global add webpack-dev-server@3.7.2

RUN mkdir -p /opt
WORKDIR /opt
ADD package.json /opt/package.json

RUN yarn install

RUN mkdir -p /run/nginx

COPY bootstrap.sh /opt/
RUN chmod u+x /opt/bootstrap.sh

CMD bash /opt/bootstrap.sh