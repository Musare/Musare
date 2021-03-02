/* eslint no-param-reassign: 0 */

const state = {
	modals: {
		header: {
			login: false,
			register: false
		},
		home: {
			createCommunityStation: false
		},
		station: {
			addSongToQueue: false,
			editPlaylist: false,
			createPlaylist: false,
			editStation: false,
			report: false
		},
		admin: {
			editNews: false,
			editUser: false,
			editSong: false,
			editStation: false,
			editPlaylist: false,
			viewReport: false,
			viewPunishment: false
		}
	},
	currentlyActive: []
};

const getters = {};

const actions = {
	closeModal: async ({ commit }, data) => {
		if (data.modal === "register") {
			const recaptchaEnabled = await lofig.get("recaptcha.enabled");
			if (recaptchaEnabled) window.location.reload();
		}

		commit("closeModal", data);
		commit("closeCurrentModal");
	},
	openModal: ({ commit }, data) => {
		commit("openModal", data);
	},
	closeCurrentModal: ({ commit }) => {
		commit("closeCurrentModal");
	}
};

const mutations = {
	closeModal(state, data) {
		state.modals[data.sector][data.modal] = false;
	},
	openModal(state, data) {
		state.modals[data.sector][data.modal] = true;
		state.currentlyActive.unshift(data);
	},
	closeCurrentModal(state) {
		const { sector, modal } = state.currentlyActive[0];
		state.modals[sector][modal] = false;

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
