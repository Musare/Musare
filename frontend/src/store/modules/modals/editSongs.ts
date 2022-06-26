/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		youtubeIds: [],
		songPrefillData: {}
	},
	getters: {},
	actions: {
		init: ({ commit }, data) => commit("init", data)
		// resetSongs: ({ commit }) => commit("resetSongs")
	},
	mutations: {
		init(state, { songs }) {
			state.youtubeIds = songs.map(song => song.youtubeId);
			state.songPrefillData = Object.fromEntries(
				songs.map(song => [
					song.youtubeId,
					song.prefill ? song.prefill : {}
				])
			);
		}
		// resetSongs(state) {
		// 	state.youtubeIds = [];
		// 	state.songPrefillData = {};
		// }
	}
};
