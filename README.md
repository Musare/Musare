# MusareNode

Based off of the original [Musare](https://github.com/Musare/MusareMeteor), which utilized Meteor.

MusareNode now uses NodeJS, Express, VueJS and websockets - among other technologies. We have also implemented the ability to host Musare in [Docker Containers](https://www.docker.com/).

The master branch is available at [musare.com](https://musare.com)
You can also find the staging branch at [musare.dev](https://musare.dev)

<br />

## Getting Started
- [Installation](./.wiki/Installation.md)
- [Configuration](./.wiki/Configuration.md)
- [Utility Script](./.wiki/Utility_Script.md)

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