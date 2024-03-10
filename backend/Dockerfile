FROM node:20-alpine AS backend_base

ARG UID=1000
ARG GID=1000

RUN deluser --remove-home node \
    && addgroup -S -g ${GID} musare \
    && adduser -SD -u ${UID} musare \
    && adduser musare musare

RUN mkdir -p /opt/.git /opt/common /opt/types /opt/app \
    && chown -R musare:musare /opt/app

WORKDIR /opt/app

USER musare

FROM backend_base AS backend_node_modules

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY --chown=musare:musare --link backend/package.json backend/package-lock.json /opt/app/

RUN npm install

FROM backend_base AS musare_backend

ARG CONTAINER_MODE=production
ARG BACKEND_MODE=production
ENV CONTAINER_MODE=${CONTAINER_MODE}
ENV BACKEND_MODE=${BACKEND_MODE}

COPY --chown=musare:musare --link .git /opt/.git
COPY --chown=musare:musare --link common /opt/common
COPY --chown=musare:musare --link types /opt/types
COPY --chown=musare:musare --link backend /opt/app
COPY --chown=musare:musare --link --from=backend_node_modules /opt/app/node_modules node_modules

RUN sh -c '([[ "${BACKEND_MODE}" == "development" ]] && exit 0) || npm run build'

ENTRYPOINT sh /opt/app/entrypoint.sh

EXPOSE 8080/tcp
EXPOSE 8080/udp
