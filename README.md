# MusareNode

Based off of the original [Musare](https://github.com/Musare/MusareMeteor), which utilized Meteor.

MusareNode now uses NodeJS, Express, SocketIO and VueJS - among other technologies. We have also implemented the ability to host Musare in [Docker Containers](https://www.docker.com/).

The master branch is available at [musare.com](https://musare.com)
You can also find the staging branch at [musare.dev](https://musare.dev)

<br />

## Our Stack

- NodeJS
- MongoDB
- Redis
- Nginx (not required)
- VueJS

### **Frontend**

The frontend is a [vue-cli](https://github.com/vuejs/vue-cli) generated, [vue-loader](https://github.com/vuejs/vue-loader) single page app, that's served over Nginx or Express. The Nginx server not only serves the frontend, but can also serve as a load balancer for requests going to the backend.

### **Backend**

The backend is a scalable NodeJS / Redis / MongoDB app. User sessions are stored in a central Redis server. All data is stored in a central MongoDB server. The Redis and MongoDB servers are replicated to several secondary nodes, which can become the primary node if the current primary node goes down.

We currently only utilize 1 backend, 1 MongoDB server and 1 Redis server running for production, though it is relatively easy to expand.

<br />

## Getting Started & Configuration


1. `git clone https://github.com/Musare/MusareNode.git`

2. `cd MusareNode`

3. `cp backend/config/template.json backend/config/default.json`

    | Property | Description |
    | --- | --- |
    | `mode` | Should be either `development` or `production`. No more explanation needed. |
    | `migration` | Should be set to true if you need to update DB documents to a newer version after an update. Should be false at all other times. |
    | `secret` | Whatever you want - used by express's session module. |
    | `domain` | Should be the url where the site will be accessible from,usually `http://localhost` for non-Docker. |
    | `serverDomain` | Should be the url where the backend will be accessible from, usually `http://localhost:8080` for non-Docker. |
    | `serverPort` | Should be the port where the backend will listen on, should always be `8080` for Docker, and is recommended for non-Docker. |
    | `isDocker` | Self-explanatory. Are you using Docker? |
    | `serverPort` | Should be the port where the backend will listen on, should always be `8080` for Docker, and is recommended for non-Docker. |
    | `registrationDisabled` | If set to true, users can't register accounts. |
    | `apis.youtube.key`            | Can be obtained by setting up a [YouTube API Key](https://developers.google.com/youtube/v3/getting-started). You need to use the YouTube Data API v3, and create an API key. |
    | `apis.recaptcha.secret`       | Can be obtained by setting up a [ReCaptcha Site (v3)](https://www.google.com/recaptcha/admin). |
    | `apis.recaptcha.enabled`       | Keep at false to keep disabled. |
    | `apis.github` | Can be obtained by setting up a [GitHub OAuth Application](https://github.com/settings/developers). You need to fill in some values to create the OAuth application. The homepage is the homepage of frontend. The authorization callback url is the backend url with `/auth/github/authorize/callback` added at the end. For example `http://localhost:8080/auth/github/authorize/callback`. |
    | `apis.discogs` | Can be obtained by setting up a [Discogs application](https://www.discogs.com/settings/developers), or you can disable it. |
    | `smtp` | Can be obtained by setting up an SMTP server, using a provider such as [Mailgun](http://www.mailgun.com/), or you can disable it. |
    | `redis.url` | Should be left alone for Docker, and changed to `redis://localhost:6379/0` for non-Docker. |
    | `redis.password` | Should be the Redis password you either put in your `startRedis.cmd` file for Windows, or `.env` for docker. |
    | `mongo.url` | Needs to have the proper password for the MongoDB musare user, and for non-Docker you need to replace `@musare:27017` with `@localhost:27017`. |
    | `cookie.domain` | Should be the ip or address you use to access the site, without protocols (http/https), so for example `localhost`. |
    | `cookie.secure` | Should be `true` for SSL connections, and `false` for normal http connections. |
    | `skipConfigVersionCheck` | Skips checking if the config version is outdated or not. Should almost always be set to false. |
    | `skipDbDocumentsVersionCheck` | Skips checking if there are any DB documents outdated or not. Should almost always be set to false. |
    | `configVersion` | Version of the config. Every time the template changes, you should change your config accordingly and update the configVersion. |

4. `cp frontend/build/config/template.json frontend/build/config/default.json`

    | Property | Description |
    | - | - |
    | `serverDomain` | Should be the url where the backend will be accessible from, usually `http://localhost:8080` for non-Docker. |
    | `frontendDomain` | Should be the url where the frontend will be accessible from, usually `http://localhost` for docker or `http://localhost:80` for non-Docker. |
    | `frontendPort` | Should be the port where the frontend will be accessible from, should always be port `81` for Docker, and is recommended to be port `80` for non-Docker. |
    | `recaptcha.key` | Can be obtained by setting up a [ReCaptcha Site (v3)](https://www.google.com/recaptcha/admin). |
    | `recaptcha.enabled` | Keep at false to keep disabled. |
    | `cookie.domain` | Should be the ip or address you use to access the site, without protocols (http/https), so for example `localhost`. |
    | `cookie.secure` | Should be `true` for SSL connections, and `false` for normal http connections. |
    | `siteSettings.logo` | Path to the logo image, by default it is `/assets/wordmark.png`. |
    | `siteSettings.siteName` | Should be the name of the site. |
    | `siteSettings.github` | URL of GitHub repository, defaults to `https://github.com/Musare/MusareNode`. |
    | `skipConfigVersionCheck` | Skips checking if the config version is outdated or not. Should almost always be set to false. |
    | `configVersion` | Version of the config. Every time the template changes, you should change your config accordingly and update the configVersion. |

5. Simply `cp .env.example .env` to setup your environment variables.

<br />

## Installation

After initial configuration, there are two different options to use for your local development environment.

1) [**Docker**](#docker)
2) [Standard Setup](#standard-setup)

We **highly recommend using Docker** - both for stability and speed of setup. We also use Docker on our production servers.

<br />

### **Docker**

___

1. Configure the `.env` file to match your settings in `backend/config/default.json`.  

    | Property | Description |
    | - | - |
    | Ports | Will be how you access the services on your machine, or what ports you will need to specify in your nginx files when using proxy_pass. |
    | `COMPOSE_PROJECT_NAME` | Should be a unique name for this installation, especially if you have multiple instances of Musare on the same machine. |
    | `FRONTEND_MODE` | Should be either `dev` or `prod` (self-explanatory). |
    | `MONGO_ROOT_PASSWORD` | Password of the root/admin user of MongoDB |
    | `MONGO_USER_USERNAME` | Password for the "musare" user (what the backend uses) of MongoDB |


2. Install [Docker for Desktop](https://www.docker.com/products/docker-desktop)

3. Build the backend and frontend Docker images (from the root folder)

    `docker-compose build`

4. Start the MongoDB database (in detached mode), which will generate the correct MongoDB users based on the `.env` file.

    `docker-compose up -d mongo`

5. If you want to use linting extensions in IDEs, then you must attach the IDE to the docker containers. This is entirely [possible with VS Code](https://code.visualstudio.com/docs/remote/containers).

<br />

### **Standard Setup**

___

#### Installation

1. Install [Redis](http://redis.io/download) and [MongoDB](https://www.mongodb.com/download-center#community)

2. Install [NodeJS](https://nodejs.org/en/download/)

    1. Install nodemon globally

        `npm install -g nodemon`

    2. Install node-gyp globally (first check out <https://github.com/nodejs/node-gyp#installation)>

        `npm install -g node-gyp`.

3. Install webpack globally

    `npm install -g webpack`


#### Setting up MongoDB

1. In the root directory, create a folder called `.database`

2. Create a file called `startMongo.cmd` in the root directory with the contents:

    `"C:\Program Files\MongoDB\Server\3.2\bin\mongod.exe" --dbpath "D:\Programming\HTML\MusareNode\.database"`

    Make sure to adjust your paths accordingly.

3. Set up the MongoDB database itself

    1. Start the database by executing the script `startMongo.cmd` you just made

    2. Connect to Mongo from a command prompt

        `mongo admin`

    3. Create an admin user

        `db.createUser({user: 'admin', pwd: 'PASSWORD_HERE', roles: [{role: 'userAdminAnyDatabase', db: 'admin'}]})`

    4. Connect to the Musare database

        `use musare`

    5. Create the "musare" user

        `db.createUser({user: 'musare', pwd: 'OTHER_PASSWORD_HERE', roles: [{role: 'readWrite', db: 'musare'}]})`

    6. Exit

        `exit`

    7. Add the authentication

        In `startMongo.cmd` add `--auth` at the end of the first line

#### Setting up Redis

1. In the folder where you installed Redis, edit the `redis.windows.conf` file
     
    1) In there, look for the property `notify-keyspace-events`.
    2) Make sure that property is uncommented and has the value `Ex`.
        
        It should look like `notify-keyspace-events Ex` when done.

2. Create a file called `startRedis.cmd` in the main folder with the contents:

    `"D:\Redis\redis-server.exe" "D:\Redis\redis.windows.conf" "--requirepass" "PASSWORD"`

    And again, make sure that the paths lead to the proper config and executable. Replace `PASSWORD` with your Redis password.

<br />

## Everyday usage

<br />

### **Docker**

___

1. Start the MongoDB database in the background.

    `docker-compose up -d mongo`

2. Start redis and the mongo client in the background, as we usually don't need to monitor these for errors.

    `docker-compose up -d mongoclient redis`

3. Start the backend and frontend in the foreground, so we can watch for errors during development.

    `docker-compose up backend frontend`

4. You should now be able to begin development!

    The backend is auto reloaded when you make changes and the frontend is auto compiled and live reloaded by webpack when you make changes.
    
    You should be able to access Musare in your local browser at `http://localhost:8080/`.

<br />

### **Standard Setup**

___

##### Automatic

1. If you are on Windows you can run `windows-start.cmd` or just double click the `windows-start.cmd` file and all servers will automatically start up.

##### Manual

1. Run `startRedis.cmd` and `startMongo.cmd` to start Redis and Mongo.

2. Execute `cd frontend && npm dev` and `cd backend && npm dev` separately.

<br />

## Extra

Below is a list of helpful tips / solutions we've collected while developing MusareNode.

### Fixing the "couldn't connect to docker daemon" error

Some people have had issues while trying to execute the `docker-compose` command.
To fix this, you will have to run `docker-machine env default`.
This command will print various variables.
At the bottom, it will say something similar to `@FOR /f "tokens=*" %i IN ('docker-machine env default') DO @%i`.
Run this command in your shell. You will have to do this command for every shell you want to run `docker-compose` in (every session).

### Calling Toasts

You can create Toast notifications using our custom package, [`toasters`](https://github.com/jonathan-grah/vue-roaster), using the following code:

```js
import Toast from "toasters";
new Toast({ content: "Hi!", persistant: true });
```

### Set user role

When setting up you will need to grant yourself the admin role, using the following commands:

```bash
docker-compose exec mongo mongo admin

use musare
db.auth("MUSAREDBUSER","MUSAREDBPASSWORD")
db.users.update({username: "USERNAME"}, {$set: {role: "admin"}})
```

OR use the Linux script:

```
tools/linux/makeUserAdmin.sh YOUR_MUSARE_USERNAME YOUR_MONGO_MUSARE_PASSWORD
```

<br />

## Contact

Get in touch with us via email at [core@musare.com](mailto:core@musare.com) or join our [Discord Guild](https://discord.gg/Y5NxYGP).

You can also find us on [Facebook](https://www.facebook.com/MusareMusic) and [Twitter](https://twitter.com/MusareApp).