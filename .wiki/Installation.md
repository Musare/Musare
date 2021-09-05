# Installation

## Docker

### Dependencies
- [Git](https://github.com/git-guides/install-git)
- [Docker](https://docs.docker.com/get-docker/)
- [docker-compose](https://docs.docker.com/compose/install/)

### Instructions
1. `git clone https://github.com/Musare/MusareNode.git`
2. `cd MusareNode`
3. `cp backend/config/template.json backend/config/default.json` and configure as per [Configuration](./Configuration.md#Backend)
4. `cp frontend/dist/config/template.json frontend/dist/config/default.json` and configure as per [Configuration](./Configuration.md#Frontend)
5. `cp .env.example .env` and configure as per [Configuration](./Configuration.md#Docker-Environment).
6. `./musare.sh build`
7. `./musare.sh start`
