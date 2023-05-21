# Configuration

## Environment Variables

Environment variables are the means of configuring application services,
particularly with our standard Docker environment.

For our standard Docker setup variables should be defined in `.env`,
an example can be found in `.env.example`
(when updating please refer to this file).
After updating values in `.env`, containers should be restarted or rebuilt.
If you are using a different setup, you will need to define the relevant
environment variables yourself.

In the table below, the `[SERVICE]_HOST` properties refer to the IP address that
the Docker container listens on. Setting this to `127.0.0.1` for will only expose
the configured port to localhost, whereas setting this to `0.0.0.0` will expose the
port on all interfaces.
The `[SERVICE]_PORT` properties refer to the external Docker container port, used
to access services from outside the container. Changing this does not require any
changes to configuration within container. For example, setting the `MONGO_PORT`
to `21018` will allow you to access the mongo database through that port on your
machine, even though the application within the container is listening on `21017`.

| Property | Description |
| --- | --- |
| `COMPOSE_PROJECT_NAME` | Should be a unique name for this installation, especially if you have multiple instances of Musare on the same machine. |
| `RESTART_POLICY` | Restart policy for Docker containers, values can be found [here](https://docs.docker.com/config/containers/start-containers-automatically/). |
| `CONTAINER_MODE` | Should be either `production` or `development`.  |
| `DOCKER_COMMAND` | Should be either `docker` or `podman`.  |
| `BACKEND_HOST` | Backend container host. Only used for development mode. |
| `BACKEND_PORT` | Backend container port. Only used for development mode. |
| `BACKEND_MODE` | Should be either `production` or `development`. |
| `BACKEND_DEBUG` | Should be either `true` or `false`. If enabled backend will await debugger connection and trigger to start. |
| `BACKEND_DEBUG_PORT` | Backend container debug port, if enabled. |
| `FRONTEND_HOST` | Frontend container host. |
| `FRONTEND_PORT` | Frontend container port. |
| `FRONTEND_CLIENT_PORT` | Should be the port on which the frontend will be accessible from, usually port `80`, or `443` if using SSL. Only used when running in development mode. |
| `FRONTEND_DEV_PORT` | Should be the port where Vite's dev server will be accessible from, should always be port `81` for Docker since nginx listens on port 80, and is recommended to be port `80` for non-Docker. Only used when running in development mode. |
| `FRONTEND_MODE` | Should be either `production` or `development`. |
| `FRONTEND_PROD_DEVTOOLS` | Whether to enable Vue dev tools in production builds. [^1] |
| `MONGO_HOST` | Mongo container host. |
| `MONGO_PORT` | Mongo container port. |
| `MONGO_ROOT_PASSWORD` | Password of the root/admin user for MongoDB. |
| `MONGO_USER_USERNAME` | Application username for MongoDB. |
| `MONGO_USER_PASSWORD` | Application password for MongoDB. |
| `MONGO_DATA_LOCATION` | The location where MongoDB stores its data. Usually the `.db` folder inside the `Musare` folder. |
| `MONGO_VERSION` | The MongoDB version to use for scripts and docker compose. Must be numerical. Currently supported MongoDB versions are 4.0+. Always make a backup before changing this value. |
| `REDIS_HOST` | Redis container host. |
| `REDIS_PORT` | Redis container port. |
| `REDIS_PASSWORD` | Redis password. |
| `REDIS_DATA_LOCATION` | The location where Redis stores its data. Usually the `.redis` folder inside the `Musare` folder. |
| `BACKUP_LOCATION` | Directory to store musare.sh backups. Defaults to `/backups` in script location. |
| `BACKUP_NAME` | Name of musare.sh backup files. Defaults to `musare-$(date +"%Y-%m-%d-%s").dump`. |
| `MUSARE_SITENAME` | Should be the name of the site. [^1] |
| `MUSARE_DEBUG_VERSION` | Log/expose the current package.json version. [^1] |
| `MUSARE_DEBUG_GIT_REMOTE` | Log/expose the current Git repository's remote. [^1] |
| `MUSARE_DEBUG_GIT_REMOTE_URL` | Log/expose the current Git repository's remote URL. [^1] |
| `MUSARE_DEBUG_GIT_BRANCH` | Log/expose the current Git repository's branch. [^1] |
| `MUSARE_DEBUG_GIT_LATEST_COMMIT` | Log/expose the current Git repository's latest commit hash. [^1] |
| `MUSARE_DEBUG_GIT_LATEST_COMMIT_SHORT` | Log/expose the current Git repository's latest commit hash (short). [^1] |

[^1]: If value is changed the frontend will require a rebuild in production mode.

## Backend Config

The backend config serves as the primary configuration means of the application.
The default values can be found in `backend/config/default.json`.

To overwrite these, create a local config e.g. `backend/config/local.json` and
define key/values.
A basic template can be found in `backend/config/template.json`.

If the default configuration changes, so will the `configVersion`.
When updating, please refer to the `default.json`, make any required
changes to your `local.json`, and update your `configVersion`.

Some configuration values are overwritten by
[Environment Variables](#environment-variables) and can not be
overwritten with `local.json`.
These values can be found in `backend/config/custom-environment-variables.json`.

For more information on configuration files please refer to the
[config package documentation](https://github.com/node-config/node-config/wiki/Configuration-Files).

| Property | Description |
| --- | --- |
| `configVersion` | Version of the config. Every time the template changes, you should change your config accordingly and update the configVersion. |
| `migration` | Set to `true` if you need to update MongoDB documents to a newer version after an update. Should be `false` at all other times. |
| `secret` | Set to something unique and secure - used by express' session module. |
| `port` | The port the backend will listen on. Should always be `8080` for Docker. |
| `url.host` | Hostname used to access application, e.g. `localhost`. |
| `url.secure` | Should be `true` if your site is using SSL, otherwise it should be `false`. |
| `cookie` | Name of the `SID` cookie used for storing login sessions. |
| `sitename` | Should be the name of the site. |
| `apis.youtube.key` | YouTube Data API v3 key, obtained from [here](https://developers.google.com/youtube/v3/getting-started). |
| `apis.youtube.rateLimit` | Minimum interval between YouTube API requests in milliseconds. |
| `apis.youtube.requestTimeout` | YouTube API requests timeout in milliseconds. |
| `apis.youtube.retryAmount` | The amount of retries to perform of a failed YouTube API request. |
| `apis.youtube.quotas` | Array of YouTube API quotas. |
| `apis.youtube.quotas.type` | YouTube API quota type, should be one of `QUERIES_PER_DAY`, `QUERIES_PER_MINUTE` or `QUERIES_PER_100_SECONDS`. |
| `apis.youtube.quotas.title` | YouTube API quota title. |
| `apis.youtube.quotas.limit` | YouTube API quota limit. |
| `apis.youtube.maxPlaylistPages` | Maximum pages to fetch from YouTube playlists. |
| `apis.spotify.clientId` | Spotify API clientId, obtained from [here](https://developer.spotify.com/documentation/web-api/tutorials/getting-started). |
| `apis.spotify.clientSecret` | Spotify API clientSecret, obtained with clientId. |
| `apis.spotify.rateLimit` | Minimum interval between Spotify API requests in milliseconds. |
| `apis.spotify.requestTimeout` | Spotify API requests timeout in milliseconds. |
| `apis.spotify.retryAmount` | The amount of retries to perform of a failed Spotify API request. |
| `apis.soundcloud.rateLimit` | Minimum interval between SoundCloud API requests in milliseconds. |
| `apis.soundcloud.requestTimeout` | SoundCloud API requests timeout in milliseconds. |
| `apis.soundcloud.retryAmount` | The amount of retries to perform of a failed SoundCloud API request. |
| `apis.recaptcha.enabled` | Whether to enable ReCaptcha in the regular (email) registration form. |
| `apis.recaptcha.key` | ReCaptcha Site v3 key, obtained from [here](https://www.google.com/recaptcha/admin). |
| `apis.recaptcha.secret` | ReCaptcha Site v3 secret, obtained with key. |
| `apis.github.enabled` | Whether to enable GitHub authentication. |
| `apis.github.client` | GitHub OAuth Application client, obtained from [here](https://github.com/settings/developers). |
| `apis.github.secret` | GitHub OAuth Application secret, obtained with client. |
| `apis.github.redirect_uri` | The backend url with `/auth/github/authorize/callback` appended, for example `http://localhost/backend/auth/github/authorize/callback`. This is configured based on the `url` config option by default. |
| `apis.discogs.enabled` | Whether to enable Discogs API usage. |
| `apis.discogs.client` | Discogs Application client, obtained from [here](https://www.discogs.com/settings/developers). |
| `apis.discogs.secret` | Discogs Application secret, obtained with client. |
| `cors.origin` | Array of additional allowed request origin urls, for example `["http://localhost"]`. The URL specified with the `url` config option is inserted by default. |
| `mail.enabled` | Whether sending emails and related functionality (e.g. password resets) is enabled. |
| `mail.from` | The from field for mails sent from backend. By default, this is configured based on config options `sitename` and `url`. `{sitename} <noreply@{url.host}>` is the default format. |
| `mail.smtp.host` | SMTP Host |
| `mail.smtp.port` | SMTP Port |
| `mail.smtp.auth.user` | SMTP Username |
| `mail.smtp.auth.pass` | SMTP Password |
| `mail.smtp.secure` | Whether SMTP is using TLS/SSL. |
| `redis` | Redis connection object. |
| `redis.url` | Should be left as default for Docker installations, otherwise it can be changed to for example `redis://localhost:6379/0`. |
| `redis.password` | Redis password. |
| `mongo.user` | MongoDB username. |
| `mongo.password` | MongoDB password. |
| `mongo.host` | MongoDB host. |
| `mongo.port` | MongoDB port. |
| `mongo.database` | MongoDB database name. |
| `blacklistedCommunityStationNames` | Array of blacklisted community station names. |
| `featuredPlaylists` | Array of featured playlist id's. Playlist privacy must be public. |
| `messages.accountRemoval` | Message to display to users when they request their account to be removed. |
| `siteSettings.christmas` | Whether to enable christmas theme. |
| `footerLinks` | Add custom links to footer by specifying `"title": "url"`, e.g. `"GitHub": "https://github.com/Musare/Musare"`. You can disable about, team and news links (but not the pages themselves) by setting them to false, e.g. `"about": false`. |
| `shortcutOverrides` | Overwrite keyboard shortcuts, for example `"editSong.useAllDiscogs": { "keyCode": 68, "ctrl": true, "alt": true, "shift": false, "preventDefault": true }`. |
| `registrationDisabled` | If set to `true`, users can't register accounts. |
| `sendDataRequestEmails` | If `true` all admin users will be sent an email if a data request is received. Requires mail to be enabled and configured. |
| `skipConfigVersionCheck` | Skips checking if the config version is outdated or not. Should almost always be set to false. |
| `skipDbDocumentsVersionCheck` | Skips checking if there are any DB documents outdated or not. Should almost always be set to false. |
| `debug.stationIssue` | If set to `true` it will enable the `/debug_station` API endpoint on the backend, which provides information useful to debugging stations not skipping, as well as capture all jobs specified in `debug.captureJobs`.
| `debug.traceUnhandledPromises` | Enables the trace-unhandled package, which provides detailed information when a promise is unhandled. |
| `debug.captureJobs` | Array of jobs to capture for `debug.stationIssue`. |
| `debug.git.remote` | Log/expose the current Git repository's remote. |
| `debug.git.remoteUrl` | Log/expose the current Git repository's remote URL. |
| `debug.git.branch` | Log/expose the current Git repository's branch. |
| `debug.git.latestCommit` | Log/expose the current Git repository's latest commit hash. |
| `debug.git.latestCommitShort` | Log/expose the current Git repository's latest commit hash (short). |
| `debug.version` | Log/expose the current package.json version. |
| `defaultLogging.hideType` | Filters out specified message types from log, for example `INFO`, `SUCCESS`, `ERROR` and `STATION_ISSUE`. |
| `defaultLogging.blacklistedTerms` | Filters out messages containing specified terms from log, for example `success`. |
| `customLoggingPerModule.[module].hideType` | Where `[module]` is a module name specify hideType as you would `defaultLogging.hideType` to overwrite default. |
| `customLoggingPerModule.[module].blacklistedTerms` | Where `[module]` is a module name specify blacklistedTerms as you would `defaultLogging.blacklistedTerms` to overwrite default. |
| `experimental.weight_stations` | Experimental option to use weights when autofilling stations, looking at the weight[X] tag for songs. Must be an object, key must be station id's, value can be either `true` or a string. If `true`, it uses tag name `weight`. If a string, it uses that string as the tag name. |
| `experimental.queue_autofill_skip_last_x_played` | Experimental option to not autofill songs that were played recently. Must be an object, key must be station id's, value must be a number. The number equals how many songs it will consider recent and use when checking if it can autofill. |
| `experimental.queue_add_before_autofilled` | Experimental option to have requested songs in queue appear before autofilled songs, based on the autofill number. Must be `true` or an object. If `true`, it's enabled for all stations. If an object, key must be a station's id, and value must be `true` to enable for that station. |
| `experimental.disable_youtube_search` | Experimental option to disable YouTube search. |
| `experimental.registration_email_whitelist` | Experimental option to limit registration to users with an email matching any regex pattern defined in an array. |
| `experimental.changable_listen_mode` | Experimental option to allows users on stations to close the player whilst maintaing ActivityWatch functionality and users list playback state. If `true`, it's enabled for all stations. If it's an array of station id's, it's enabled for just those stations. |
| `experimental.media_session` | Experimental option to enable media session functionality. |
| `experimental.station_history` | Experimental feature to store and display songs played in a station, in addition to allowing preventing playing recently played songs. |
| `experimental.soundcloud` | Experimental SoundCloud integration. |
| `experimental.spotify` | Experimental Spotify integration. |

## Docker-compose override

You may want to override the docker-compose files in some specific cases.
For this, you can create a `docker-compose.override.yml` file.

For example, to expose the backend port:

```yml
services:
  backend:
    ports:
      - "${BACKEND_HOST}:${BACKEND_PORT}:8080"
```

This assumes that you have also set `BACKEND_PORT` inside your `.env` file.
