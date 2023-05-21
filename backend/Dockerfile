FROM node:18 AS backend_node_modules

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY backend/package.json backend/package-lock.json /opt/app/

RUN npm install --silent

FROM node:18 AS musare_backend

ARG CONTAINER_MODE=production
ARG BACKEND_MODE=production
ENV CONTAINER_MODE=${CONTAINER_MODE}
ENV BACKEND_MODE=${BACKEND_MODE}

RUN mkdir -p /opt/.git /opt/types /opt/app
WORKDIR /opt/app

COPY .git /opt/.git
COPY types /opt/types
COPY backend /opt/app
COPY --from=backend_node_modules /opt/app/node_modules node_modules

RUN bash -c '([[ "${BACKEND_MODE}" == "development" ]] && exit 0) || npm run build'

RUN chmod u+x entrypoint.sh

ENTRYPOINT bash /opt/app/entrypoint.sh

EXPOSE 8080/tcp
EXPOSE 8080/udp
