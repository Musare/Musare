/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		originalStation: {},
		station: {},
		includedPlaylists: [],
		excludedPlaylists: [],
		songsList: [],
		stationPaused: true,
		currentSong: {}
	},
	getters: {},
	actions: {
		editStation: ({ commit }, station) => {
			commit("editStation", station);
		},
		setIncludedPlaylists: ({ commit }, includedPlaylists) => {
			commit("setIncludedPlaylists", includedPlaylists);
		},
		setExcludedPlaylists: ({ commit }, excludedPlaylists) => {
			commit("setExcludedPlaylists", excludedPlaylists);
		},
		clearStation: ({ commit }) => {
			commit("clearStation");
		},
		updateSongsList: ({ commit }, songsList) => {
			commit("updateSongsList", songsList);
		},
		repositionSongInList: ({ commit }, song) => {
			commit("repositionSongInList", song);
		},
		updateStationPaused: ({ commit }, stationPaused) => {
			commit("updateStationPaused", stationPaused);
		},
		updateCurrentSong: ({ commit }, currentSong) => {
			commit("updateCurrentSong", currentSong);
		}
	},
	mutations: {
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
			state.originalStation = null;
			state.station = null;
		},
		updateSongsList(state, songsList) {
			state.songsList = songsList;
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
