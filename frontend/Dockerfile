FROM node:16.15 AS musare_frontend

ARG FRONTEND_MODE=prod
ENV FRONTEND_MODE=${FRONTEND_MODE}
ENV SUPPRESS_NO_CONFIG_WARNING=1

RUN apt-get update
RUN apt-get install nginx -y

RUN npm install -g webpack@5.73.0 webpack-cli@4.9.2

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY package.json /opt/app/package.json
COPY package-lock.json /opt/app/package-lock.json

RUN npm install

COPY . /opt/app

RUN mkdir -p /run/nginx

RUN bash -c '[[ "${FRONTEND_MODE}" = "prod" ]] && npm run prod' || exit 0

RUN chmod u+x entrypoint.sh

ENTRYPOINT bash /opt/app/entrypoint.sh

EXPOSE 80/tcp
EXPOSE 80/udp
