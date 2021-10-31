/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		discogsAlbum: {},
		originalPlaylistSongs: [],
		playlistSongs: [],
		editingSongs: false
	},
	getters: {},
	actions: {
		selectDiscogsAlbum: ({ commit }, discogsAlbum) =>
			commit("selectDiscogsAlbum", discogsAlbum),
		toggleDiscogsAlbum: ({ commit }) => {
			commit("toggleDiscogsAlbum");
		},
		setPlaylistSongs: ({ commit }, playlistSongs) =>
			commit("setPlaylistSongs", playlistSongs),
		updatePlaylistSongs: ({ commit }, playlistSongs) =>
			commit("updatePlaylistSongs", playlistSongs),
		updateEditingSongs: ({ commit }, editingSongs) =>
			commit("updateEditingSongs", editingSongs),
		resetPlaylistSongs: ({ commit }) => commit("resetPlaylistSongs")
	},
	mutations: {
		selectDiscogsAlbum(state, discogsAlbum) {
			state.discogsAlbum = JSON.parse(JSON.stringify(discogsAlbum));
			if (state.discogsAlbum && state.discogsAlbum.tracks) {
				state.tracks = state.discogsAlbum.tracks.map(track => ({
					...track,
					songs: []
				}));
			}
		},
		toggleDiscogsAlbum(state) {
			state.discogsAlbum.expanded = !state.discogsAlbum.expanded;
		},
		setPlaylistSongs(state, playlistSongs) {
			state.originalPlaylistSongs = JSON.parse(
				JSON.stringify(playlistSongs)
			);
			state.playlistSongs = JSON.parse(JSON.stringify(playlistSongs));
		},
		updatePlaylistSongs(state, playlistSongs) {
			state.playlistSongs = JSON.parse(JSON.stringify(playlistSongs));
		},
		updateEditingSongs(state, editingSongs) {
			state.editingSongs = editingSongs;
		},
		resetPlaylistSongs(state) {
			state.playlistSongs = JSON.parse(
				JSON.stringify(state.originalPlaylistSongs)
			);
		}
	}
};
