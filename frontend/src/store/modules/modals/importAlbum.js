/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		discogsAlbum: {},
		originalPlaylistSongs: [],
		playlistSongs: [],
		editingSongs: false,
		discogsTab: "search",
		prefillDiscogs: false
	},
	getters: {},
	actions: {
		init: ({ commit }, data) => commit("init", data),
		showDiscogsTab: ({ commit }, tab) => commit("showDiscogsTab", tab),
		selectDiscogsAlbum: ({ commit }, discogsAlbum) =>
			commit("selectDiscogsAlbum", discogsAlbum),
		toggleDiscogsAlbum: ({ commit }) => {
			commit("toggleDiscogsAlbum");
		},
		updatePlaylistSongs: ({ commit }, playlistSongs) =>
			commit("updatePlaylistSongs", playlistSongs),
		updateEditingSongs: ({ commit }, editingSongs) =>
			commit("updateEditingSongs", editingSongs),
		resetPlaylistSongs: ({ commit }) => commit("resetPlaylistSongs"),
		updatePrefillDiscogs: ({ commit }, updatedPrefill) =>
			commit("updatePrefillDiscogs", updatedPrefill),
		updatePlaylistSong: ({ commit }, updatedSong) =>
			commit("updatePlaylistSong", updatedSong)
	},
	mutations: {
		init(state, { songs }) {
			state.originalPlaylistSongs = JSON.parse(JSON.stringify(songs));
			state.playlistSongs = JSON.parse(JSON.stringify(songs));
		},
		showDiscogsTab(state, tab) {
			state.discogsTab = tab;
		},
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
		},
		updatePrefillDiscogs(state, updatedPrefill) {
			state.prefillDiscogs = updatedPrefill;
		},
		updatePlaylistSong(state, updatedSong) {
			state.playlistSongs.forEach((song, index) => {
				if (song._id === updatedSong._id)
					state.playlistSongs[index] = updatedSong;
			});
			state.originalPlaylistSongs.forEach((song, index) => {
				if (song._id === updatedSong._id)
					state.originalPlaylistSongs[index] = updatedSong;
			});
		}
	}
};
