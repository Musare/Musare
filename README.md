
  
# MusareNode

Based off of the original [Musare](https://github.com/Musare/MusareMeteor), which utilized Meteor.

MusareNode now uses NodeJS, Express, SocketIO and VueJS - among other technologies. We have also implemented the ability to host Musare in [Docker Containers](https://www.docker.com/).

The master branch is available at [musare.com](https://musare.com)
You can also find the staging branch at [musare.dev](https://musare.dev)

## Contact

Get in touch with us via email at [core@musare.com](mailto:core@musare.com) or join our [Discord Guild](https://discord.gg/Y5NxYGP).

You can also find us on [Facebook](https://www.facebook.com/MusareMusic) and [Twitter](https://twitter.com/MusareApp).

### Our Stack

- NodeJS
- MongoDB
- Redis
- Nginx (not required)
- VueJS

### Frontend

The frontend is a [vue-cli](https://github.com/vuejs/vue-cli) generated, [vue-loader](https://github.com/vuejs/vue-loader) single page app, that's served over Nginx or Express. The Nginx server not only serves the frontend, but can also serve as a load balancer for requests going to the backend.

### Backend

The backend is a scalable NodeJS / Redis / MongoDB app. Each backend server handles a group of SocketIO connections. User sessions are stored in a central Redis server. All data is stored in a central MongoDB server. The Redis and MongoDB servers are replicated to several secondary nodes, which can become the primary node if the current primary node goes down.

We currently only utilize 1 backend, 1 MongoDB server and 1 Redis server running for production, though it is relatively easy to expand.

## Requirements
Installing with Docker: (not recommended for Windows users)

- [Docker](https://www.docker.com/)

Standard Installation:

- [NodeJS](https://nodejs.org/en/download/)
  _ nodemon: `yarn global add nodemon`
  _ [node-gyp](https://github.com/nodejs/node-gyp#installation): `yarn global add node-gyp`
- [Yarn (Windows)](https://yarnpkg.com/lang/en/docs/install/#windows-stable) [Yarn (Unix)](https://yarnpkg.com/lang/en/docs/install/#debian-stable) ([npm](https://www.npmjs.com/) can also be used)
- [MongoDB](https://www.mongodb.com/download-center) Currently version 4.0
- [Redis (Windows)](https://github.com/MSOpenTech/redis/releases/tag/win-3.2.100) [Redis (Unix)](https://redis.io/download)

## Getting Started

Once you've installed the required tools:

1. `git clone https://github.com/Musare/MusareNode.git`

2. `cd MusareNode`

3. `cp backend/config/template.json backend/config/default.json`

|Property|Description|
|--|--|
|`mode`|Should be either `development` or `production`. No more explanation needed.|
|`secret`|Whatever you want - used by express's session module.|
|`domain`|Should be the url where the site will be accessible from,usually `http://localhost` for non-Docker.|
|`serverDomain`|Should be the url where the backend will be accessible from, usually `http://localhost:8080` for non-Docker.|
|`serverPort`|Should be the port where the backend will listen on, should always be `8080` for Docker, and is recommended for non-Docker.|
|`isDocker`|Self-explanatory. Are you using Docker?|
|`serverPort`|Should be the port where the backend will listen on, should always be `8080` for Docker, and is recommended for non-Docker.|
|`apis.youtube.key`|Can be obtained by setting up a [YouTube API Key](https://developers.google.com/youtube/v3/getting-started). You need to use the YouTube Data API v3, and create an API key.|
|`apis.recaptcha.secret`|Can be obtained by setting up a [ReCaptcha Site (v3)](https://www.google.com/recaptcha/admin).|
|`apis.github`|Can be obtained by setting up a [GitHub OAuth Application](https://github.com/settings/developers). You need to fill in some values to create the OAuth application. The homepage is the homepage of frontend. The authorization callback url is the backend url with `/auth/github/authorize/callback` added at the end. For example `http://localhost:8080/auth/github/authorize/callback`.|
|`apis.discord.token`|Token for the Discord bot.|
|`apis.discord.loggingServer`|Server ID of the Discord logging server.|
|`apis.discord.loggingChannel`|ID of the channel to be used in the Discord logging server.|
|`apis.mailgun`|Can be obtained by setting up a [Mailgun account](http://www.mailgun.com/), or you can disable it.|
|`apis.spotify`|Can be obtained by setting up a [Spotify client id](https://developer.spotify.com/dashboard/applications), or you can disable it.|
|`apis.discogs`|Can be obtained by setting up a [Discogs application](https://www.discogs.com/settings/developers), or you can disable it.|
|`redis.url`|Should be left alone for Docker, and changed to `redis://localhost:6379/0` for non-Docker.|
|`redis.password`|Should be the Redis password you either put in your `startRedis.cmd` file for Windows, or `.env` for docker.|
|`mongo.url`|Needs to have the proper password for the MongoDB musare user, and for non-Docker you need to replace `@musare:27017` with `@localhost:27017`.|
|`cookie.domain`|Should be the ip or address you use to access the site, without protocols (http/https), so for example `localhost`.|
|`cookie.secure`|Should be `true` for SSL connections, and `false` for normal http connections.|

4. `cp frontend/build/config/template.json frontend/build/config/default.json`

|Property|Description|
|--|--|
|`serverDomain`|Should be the url where the backend will be accessible from, usually `http://localhost:8080` for non-Docker.|
|`frontendDomain`|Should be the url where the frontend will be accessible from, usually `http://localhost` for docker or `http://localhost:80` for non-Docker.|
|`frontendPort`|Should be the port where the frontend will be accessible from, should always be port `81` for Docker, and is recommended to be port `80` for non-Docker.|
|`recaptcha.key`|Can be obtained by setting up a [ReCaptcha Site (v3)](https://www.google.com/recaptcha/admin).|
|`cookie.domain`|Should be the ip or address you use to access the site, without protocols (http/https), so for example `localhost`.|
|`cookie.secure`|Should be `true` for SSL connections, and `false` for normal http connections.|
|`siteSettings.logo`|Path to the logo image, by default it is `/assets/wordmark.png`.|
|`siteSettings.siteName`|Should be the name of the site.|
|`siteSettings.socialLinks`|`github`, `twitter` and `facebook` are set to the official Musare accounts by default, but can be changed.|

5. Simply `cp .env.example .env` to setup your environment variables.

6. To setup [snyk](https://snyk.io/) (which is what we use for our precommit git-hooks), you will need to:
- Setup an account
- Go to [settings](https://app.snyk.io/account)
- Copy the API token and set it as your `SNYK_TOKEN` environment variable.

We use snyk to test our dependencies / dev-dependencies for vulnerabilities.

### Installing with Docker

_Configuration_

To configure docker configure the `.env` file to match your settings in `backend/config/default.json`.  
The configurable ports will be how you access the services on your machine, or what ports you will need to specify in your nginx files when using proxy_pass. 
`COMPOSE_PROJECT_NAME` should be a unique name for this installation, especially if you have multiple instances of Musare on the same machine.
`FRONTEND_MODE` should be either `dev` or `prod` (self-explanatory).

1. Build the backend and frontend Docker images (from the main folder)

   `docker-compose build`

2. Set up the MongoDB database

   1. Set the password for the admin/root user.

      In `.env` set the environment variable of `MONGO_ROOT_PASSWORD`.

   2. Set the password for the musare user (the one the backend will use).

      In `.env` set the environment variable of `MONGO_USER_USERNAME` and `MONGO_USER_PASSWORD`.

   2. Start the database (in detached mode), which will generate the correct MongoDB users.

      `docker-compose up -d mongo`


3) Start redis and the mongo client in the background, as we usually don't need to monitor these for errors

   `docker-compose up -d mongoclient redis`

4) Start the backend and frontend in the foreground, so we can watch for errors during development

   `docker-compose up backend frontend`

5) You should now be able to begin development! The backend is auto reloaded when
   you make changes and the frontend is auto compiled and live reloaded by webpack
   when you make changes. You should be able to access Musare in your local browser
   at `http://<docker-machine-ip>:8080/` where `<docker-machine-ip>` can be found below:

   - Docker for Windows / Mac: This is just `localhost`

   - Docker ToolBox: The output of `docker-machine ip default`

If you are using linting extensions in IDEs/want to run `yarn lint`, you need to install the following locally (outside of Docker):
```
yarn global add eslint
yarn add eslint-config-airbnb-base
```

### Standard Installation

Steps 1-4 are things you only have to do once. The steps to start servers follow.

1.  In the main folder, create a folder called `.database`

2.  Create a file called `startMongo.cmd` in the main folder with the contents:

        "C:\Program Files\MongoDB\Server\3.2\bin\mongod.exe" --dbpath "D:\Programming\HTML\MusareNode\.database"

    Make sure to adjust your paths accordingly.

3.  Set up the MongoDB database

    1. Start the database by executing the script `startMongo.cmd` you just made

    2. Connect to Mongo from a command prompt

       `mongo admin`

    3. Create an admin user

       `db.createUser({user: 'admin', pwd: 'PASSWORD_HERE', roles: [{role: 'userAdminAnyDatabase', db: 'admin'}]})`

    4. Connect to the Musare database

       `use musare`

    5. Create the musare user

       `db.createUser({user: 'musare', pwd: 'OTHER_PASSWORD_HERE', roles: [{role: 'readWrite', db: 'musare'}]})`

    6. Exit

       `exit`

    7. Add the authentication

       In `startMongo.cmd` add `--auth` at the end of the first line

4.  In the folder where you installed Redis, edit the `redis.windows.conf` file. In there, look for the property `notify-keyspace-events`. Make sure that property is uncommented and has the value `Ex`. It should look like `notify-keyspace-events Ex` when done.

5.  Create a file called `startRedis.cmd` in the main folder with the contents:

        "D:\Redis\redis-server.exe" "D:\Redis\redis.windows.conf" "--requirepass" "PASSWORD"

    And again, make sure that the paths lead to the proper config and executable. Replace `PASSWORD` with your Redis password.

### Non-docker start servers

**Automatic**

1.  If you are on Windows you can run `windows-start.cmd` or just double click the `windows-start.cmd` file and all servers will automatically start up.

**Manual**

1. Run `startRedis.cmd` and `startMongo.cmd` to start Redis and Mongo.

2. In a command prompt with the pwd of frontend, run `yarn run dev`

3. In a command prompt with the pwd of backend, run `nodemon`

## Extra

Below is a list of helpful tips / solutions we've collected while developing MusareNode.

### Mounting a non-standard directory in Docker Toolbox on Windows

Docker Toolbox usually only gives VirtualBox access to `C:/Users` of your
local machine. So if your code is located elsewere on your machine,
you'll need to tell Docker Toolbox how to find it. You can use variations
of the following commands to give Docker Toolbox access to those files.

1. First lets ensure the machine isn't running

   `docker-machine stop default`

1. Next we'll want to tell the machine about the folder we want to share.

   `"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" sharedfolder add default --name "d/Projects/MusareNode" --hostpath "D:\Projects\MusareNode" --automount`

1. Now start the machine back up and ssh into it

   `docker-machine start default && docker-machine ssh default`

1. Tell boot2docker to mount our volume at startup, by appending to its startup script

   ```bash
   sudo tee -a /mnt/sda1/var/lib/boot2docker/profile >/dev/null <<EOF

   mkdir -p /d/Projects/MusareNode
   mount -t vboxsf -o uid=1000,gid=50 d/Projects/MusareNode /d/Projects/MusareNode
   EOF
   ```

1. Restart the docker machine so that it uses the new shared folder

   `docker-machine restart default`

1. You now should be good to go!

### Fixing the "couldn't connect to docker daemon" error

Some people have had issues while trying to execute the `docker-compose` command.
To fix this, you will have to run `docker-machine env default`.
This command will print various variables.
At the bottom, it will say something similar to `@FOR /f "tokens=*" %i IN ('docker-machine env default') DO @%i`.
Run this command in your shell. You will have to do this command for every shell you want to run `docker-compose` in (every session).

### Running Musare locally without using Docker

1. Install [Redis](http://redis.io/download) and [MongoDB](https://www.mongodb.com/download-center#community)

2. Install nodemon globally

   `yarn global add nodemon`

3. Install webpack globally

   `yarn global add webpack`

4. Install node-gyp globally (first check out https://github.com/nodejs/node-gyp#installation)

   `yarn global add node-gyp`.

5. Run `yarn run bootstrap` to install dependencies and dev-dependencies for both the frontend and backend.

6. Either execute `yarn run dev:frontend` and `yarn run dev:backend` separately, or in parallel with `yarn dev`.

### Calling Toasts

You can call Toasts using our custom package, [`vue-roaster`](https://github.com/atjonathan/vue-roaster), using the following code:

```js
import { Toast } from "vue-roaster";
Toast.methods.addToast("", 0);
```

### Set user role

When setting up you will need to grant yourself the admin role, using the following commands:

```
docker-compose exec mongo mongo admin

use musare
db.auth("MUSAREDBUSER","MUSAREDBPASSWORD")
db.users.update({username: "USERNAME"}, {$set: {role: "admin"}})
```

### Adding a package

We use lerna to add an additional package to either the frontend or the backend.

For example, this is how we would to add the `webpack-bundle-analyser` package as a dev-dependency to the frontend:
```
npx lerna add webpack-bundle-analyser --scope=musare-frontend --dev
```