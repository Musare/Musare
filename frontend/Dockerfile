FROM node:18 AS frontend_node_modules

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY package.json /opt/app/package.json
COPY package-lock.json /opt/app/package-lock.json

RUN npm install --silent

FROM node:18 AS musare_frontend

ARG FRONTEND_MODE=prod
ENV FRONTEND_MODE=${FRONTEND_MODE}
ENV SUPPRESS_NO_CONFIG_WARNING=1
ENV NODE_CONFIG_DIR=./dist/config

RUN apt update
RUN apt install nginx -y

RUN mkdir -p /opt/app /opt/types
WORKDIR /opt/app

COPY . /opt/app
COPY --from=frontend_node_modules /opt/app/node_modules node_modules

RUN mkdir -p /run/nginx

RUN bash -c '([[ "${FRONTEND_MODE}" == "dev" ]] && exit 0) || npm run prod'

RUN chmod u+x entrypoint.sh

ENTRYPOINT bash /opt/app/entrypoint.sh

EXPOSE 80/tcp
