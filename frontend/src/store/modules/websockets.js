/* eslint no-param-reassign: 0 */

const state = {
	socket: {
		dispatcher: {}
	}
};

const getters = {
	getSocket: state => state.socket
};

const actions = {
	createSocket: ({ commit }, socket) => commit("createSocket", socket)
};

const mutations = {
	createSocket(state, socket) {
		const { listeners } = state.socket.dispatcher;
		state.socket = socket;

		// only executes if the websocket object is being replaced
		if (listeners) {
			// for each listener type
			Object.keys(listeners).forEach(listenerType =>
				// for each callback previously present for the listener type
				listeners[listenerType].forEach(element => {
					// add the listener back after the websocket object is reset
					state.socket.dispatcher.addEventListener(
						listenerType,
						element.cb
					);
				})
			);
		}
	}
};

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
};
