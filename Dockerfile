# Common base image
FROM node:20-alpine AS common_base

ARG UID=1000
ARG GID=1000

RUN deluser --remove-home node \
    && addgroup -S -g ${GID} musare \
    && adduser -SD -u ${UID} musare \
    && adduser musare musare

RUN mkdir -p /opt/app \
    && chown -R musare:musare /opt/app

WORKDIR /opt/app

USER musare

# Backend node modules
FROM common_base AS backend_node_modules

COPY --chown=musare:musare --link backend/package.json backend/package-lock.json /opt/app/

RUN npm install

# Backend build
FROM common_base AS backend_build

ENV APP_ENV=production

COPY --chown=musare:musare --link .git /opt/.git
COPY --chown=musare:musare --link common /opt/common
COPY --chown=musare:musare --link types /opt/types
COPY --chown=musare:musare --link backend /opt/app
COPY --chown=musare:musare --link --from=backend_node_modules /opt/app/node_modules node_modules

RUN npm run build

# Backend production image
FROM common_base AS backend

COPY --from=backend_build --link /opt/app/build build
COPY --from=backend_node_modules --link /opt/app/node_modules node_modules
COPY --from=backend_node_modules --link /opt/app/package.json /opt/app/package-lock.json /opt/app/

ENTRYPOINT npm run prod

EXPOSE 8080

# Frontend node modules
FROM common_base AS frontend_node_modules

COPY --chown=musare:musare --link frontend/package.json frontend/package-lock.json /opt/app/

RUN npm install

# Frontend build
FROM common_base AS frontend_build

ARG FRONTEND_PROD_DEVTOOLS=false
ARG MUSARE_SITENAME=Musare
ARG MUSARE_PRIMARY_COLOR="#03a9f4"
ARG MUSARE_DEBUG_VERSION=true
ARG MUSARE_DEBUG_GIT_REMOTE=false
ARG MUSARE_DEBUG_GIT_REMOTE_URL=false
ARG MUSARE_DEBUG_GIT_BRANCH=true
ARG MUSARE_DEBUG_GIT_LATEST_COMMIT=true
ARG MUSARE_DEBUG_GIT_LATEST_COMMIT_SHORT=true

ENV APP_ENV=production \
    FRONTEND_PROD_DEVTOOLS=${FRONTEND_PROD_DEVTOOLS} \
    MUSARE_SITENAME=${MUSARE_SITENAME} \
    MUSARE_PRIMARY_COLOR=${MUSARE_PRIMARY_COLOR} \
    MUSARE_DEBUG_VERSION=${MUSARE_DEBUG_VERSION} \
    MUSARE_DEBUG_GIT_REMOTE=${MUSARE_DEBUG_GIT_REMOTE} \
    MUSARE_DEBUG_GIT_REMOTE_URL=${MUSARE_DEBUG_GIT_REMOTE_URL} \
    MUSARE_DEBUG_GIT_BRANCH=${MUSARE_DEBUG_GIT_BRANCH} \
    MUSARE_DEBUG_GIT_LATEST_COMMIT=${MUSARE_DEBUG_GIT_LATEST_COMMIT} \
    MUSARE_DEBUG_GIT_LATEST_COMMIT_SHORT=${MUSARE_DEBUG_GIT_LATEST_COMMIT_SHORT}

COPY --chown=musare:musare --link .git /opt/.git
COPY --chown=musare:musare --link common /opt/common
COPY --chown=musare:musare --link types /opt/types
COPY --chown=musare:musare --link frontend /opt/app
COPY --chown=musare:musare --from=frontend_node_modules --link /opt/app/node_modules node_modules

RUN npm run prod

# Frontend production image
FROM nginx AS frontend

COPY --chown=root:root --link frontend/nginx.prod.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend_build --chown=nginx:nginx --link /opt/app/build /usr/share/nginx/html

EXPOSE 80
