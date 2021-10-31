/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		tab: "settings",
		originalStation: {},
		station: {},
		stationPlaylist: { songs: [] },
		includedPlaylists: [],
		excludedPlaylists: [],
		songsList: [],
		stationPaused: true,
		currentSong: {}
	},
	getters: {},
	actions: {
		showTab: ({ commit }, tab) => commit("showTab", tab),
		editStation: ({ commit }, station) => commit("editStation", station),
		setIncludedPlaylists: ({ commit }, includedPlaylists) =>
			commit("setIncludedPlaylists", includedPlaylists),
		setExcludedPlaylists: ({ commit }, excludedPlaylists) =>
			commit("setExcludedPlaylists", excludedPlaylists),
		clearStation: ({ commit }) => commit("clearStation"),
		updateSongsList: ({ commit }, songsList) =>
			commit("updateSongsList", songsList),
		updateStationPlaylist: ({ commit }, stationPlaylist) =>
			commit("updateStationPlaylist", stationPlaylist),
		repositionSongInList: ({ commit }, song) =>
			commit("repositionSongInList", song),
		updateStationPaused: ({ commit }, stationPaused) =>
			commit("updateStationPaused", stationPaused),
		updateCurrentSong: ({ commit }, currentSong) =>
			commit("updateCurrentSong", currentSong)
	},
	mutations: {
		showTab(state, tab) {
			state.tab = tab;
		},
		editStation(state, station) {
			state.originalStation = JSON.parse(JSON.stringify(station));
			state.station = JSON.parse(JSON.stringify(station));
		},
		setIncludedPlaylists(state, includedPlaylists) {
			state.includedPlaylists = JSON.parse(
				JSON.stringify(includedPlaylists)
			);
		},
		setExcludedPlaylists(state, excludedPlaylists) {
			state.excludedPlaylists = JSON.parse(
				JSON.stringify(excludedPlaylists)
			);
		},
		clearStation(state) {
			state.originalStation = {};
			state.station = {};
			state.stationPlaylist = { songs: [] };
			state.includedPlaylists = [];
			state.excludedPlaylists = [];
			state.songsList = [];
			state.stationPaused = true;
			state.currentSong = {};
		},
		updateSongsList(state, songsList) {
			state.songsList = songsList;
		},
		updateStationPlaylist(state, stationPlaylist) {
			state.stationPlaylist = stationPlaylist;
		},
		repositionSongInList(state, song) {
			if (
				state.songsList[song.newIndex] &&
				state.songsList[song.newIndex].youtubeId === song.youtubeId
			)
				return;

			const { songsList } = state;

			songsList.splice(
				song.newIndex,
				0,
				songsList.splice(song.oldIndex, 1)[0]
			);

			state.songsList = songsList;
		},
		updateStationPaused(state, stationPaused) {
			state.stationPaused = stationPaused;
		},
		updateCurrentSong(state, currentSong) {
			state.currentSong = currentSong;
		}
	}
};
