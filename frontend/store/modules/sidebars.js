/* eslint no-param-reassign: 0 */

const state = {
	sidebars: {
		station: {
			songslist: false,
			users: false,
			playlist: false
		}
	},
	currentlyActive: {}
};

const getters = {};

const actions = {
	toggleSidebar: ({ commit }, data) => {
		commit("toggleSidebar", data);
	},
	openSidebar: ({ commit }, data) => {
		commit("openSidebar", data);
	},
	closeCurrentSidebar: ({ commit }) => {
		commit("closeCurrentSidebar");
	}
};

const mutations = {
	toggleSidebar(state, data) {
		const { sector, sidebar } = data;

		if (
			state.currentlyActive.sidebar &&
			state.currentlyActive.sidebar !== sidebar
		) {
			state.sidebars[state.currentlyActive.sector][
				state.currentlyActive.sidebar
			] = false;
			state.currentlyActive = {};
		}

		state.sidebars[sector][sidebar] = !state.sidebars[sector][sidebar];

		if (state.sidebars[sector][sidebar])
			state.currentlyActive = { sector, sidebar };
	},
	openSidebar(state, data) {
		const { sector, sidebar } = data;
		state.sidebars[sector][sidebar] = true;
		state.currentlyActive = { sector, sidebar };
	},
	closeCurrentSidebar(state) {
		const { sector, sidebar } = state.currentlyActive;
		state.sidebars[sector][sidebar] = false;
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
