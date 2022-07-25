FROM node:16.15 AS backend_node_modules

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY package.json /opt/app/package.json
COPY package-lock.json /opt/app/package-lock.json

RUN npm install --silent

FROM node:16.15 AS musare_backend

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY . /opt/app
COPY --from=backend_node_modules /opt/app/node_modules node_modules

ENTRYPOINT npm run docker:dev

EXPOSE 8080/tcp
EXPOSE 8080/udp
