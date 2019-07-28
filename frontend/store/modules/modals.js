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
		commit("closeModal", data);
	},
	openModal: ({ commit }, data) => {
		commit("openModal", data);
	},
	toggleModal: ({ commit }, data) => {
		commit("toggleModal", data);
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
	toggleModal(state, data) {
		const { sector, modal } = data;
		state.modals[sector][modal] = !state.modals[sector][modal];
		if (state.modals[sector][modal])
			state.currentlyActive = { sector, modal };
		else state.currentlyActive = {};
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
