import { defineStore } from "pinia";
import SocketHandler from "@/classes/SocketHandler.class";

export const useWebsocketsStore = defineStore("websockets", {
	state: (): {
		socket: SocketHandler;
	} => ({
		socket: {
			dispatcher: {}
		}
	}),
	actions: {
		createSocket(): Promise<SocketHandler> {
			return new Promise(resolve => {
				const { listeners } = this.socket.dispatcher;

				this.socket = new SocketHandler();

				// only executes if the websocket object is being replaced
				if (listeners) {
					// for each listener type
					Object.keys(listeners).forEach(listenerType =>
						// for each callback previously present for the listener type
						listeners[listenerType].forEach(element => {
							// add the listener back after the websocket object is reset
							this.socket.dispatcher.addEventListener(
								listenerType,
								element.cb,
								element.options
							);
						})
					);
				}

				resolve(this.socket);
			});
		}
	},
	getters: {
		getSocket(): SocketHandler {
			return this.socket;
		}
	}
});
