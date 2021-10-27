# Technical Overview

## Our Stack

- NodeJS
- MongoDB
- Redis
- Nginx (not required)
- VueJS

### Frontend

The frontend is a [vue-cli](https://github.com/vuejs/vue-cli) generated, [vue-loader](https://github.com/vuejs/vue-loader) single page app, that's served over Nginx or Express. The Nginx server not only serves the frontend, but can also serve as a load balancer for requests going to the backend.

### Backend

The backend is a scalable NodeJS / Redis / MongoDB app. User sessions are stored in a central Redis server. All data is stored in a central MongoDB server. The Redis and MongoDB servers are replicated to several secondary nodes, which can become the primary node if the current primary node goes down.

We currently only utilize 1 backend, 1 MongoDB server and 1 Redis server running for production, though it is relatively easy to expand.

