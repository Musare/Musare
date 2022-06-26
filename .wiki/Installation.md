# Installation

Musare can be installed with Docker (recommended) or without, guides for both installations can be found below.

To update an existing installation please see [Upgrading](./Upgrading.md).

## Docker

### Dependencies

-   [Git](https://github.com/git-guides/install-git)
-   [Docker](https://docs.docker.com/get-docker/)
-   [docker-compose](https://docs.docker.com/compose/install/)

### Instructions

1. `git clone https://github.com/Musare/Musare.git`
2. `cd Musare`
3. `cp backend/config/template.json backend/config/default.json` and configure as per [Configuration](./Configuration.md#Backend)
4. `cp frontend/dist/config/template.json frontend/dist/config/default.json` and configure as per [Configuration](./Configuration.md#Frontend)
5. `cp .env.example .env` and configure as per [Configuration](./Configuration.md#Docker-Environment).
6. `./musare.sh build`
7. `./musare.sh start`
8. **(optional)** Register a new user on the website and grant the admin role by running `./musare.sh admin add USERNAME`.

### Fixing the "couldn't connect to docker daemon" error

**Windows Only**

Some people have had issues while trying to execute the `docker-compose` command.
To fix this, you will have to run `docker-machine env default`.
This command will print various variables.
At the bottom, it will say something similar to `@FOR /f "tokens=*" %i IN ('docker-machine env default') DO @%i`.
Run this command in your shell. You will have to do this command for every shell you want to run `docker-compose` in (every session).

---

## Non-Docker

### Dependencies

-   [Git](https://github.com/git-guides/install-git)
-   [Redis](http://redis.io/download)
-   [MongoDB](https://www.mongodb.com/try/download/community)
-   [NodeJS](https://nodejs.org/en/download/)
    -   [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
    -   [nodemon](https://github.com/remy/nodemon#installation)

### Instructions

1. `git clone https://github.com/Musare/Musare.git`
2. `cd Musare`
3. [Setup MongoDB](#Setting-up-MongoDB)
4. [Setup Redis](#Setting-up-Redis)
5. `cp backend/config/template.json backend/config/default.json` and configure as per [Configuration](./Configuration.md#Backend)
6. `cp frontend/dist/config/template.json frontend/dist/config/default.json` and configure as per [Configuration](./Configuration.md#Frontend)
7. `cd frontend && npm install && cd ..`
8. `cd backend && npm install && cd ..`
9. Start services
    - **Linux**
        1. Execute `systemctl start redis mongod`
        2. Execute `cd frontend && npm run dev` and `cd backend && npm run dev` separately.
    - **Windows**
        - **Automatic** Run `windows-start.cmd` or just double click the `windows-start.cmd` file and all servers will automatically start up.
        - **Manual**
            1. Run `startRedis.cmd` and `startMongo.cmd` to start Redis and Mongo.
            2. Execute `cd frontend && npm run dev` and `cd backend && npm run dev` separately.
10. **(optional)** Register a new user on the website and grant the admin role by running the following in the mongodb shell.
    ```bash
    use musare
    db.auth("MUSAREDBUSER","MUSAREDBPASSWORD")
    db.users.update({username: "USERNAME"}, {$set: {role: "admin"}})
    ```

### Setting up MongoDB

-   **Windows Only**

    1. In the root directory, create a folder called `.database`
    2. Create a file called `startMongo.cmd` in the root directory with the contents:

        `"C:\Program Files\MongoDB\Server\4.0\bin\mongod.exe" --dbpath "C:\Path\To\Musare\.database"`

        Make sure to adjust your paths accordingly.

    3. Start the database by executing the script `startMongo.cmd` you just made

-   Set up the MongoDB database itself

    1. Start MongoDB
        - **Linux** Execute `systemctl start mongod`
        - **Windows** Execute the `startMongo.cmd` script you just made
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
        - **Linux**
            1. Add `auth=true` to `/etc/mongod.conf`
            2. Restart MongoDB `systemctl restart mongod`
        - **Windows**
            1. In `startMongo.cmd` add `--auth` at the end of the first line
            2. Restart MongoDB

### Setting up Redis

-   **Windows**

    1. In the folder where you installed Redis, edit the `redis.windows.conf` file

        1. In there, look for the property `notify-keyspace-events`.
        2. Make sure that property is uncommented and has the value `Ex`.

            It should look like `notify-keyspace-events Ex` when done.

    2. Create a file called `startRedis.cmd` in the main folder with the contents:

        `"C:\Path\To\Redis\redis-server.exe" "C:\Path\To\Redis\redis.windows.conf" "--requirepass" "PASSWORD"`

        And again, make sure that the paths lead to the proper config and executable. Replace `PASSWORD` with your Redis password.

-   **Linux**
    1. In `/etc/redis/redis.conf`
        1. Uncomment `notify-keyspace-events` and set its value to `Ex`.
        2. Uncomment `requirepass foobared` and replace foobared with your Redis password.
    2. Restart Redis `systemctl restart redis`
