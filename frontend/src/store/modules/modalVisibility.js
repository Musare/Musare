/* eslint no-param-reassign: 0 */
import ws from "@/ws";

const state = {
	modals: {
		manageStation: false,
		login: false,
		register: false,
		createCommunityStation: false,
		requestSong: false,
		editPlaylist: false,
		createPlaylist: false,
		report: false,
		removeAccount: false,
		editNews: false,
		editUser: false,
		editSong: false,
		viewReport: false,
		viewPunishment: false
	},
	currentlyActive: []
};

const getters = {};

const actions = {
	closeModal: ({ commit }, modal) => {
		if (modal === "register")
			lofig.get("recaptcha.enabled").then(enabled => {
				if (enabled) window.location.reload();
			});

		commit("closeModal", modal);
		commit("closeCurrentModal");
	},
	openModal: ({ commit }, modal) => {
		commit("openModal", modal);
	},
	closeCurrentModal: ({ commit }) => {
		commit("closeCurrentModal");
	}
};

const mutations = {
	closeModal(state, modal) {
		state.modals[modal] = false;
	},
	openModal(state, modal) {
		state.modals[modal] = true;
		state.currentlyActive.unshift(modal);
	},
	closeCurrentModal(state) {
		// remove any websocket listeners for the modal
		ws.removeModalListeners(state.currentlyActive[0]);

		state.modals[state.currentlyActive[0]] = false;
		state.currentlyActive.shift();
	}
};

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
};
