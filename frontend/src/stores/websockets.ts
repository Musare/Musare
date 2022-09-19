import { defineStore } from "pinia";
import SocketHandler from "@/classes/SocketHandler.class";

export const useWebsocketsStore = defineStore("websockets", {
	state: () => ({
		socket: <SocketHandler>{
			dispatcher: {}
		}
	}),
	actions: {
		createSocket(): Promise<SocketHandler> {
			return new Promise((resolve, reject) => {
				lofig
					.get("backend.websocketsDomain")
					.then(websocketsDomain => {
						const { listeners } = this.socket.dispatcher;

						this.socket = new SocketHandler(websocketsDomain);

						// only executes if the websocket object is being replaced
						if (listeners) {
							// for each listener type
							Object.keys(listeners).forEach(listenerType =>
								// for each callback previously present for the listener type
								listeners[listenerType].forEach(element => {
									// add the listener back after the websocket object is reset
									this.socket.dispatcher.addEventListener(
										listenerType,
										element.cb
									);
								})
							);
						}

						resolve(this.socket);
					})
					.catch(err => reject(err));
			});
		}
	},
	getters: {
		getSocket() {
			return this.socket;
		}
	}
});
