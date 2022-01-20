/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		songIds: []
	},
	getters: {},
	actions: {
		editSongs: ({ commit }, songIds) => commit("editSongs", songIds)
	},
	mutations: {
		editSongs(state, songIds) {
			state.songIds = songIds;
		}
	}
};
