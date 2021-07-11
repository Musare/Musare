FROM node:14

RUN apt-get update
RUN apt-get install nginx -y

RUN mkdir -p /opt
WORKDIR /opt
ADD package.json /opt/package.json
ADD package-lock.json /opt/package-lock.json

RUN npm install -g webpack@5.44.0 webpack-cli@4.7.2

RUN npm install

RUN mkdir -p /run/nginx

COPY bootstrap.sh /opt/
RUN chmod u+x /opt/bootstrap.sh

CMD bash /opt/bootstrap.sh