# MusareNode
Musare in NodeJS, Express, SocketIO and VueJS.

## Requirements
 * [Docker](https://www.docker.com/)

## Getting Started
Once you've installed the required tools:

1. `git clone https://github.com/MusareNode/MusareNode.git`
2. `cd MusareNode`
3. `cp backend/config/template.json backend/config/default.json`

  > The `secret` key can be whatever. It's used by express's session module. The `apis.youtube.key` value can be obtained by setting up a [YouTube API Key](https://developers.google.com/youtube/v3/getting-started).

4. `docker-compose build`
5. `docker-compose up`

This will ensure that the services we've created start up correctly.

Once this is done you should be able to access Musare in your local browser at [localhost](http://localhost:8080/).

If you are using Docker ToolBox, you will access Musare at `192.168.99.100` instead of `localhost` or `127.0.0.1`.
