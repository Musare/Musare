# MusareNode
This is a rewrite of the original [Musare](https://github.com/Musare/Musare)
in NodeJS, Express, SocketIO and VueJS. Everything is ran in it's own docker container.

### Our Stack

   * NodeJS
   * MongoDB
   * Redis
   * Nginx
   * VueJS

### Frontend
The frontend is a [vue-cli](https://github.com/vuejs/vue-cli) generated,
[vue-loader](https://github.com/vuejs/vue-loader) single page app, that's
served over Nginx. The Nginx server not only serves the frontend, but
also serves as a load balancer for requests going to the backend.

### Backend
The backend is a scalable NodeJS / Redis / MongoDB app. Each backend
server handles a group of SocketIO connections. User sessions are stored
in a central Redis server. All data is stored in a central MongoDB server.
The Redis and MongoDB servers are replicated to several secondary nodes,
which can become the primary node if the current primary node goes down.

## Requirements
 * [Docker](https://www.docker.com/)

## Getting Started
Once you've installed the required tools:

1. `git clone https://github.com/MusareNode/MusareNode.git`

2. `cd MusareNode`

3. `cp backend/config/template.json backend/config/default.json`

   > The `secret` key can be whatever. It's used by express's session module.
   The `apis.youtube.key` value can be obtained by setting up a
   [YouTube API Key](https://developers.google.com/youtube/v3/getting-started).
  
4. Build the backend and frontend Docker images

   `docker-compose build`

5. Start the databases and tools in the background, as we usually don't need to monitor these for errors

   `docker-compose up -d mongo mongoclient redis`

6. Start the backend and frontend in the foreground, so we can watch for errors during development

   `docker-compose up backend frontend`

7. You should now be able to begin development! The backend is auto reloaded when
   you make changes and the frontend is auto compiled and live reloaded by webpack
   when you make changes. You should be able to access Musare in your local browser
   at `http://<docker-machine-ip>:8080/` where `<docker-machine-ip>` can be found below:

   * Docker for Windows / Mac: This is just `localhost`
   
   * Docker ToolBox: The output of `docker-machine ip default`
   
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

2. Now start the machine back up and ssh into it

   `docker-machine start default && docker-machine ssh default`
   
3. Tell boot2docker to mount our volume at startup, by appending to its startup script
	```bash
	sudo tee -a /mnt/sda1/var/lib/boot2docker/profile >/dev/null <<EOF

	mkdir -p /d/Projects/MusareNode
	mount -t vboxsf -o uid=1000,gid=50 d/Projects/MusareNode /d/Projects/MusareNode
	EOF
	```

4. Restart the docker machine so that it uses the new shared folder

   `docker-machine restart default`
   
5. You now should be good to go!

### Fixing the "couldn't connect to docker daemon" error

Some people have had issues while trying to execute the `docker-compose` command.
To fix this, you will have to run `docker-machine env default`.
This command will print various variables.
At the bottom, it will say something similar to `@FOR /f "tokens=*" %i IN ('docker-machine env default') DO @%i`.
Run this command in your shell. You will have to do this command for every shell you want to run `docker-compose` in (every session).

### Running Musare locally without using Docker

1. Install [Redis](http://redis.io/download) and [MongoDB](https://www.mongodb.com/download-center#community)

2. Install nodemon globally

   `npm install nodemon -g`

3. Install webpack globally

   `npm install webpack -g`

4. Install node-gyp globally (first check out https://github.com/nodejs/node-gyp#installation)

   `npm install node-gyp -g`.

5. In both `frontend` and `backend` folders, do `npm install`.

6. `nodemon backend/index.js`