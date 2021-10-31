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
			addSongToPlaylist: false,
			editStation: false,
			report: false
		},
		admin: {
			editNews: false,
			editUser: false,
			editSong: false,
			viewReport: false,
			viewPunishment: false
		}
	},
	currentlyActive: {}
};

const getters = {};

const actions = {
	closeModal: ({ commit }, data) => {
		if (data.modal === "register") window.location.reload();
		commit("closeModal", data);
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
		const { sector, modal } = data;
		state.modals[sector][modal] = false;
	},
	openModal(state, data) {
		const { sector, modal } = data;
		state.modals[sector][modal] = true;
		state.currentlyActive = { sector, modal };
	},
	closeCurrentModal(state) {
		const { sector, modal } = state.currentlyActive;
		state.modals[sector][modal] = false;
		state.currentlyActive = {};
	}
};

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
};
