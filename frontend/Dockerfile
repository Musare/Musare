FROM node:18 AS frontend_node_modules

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY frontend/package.json frontend/package-lock.json /opt/app/

RUN npm install --silent

FROM node:18 AS musare_frontend

ARG FRONTEND_MODE=production
ARG FRONTEND_PROD_DEVTOOLS=false
ARG MUSARE_SITENAME=Musare
ARG MUSARE_DEBUG_VERSION=true
ARG MUSARE_DEBUG_GIT_REMOTE=false
ARG MUSARE_DEBUG_GIT_REMOTE_URL=false
ARG MUSARE_DEBUG_GIT_BRANCH=true
ARG MUSARE_DEBUG_GIT_LATEST_COMMIT=true
ARG MUSARE_DEBUG_GIT_LATEST_COMMIT_SHORT=true

ENV FRONTEND_MODE=${FRONTEND_MODE} \
    FRONTEND_PROD_DEVTOOLS=${FRONTEND_PROD_DEVTOOLS} \
    MUSARE_SITENAME=${MUSARE_SITENAME} \
    MUSARE_DEBUG_VERSION=${MUSARE_DEBUG_VERSION} \
    MUSARE_DEBUG_GIT_REMOTE=${MUSARE_DEBUG_GIT_REMOTE} \
    MUSARE_DEBUG_GIT_REMOTE_URL=${MUSARE_DEBUG_GIT_REMOTE_URL} \
    MUSARE_DEBUG_GIT_BRANCH=${MUSARE_DEBUG_GIT_BRANCH} \
    MUSARE_DEBUG_GIT_LATEST_COMMIT=${MUSARE_DEBUG_GIT_LATEST_COMMIT} \
    MUSARE_DEBUG_GIT_LATEST_COMMIT_SHORT=${MUSARE_DEBUG_GIT_LATEST_COMMIT_SHORT}

RUN apt-get update && apt-get install nginx -y

RUN mkdir -p /opt/.git/refs /opt/types /opt/app /run/nginx
WORKDIR /opt/app

COPY .git/config .git/HEAD /opt/.git/
COPY .git/refs /opt/.git/refs
COPY types /opt/types
COPY frontend /opt/app
COPY --from=frontend_node_modules /opt/app/node_modules node_modules

RUN bash -c '([[ "${FRONTEND_MODE}" == "development" ]] && exit 0) || npm run prod'

RUN chmod u+x entrypoint.sh

ENTRYPOINT bash /opt/app/entrypoint.sh

EXPOSE 80/tcp
