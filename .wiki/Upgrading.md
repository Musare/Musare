# Upgrading
Musare upgrade process.

To install a new instance please see [Installation](./Installation.md).

## Docker

### Instructions
1. Make a backup! `./musare.sh backup`
2. Execute `./musare.sh update`. If an update requires any configuration changes or database migrations, you will be notified.
    - To update configuration compare example configs against your own and add/update/remove any properties as needed. For more information on properties see [Configuration](./Configuration.md). Frontend and backend configuration updates always update the `configVersion` property.
        - Backend, compare `backend/config/template.json` against `backend/config/default.json`.
        - Frontend, compare `frontend/dist/config/template.json` against `frontend/dist/config/default.json`.
        - Environment, compare `.env.example` against `.env`.
    - To migrate database;
        - `./musare.sh stop backend`
        - Set `migration` to `true` in  `backend/config/default.json`
        - `./musare.sh start backend`.
        - Follow backend logs and await migration completion notice `./musare.sh attach backend`.
        - `./musare.sh stop backend`
        - Set `migration` to `false` in  `backend/config/default.json`
        - `./musare.sh start backend`.

---

## Non-Docker

### Instructions
1. Make a backup!
2. Stop all services
3. `git pull`
4. `cd frontend && npm install`
5. `cd ../backend && npm install`
6. Compare example configs against your own and add/update/remove any properties as needed. For more information on properties see [Configuration](./Configuration.md). Frontend and backend configuration updates always update the `configVersion` property.
    - Backend, compare `backend/config/template.json` against `backend/config/default.json`.
    - Frontend, compare `frontend/dist/config/template.json` against `frontend/dist/config/default.json`.
7. Start MongoDB and Redis services.
8. Run database migration;
    - Set `migration` to `true` in  `backend/config/default.json`
    - Start backend service.
    - Follow backend logs and await migration completion notice.
    - Stop backend service.
    - Set `migration` to `false` in  `backend/config/default.json`
9. Start backend and frontend services.

# Upgrade/downgrade MongoDB

Make sure to always look at the upgrade/downgrade instructions in the [MongoDB release notes](https://docs.mongodb.com/manual/release-notes) before, and always make a full backup of your data before proceeding.

## Docker

### Instructions
1. Stop the backend (`./musare.sh stop backend`)
2. Make a backup of MongoDB (`./musare.sh backup`)
3. Stop and reset the mongo container and delete the database folder (`./musare.sh reset mongo`)
    - Note: if your MongoDB database folder is not the `.db` folder inside the main Musare folder, you'll have to delete this folder yourself.
4. Change the MongoDB version inside your .env file.
5. Start the mongo container (`./musare.sh start mongo`)
6. Import your backup of MongoDB (`./musare.sh restore`)
    - Note: backups are stored inside the backups folder by default.
7. Start the backend (`./musare.sh start backend`)

## Non-Docker

### Instructions
1. Stop your backend
2. Make a backup of MongoDB
3. Stop and reset MongoDB
4. Upgrade/downgrade MongoDB
5. Start MongoDB
6. Restore your MongoDB backup
7. Start your backend
