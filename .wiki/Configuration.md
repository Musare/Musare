# Configuration

## Backend
Location: `backend/config/default.json`

| Property | Description |
| --- | --- |
| `mode` | Should be either `development` or `production`. |
| `migration` | Should be set to `true` if you need to update MongoDB documents to a newer version after an update. Should be false at all other times. |
| `secret` | Set to something unique and secure - used by express's session module. |
| `domain` | Should be the url where the site will be accessible from, usually `http://localhost` for non-Docker. |
| `serverDomain` | Should be the url where the backend will be accessible from, usually `http://localhost/backend` for docker or `http://localhost:8080` for non-Docker. |
| `serverPort` | Should be the port where the backend will listen on, should always be `8080` for Docker, and is recommended for non-Docker. |
| `registrationDisabled` | If set to true, users can't register accounts. |
| `hideAutomaticallyRequestedSongs` | If `true` any automatically requested songs will be hidden. |
| `hideAnonymousSongs` | If `true` any anonymously requested songs will be hidden. |
| `sendDataRequestEmails` | If `true` all admin users will be sent an email if a data request is received. |
| `apis.youtube.key` | YouTube Data API v3 key, obtained from [here](https://developers.google.com/youtube/v3/getting-started). |
| `apis.youtube.rateLimit` | Minimum interval between YouTube API requests in milliseconds. |
| `apis.youtube.requestTimeout` | YouTube API requests timeout in milliseconds. |
| `apis.youtube.retryAmount` | The amount of retries to perform of a failed YouTube API request. |
| `apis.recaptcha.secret` | ReCaptcha Site v3 secret, obtained from [here](https://www.google.com/recaptcha/admin). |
| `apis.recaptcha.enabled` | Whether to enable ReCaptcha at email registration. |
| `apis.github.client` | GitHub OAuth Application client, obtained from [here](https://github.com/settings/developers). |
| `apis.github.secret` | GitHub OAuth Application secret, obtained with client. |
| `apis.github.redirect_uri` | The authorization callback url is the backend url with `/auth/github/authorize/callback` appended, for example `http://localhost/backend/auth/github/authorize/callback`. |
| `apis.discogs.client` | Discogs Application client, obtained from [here](https://www.discogs.com/settings/developers). |
| `apis.discogs.secret` | Discogs Application secret, obtained with client. |
| `apis.discogs.enabled` | Whether to enable Discogs API usage. |
| `cors.origin` | Array of allowed request origin urls, for example `http://localhost`. |
| `smtp.host` | SMTP Host |
| `smtp.port` | SMTP Port |
| `smtp.auth.user` | SMTP Username |
| `smtp.auth.pass` | SMTP Password |
| `smtp.secure` | Whether SMTP is secured. |
| `smtp.enabled` | Whether SMTP and sending emails is enabled. |
| `redis.url` | Should be left as default for Docker installations, else changed to `redis://localhost:6379/0`. |
| `redis.password` | Redis password. |
| `mongo.url` | For Docker replace temporary MongoDB musare user password with one specified in `.env`, and for non-Docker replace `@musare:27017` with `@localhost:27017`. |
| `cookie.domain` | The ip or address you use to access the site, without protocols (http/https), so for example `localhost`. |
| `cookie.secure` | Should be `true` for SSL connections, and `false` for normal http connections. |
| `cookie.SIDname` | Name of the cookie stored for sessions. |
| `blacklistedCommunityStationNames ` | Array of blacklisted community station names. |
| `featuredPlaylists ` | Array of featured playlist id's. Playlist privacy must be public. |
| `skipConfigVersionCheck` | Skips checking if the config version is outdated or not. Should almost always be set to false. |
| `skipDbDocumentsVersionCheck` | Skips checking if there are any DB documents outdated or not. Should almost always be set to false. |
| `debug.stationIssue` | If set to `true` it will enable the `/debug_station` API endpoint on the backend, which provides information useful to debugging stations not skipping, as well as capure all jobs specified in `debug.captureJobs`. 
| `debug.traceUnhandledPromises` | Enables the trace-unhandled package, which provides detailed information when a promise is unhandled. |
| `debug.captureJobs` | Array of jobs to capture for `debug.stationIssue`. |
| `defaultLogging.hideType` | Filters out specified message types from log, for example `INFO`, `SUCCESS`, `ERROR` and `STATION_ISSUE`. |
| `defaultLogging.blacklistedTerms` | Filters out messages containing specified terms from log, for example `success`. |
| `customLoggingPerModule.[module].hideType` | Where `[module]` is a module name specify hideType as you would `defaultLogging.hideType` to overwrite default. |
| `customLoggingPerModule.[module].blacklistedTerms` | Where `[module]` is a module name specify blacklistedTerms as you would `defaultLogging.blacklistedTerms` to overwrite default. |
| `configVersion` | Version of the config. Every time the template changes, you should change your config accordingly and update the configVersion. |

## Frontend
Location: `frontend/dist/config/default.json`

| Property | Description |
| --- | --- |
| `mode` | Should be either `development` or `production`. |
| `backend.apiDomain` | Should be the url where the backend will be accessible from, usually `http://localhost/backend` for docker or `http://localhost:8080` for non-Docker. |
| `backend.websocketsDomain` | Should be the same as the `apiDomain`, except using the `ws://` protocol instead of `http://` and with `/ws` at the end. |
| `devServer.webSocketURL` | Should be the webpack-dev-server websocket URL, usually `ws://localhost/ws`. |
| `devServer.port` | Should be the port where webpack-dev-server will be accessible from, should always be port `81` for Docker since nginx listens on port 80, and is recommended to be port `80` for non-Docker. |
| `frontendDomain` | Should be the url where the frontend will be accessible from, usually `http://localhost` for docker or `http://localhost:80` for non-Docker. |
| `recaptcha.key` | ReCaptcha Site v3 key, obtained from [here](https://www.google.com/recaptcha/admin). |
| `recaptcha.enabled` | Whether to enable ReCaptcha at email registration. |
| `cookie.domain` | Should be the ip or address you use to access the site, without protocols (http/https), so for example `localhost`. |
| `cookie.secure` | Should be `true` for SSL connections, and `false` for normal http connections. |
| `cookie.SIDname` | Name of the cookie stored for sessions. |
| `siteSettings.logo_white` | Path to the white logo image, by default it is `/assets/white_wordmark.png`. |
| `siteSettings.logo_blue` | Path to the blue logo image, by default it is `/assets/blue_wordmark.png`. |
| `siteSettings.sitename` | Should be the name of the site. |
| `siteSettings.github` | URL of GitHub repository, defaults to `https://github.com/Musare/MusareNode`. |
| `siteSettings.christmas` | Whether to enable christmas theming. |
| `messages.accountRemoval` | Message to return to users on account removal. |
| `shortcutOverrides` | Overwrite keyboard shortcuts, for example `"editSong.useAllDiscogs": { "keyCode": 68, "ctrl": true, "alt": true, "shift": false, "preventDefault": true }`. |
| `debug.git.remote` | Allow the website/users to view the current Git repository's remote. [^1] |
| `debug.git.remoteUrl` | Allow the website/users to view the current Git repository's remote URL. [^1] |
| `debug.git.branch` | Allow the website/users to view the current Git repository's branch. [^1] |
| `debug.git.latestCommit` | Allow the website/users to view the current Git repository's latest commit hash. [^1] |
| `debug.git.latestCommitShort` | Allow the website/users to view the current Git repository's latest commit hash (short). [^1] |
| `debug.version` | Allow the website/users to view the current package.json version. [^1] |
| `skipConfigVersionCheck` | Skips checking if the config version is outdated or not. Should almost always be set to false. |
| `configVersion` | Version of the config. Every time the template changes, you should change your config accordingly and update the configVersion. |

[^1]: Requires a frontend restart to update. The data will be available from the frontend console and by the frontend code.

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