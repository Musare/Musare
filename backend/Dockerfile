FROM node:18 AS backend_node_modules

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY package.json /opt/app/package.json
COPY package-lock.json /opt/app/package-lock.json

RUN npm install --silent

FROM node:18 AS musare_backend

ARG BACKEND_MODE=prod
ENV BACKEND_MODE=${BACKEND_MODE}

RUN mkdir -p /opt/app /opt/types
WORKDIR /opt/app

COPY . /opt/app
COPY --from=backend_node_modules /opt/app/node_modules node_modules

RUN bash -c '([[ "${BACKEND_MODE}" == "dev" ]] && exit 0) || npm run build'

RUN chmod u+x entrypoint.sh

ENTRYPOINT bash /opt/app/entrypoint.sh

EXPOSE 8080/tcp
EXPOSE 8080/udp
