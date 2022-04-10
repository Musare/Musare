/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		songIds: [],
		songPrefillData: {}
	},
	getters: {},
	actions: {
		init: ({ commit }, data) => commit("init", data)
		// resetSongs: ({ commit }) => commit("resetSongs")
	},
	mutations: {
		init(state, { songs }) {
			state.songIds = songs.map(song => song.songId);
			state.songPrefillData = Object.fromEntries(
				songs.map(song => [
					song.songId,
					song.prefill ? song.prefill : {}
				])
			);
		}
		// resetSongs(state) {
		// 	state.songIds = [];
		// 	state.songPrefillData = {};
		// }
	}
};
