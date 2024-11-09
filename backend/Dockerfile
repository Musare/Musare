FROM node:18-alpine AS backend_node_modules

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY backend/package.json backend/package-lock.json /opt/app/

RUN npm install

FROM node:18-alpine AS musare_backend

ARG CONTAINER_MODE=production
ENV CONTAINER_MODE=${CONTAINER_MODE}

RUN mkdir -p /opt/.git /opt/types /opt/app
WORKDIR /opt/app

COPY .git /opt/.git
COPY types /opt/types
COPY backend /opt/app
COPY --from=backend_node_modules /opt/app/node_modules node_modules

ENTRYPOINT sh -c '([[ "${CONTAINER_MODE}" == "development" ]] && npm install); npm run docker:dev'

EXPOSE 8080/tcp
EXPOSE 8080/udp
