FROM node:12

RUN apt-get update
RUN apt-get install nginx -y

RUN mkdir -p /opt
WORKDIR /opt
ADD package.json /opt/package.json

RUN npm install -g webpack@5.27.2 webpack-cli@4.5.0

RUN npm install

RUN mkdir -p /run/nginx

COPY bootstrap.sh /opt/
RUN chmod u+x /opt/bootstrap.sh

CMD bash /opt/bootstrap.sh