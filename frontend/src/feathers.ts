import { createClient } from "musare-server"
import socketio from "@feathersjs/socketio-client"
import io from "socket.io-client"
import { createPiniaClient } from "feathers-pinia"
import { pinia } from "./pinia";

const socket = io(`${document.location.protocol}//${document.location.host}`, {
    path: "/api/socket.io",
    transports: ["websocket"]
})

const feathersClient = createClient(socketio(socket), { storage: window.localStorage })

export const api = createPiniaClient(feathersClient, {
    pinia,
    idField: 'id',
    // optional
    ssr: false,
    whitelist: [],
    paramsForServer: [],
    skipGetIfExists: true,
    customSiftOperators: {},
    setupInstance(data) {
      return data
    },
    customizeStore(defaultStore) {
      return {}
    },
    services: {},
});

console.log(111, feathersClient, api);
