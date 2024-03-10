FROM node:20-alpine AS frontend_base

ARG UID=1000
ARG GID=1000

RUN deluser --remove-home node \
    && addgroup -S -g ${GID} musare \
    && adduser -SD -u ${UID} musare \
    && adduser musare musare

RUN mkdir -p /opt/.git /opt/common /opt/types /opt/app /run/nginx \
    && chown -R musare:musare /opt/app

WORKDIR /opt/app

USER musare

FROM frontend_base AS frontend_node_modules

COPY --chown=musare:musare --link frontend/package.json frontend/package-lock.json /opt/app/

RUN npm install

FROM frontend_base AS musare_frontend

ARG FRONTEND_MODE=production
ARG FRONTEND_PROD_DEVTOOLS=false
ARG MUSARE_SITENAME=Musare
ARG MUSARE_PRIMARY_COLOR="#03a9f4"
ARG MUSARE_DEBUG_VERSION=true
ARG MUSARE_DEBUG_GIT_REMOTE=false
ARG MUSARE_DEBUG_GIT_REMOTE_URL=false
ARG MUSARE_DEBUG_GIT_BRANCH=true
ARG MUSARE_DEBUG_GIT_LATEST_COMMIT=true
ARG MUSARE_DEBUG_GIT_LATEST_COMMIT_SHORT=true

ENV FRONTEND_MODE=${FRONTEND_MODE} \
    FRONTEND_PROD_DEVTOOLS=${FRONTEND_PROD_DEVTOOLS} \
    MUSARE_SITENAME=${MUSARE_SITENAME} \
    MUSARE_PRIMARY_COLOR=${MUSARE_PRIMARY_COLOR} \
    MUSARE_DEBUG_VERSION=${MUSARE_DEBUG_VERSION} \
    MUSARE_DEBUG_GIT_REMOTE=${MUSARE_DEBUG_GIT_REMOTE} \
    MUSARE_DEBUG_GIT_REMOTE_URL=${MUSARE_DEBUG_GIT_REMOTE_URL} \
    MUSARE_DEBUG_GIT_BRANCH=${MUSARE_DEBUG_GIT_BRANCH} \
    MUSARE_DEBUG_GIT_LATEST_COMMIT=${MUSARE_DEBUG_GIT_LATEST_COMMIT} \
    MUSARE_DEBUG_GIT_LATEST_COMMIT_SHORT=${MUSARE_DEBUG_GIT_LATEST_COMMIT_SHORT}

USER root
RUN apk add nginx
USER musare

COPY --chown=musare:musare --link .git /opt/.git
COPY --chown=musare:musare --link common /opt/common
COPY --chown=musare:musare --link types /opt/types
COPY --chown=musare:musare --link frontend /opt/app
COPY --chown=musare:musare --from=frontend_node_modules --link /opt/app/node_modules node_modules

RUN sh -c '([[ "${FRONTEND_MODE}" == "development" ]] && exit 0) || npm run prod'

RUN chmod u+x entrypoint.sh

ENTRYPOINT sh /opt/app/entrypoint.sh

EXPOSE 80/tcp
