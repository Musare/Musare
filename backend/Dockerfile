FROM node:18 AS backend_node_modules

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY package.json /opt/app/package.json
COPY package-lock.json /opt/app/package-lock.json

RUN npm install --silent

FROM node:18 AS musare_backend

ARG CONTAINER_MODE=production
ENV CONTAINER_MODE=${CONTAINER_MODE}

RUN mkdir -p /opt/app /opt/types
WORKDIR /opt/app

COPY . /opt/app
COPY --from=backend_node_modules /opt/app/node_modules node_modules

ENTRYPOINT bash -c '([[ "${CONTAINER_MODE}" == "development" ]] && npm install --silent); npm run docker:dev'

EXPOSE 8080/tcp
EXPOSE 8080/udp
