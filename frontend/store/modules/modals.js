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
			editPlaylist: false,
			addSongToPlaylist: false,
			editStation: false,
			report: false
		},
		admin: {
			editUser: false,
			editSong: false,
			viewPunishment: false
		}
	},
	currentlyActive: {}
};

const getters = {};

const actions = {
	toggleModal: ({ commit }, data) => {
		commit("toggleModal", data);
	},
	closeCurrentModal: ({ commit }) => {
		commit("closeCurrentModal");
	}
};

const mutations = {
	toggleModal(state, data) {
		const { sector, modal } = data;
		state.modals[sector][modal] = !state.modals[sector][modal];
		if (state.modals[sector][modal]) state.currentlyActive = { sector, modal };
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
