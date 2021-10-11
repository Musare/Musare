# Configuration

## Backend
Location: `backend/config/default.json`

| Property | Description |
| --- | --- |
| `mode` | Should be either `development` or `production`. |
| `migration` | Should be set to true if you need to update DB documents to a newer version after an update. Should be false at all other times. |
| `secret` | Set to something unique and secure - used by express's session module. |
| `domain` | Should be the url where the site will be accessible from, usually `http://localhost` for non-Docker. |
| `serverDomain` | Should be the url where the backend will be accessible from, usually `http://localhost/backend` for docker or `http://localhost:8080` for non-Docker. |
| `serverPort` | Should be the port where the backend will listen on, should always be `8080` for Docker, and is recommended for non-Docker. |
| `registrationDisabled` | If set to true, users can't register accounts. |
| `apis.youtube.key` | Can be obtained by setting up a [YouTube API Key](https://developers.google.com/youtube/v3/getting-started). You need to use the YouTube Data API v3, and create an API key. |
| `apis.recaptcha` | Can be obtained by setting up a [ReCaptcha Site (v3)](https://www.google.com/recaptcha/admin), or you can disable it. |
| `apis.github` | Can be obtained by setting up a [GitHub OAuth Application](https://github.com/settings/developers). You need to fill in some values to create the OAuth application. The homepage is the homepage of frontend. The authorization callback url is the backend url with `/auth/github/authorize/callback` added at the end. For example `http://localhost/backend/auth/github/authorize/callback`. |
| `apis.discogs` | Can be obtained by setting up a [Discogs application](https://www.discogs.com/settings/developers), or you can disable it. |
| `smtp` | Can be obtained by setting up an SMTP server, or you can disable it. |
| `redis.url` | Should be left alone for Docker, and changed to `redis://localhost:6379/0` for non-Docker. |
| `redis.password` | Should be the Redis password you either put in your `startRedis.cmd` file for Windows, or `.env` for docker. |
| `mongo.url` | Needs to have the proper password for the MongoDB musare user, and for non-Docker you need to replace `@musare:27017` with `@localhost:27017`. |
| `cookie.domain` | The ip or address you use to access the site, without protocols (http/https), so for example `localhost`. |
| `cookie.secure` | Should be `true` for SSL connections, and `false` for normal http connections. |
| `skipConfigVersionCheck` | Skips checking if the config version is outdated or not. Should almost always be set to false. |
| `skipDbDocumentsVersionCheck` | Skips checking if there are any DB documents outdated or not. Should almost always be set to false. |
| `configVersion` | Version of the config. Every time the template changes, you should change your config accordingly and update the configVersion. |

## Frontend
Location: `frontend/dist/config/default.json`

| Property | Description |
| --- | --- |
| `backend.apiDomain` | Should be the url where the backend will be accessible from, usually `http://localhost/backend` for docker or `http://localhost:8080` for non-Docker. |
| `backend.websocketsDomain` | Should be the same as the `apiDomain`, except using the `ws://` protocol instead of `http://` and with `/ws` at the end. |
| `devServer.webSocketURL` | Should be the webpack-dev-server websocket URL, usually `ws://localhost/ws`. |
| `devServer.port` | Should be the port where webpack-dev-server will be accessible from, should always be port `81` for Docker since nginx listens on port 80, and is recommended to be port `80` for non-Docker. |
| `frontendDomain` | Should be the url where the frontend will be accessible from, usually `http://localhost` for docker or `http://localhost:80` for non-Docker. |
| `recaptcha.key` | Can be obtained by setting up a [ReCaptcha Site (v3)](https://www.google.com/recaptcha/admin). |
| `recaptcha.enabled` | Keep at false to keep disabled. |
| `cookie.domain` | Should be the ip or address you use to access the site, without protocols (http/https), so for example `localhost`. |
| `cookie.secure` | Should be `true` for SSL connections, and `false` for normal http connections. |
| `siteSettings.logo` | Path to the logo image, by default it is `/assets/wordmark.png`. |
| `siteSettings.siteName` | Should be the name of the site. |
| `siteSettings.github` | URL of GitHub repository, defaults to `https://github.com/Musare/MusareNode`. |
| `skipConfigVersionCheck` | Skips checking if the config version is outdated or not. Should almost always be set to false. |
| `configVersion` | Version of the config. Every time the template changes, you should change your config accordingly and update the configVersion. |

## Docker Environment
Location: `.env`

In the table below the container host refers to the IP address that the docker container listens on, setting this to `127.0.0.1` for example will only expose the configured port to localhost, whereas setting to `0.0.0.0` will expose the port on all interfaces.

The container port refers to the external docker container port, used to access services within the container. Changing this does not require any changes to configuration within container. For example setting the `MONGO_PORT` to `21018` will allow you to access the mongo service through that port, even though the application within the container is listening on `21017`.

| Property | Description |
| --- | --- |
| `COMPOSE_PROJECT_NAME` | Should be a unique name for this installation, especially if you have multiple instances of Musare on the same machine. |
| `BACKEND_HOST` | Backend container host. |
| `BACKEND_PORT` | Backend container port. |
| `FRONTEND_HOST` | Frontend container host. |
| `FRONTEND_PORT` | Frontend container port. |
| `FRONTEND_MODE` | Should be either `dev` or `prod`. |
| `MONGO_HOST` | Mongo container host. |
| `MONGO_PORT` | Mongo container port. |
| `MONGO_ROOT_PASSWORD` | Password of the root/admin user for MongoDB. |
| `MONGO_USER_USERNAME` | Application username for MongoDB. |
| `MONGO_USER_PASSWORD` | Application password for MongoDB. |
| `REDIS_HOST` | Redis container host. |
| `REDIS_PORT` | Redis container port. |
| `REDIS_PASSWORD` | Redis password. |
| `BACKUP_LOCATION` | Directory to store musare.sh backups. Defaults to `/backups` in script location. |
| `BACKUP_NAME` | Name of musare.sh backup files. Defaults to `musare-$(date +"%Y-%m-%d-%s").dump`. |