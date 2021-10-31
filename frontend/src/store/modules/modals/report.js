/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		song: {}
	},
	actions: {
		reportSong: ({ commit }, song) => commit("reportSong", song)
	},
	mutations: {
		reportSong(state, song) {
			state.song = song;
		}
	}
};
