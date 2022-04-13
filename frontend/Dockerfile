FROM node:16

RUN apt-get update
RUN apt-get install nginx -y

RUN mkdir -p /opt/app
WORKDIR /opt/app
ADD ./ /opt/app

RUN npm install -g webpack@5.72.0 webpack-cli@4.9.2
RUN npm install

RUN mkdir -p /run/nginx

RUN chmod u+x bootstrap.sh

CMD bash /opt/app/bootstrap.sh
