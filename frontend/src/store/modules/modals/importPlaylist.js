/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		editImportedSongs: false
	},
	getters: {},
	actions: {
		updateEditImportedSongs: ({ commit }, editImportedSongs) =>
			commit("updateEditImportedSongs", editImportedSongs)
	},
	mutations: {
		updateEditImportedSongs(state, editImportedSongs) {
			state.editImportedSongs = editImportedSongs;
		}
	}
};
