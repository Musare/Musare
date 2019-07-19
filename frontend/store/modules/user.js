const state = {};
const getters = {};
const actions = {};
const mutations = {};

const modules = {
	playlists: {
		namespaced: true,
		state: {
			editing: ""
		},
		getters: {},
		actions: {
			editPlaylist: ({ commit }, id) => commit("editPlaylist", id)
		},
		mutations: {
			editPlaylist(state, id) {
				state.editing = id;
			}
		}
	}
};

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations,
	modules
};
