/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		tab: "settings",
		station: {},
		stationPlaylist: { songs: [] },
		autofill: [],
		blacklist: [],
		songsList: [],
		stationPaused: true,
		currentSong: {}
	},
	getters: {},
	actions: {
		showTab: ({ commit }, tab) => commit("showTab", tab),
		editStation: ({ commit }, station) => commit("editStation", station),
		setAutofillPlaylists: ({ commit }, autofillPlaylists) =>
			commit("setAutofillPlaylists", autofillPlaylists),
		setBlacklist: ({ commit }, blacklist) =>
			commit("setBlacklist", blacklist),
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
			commit("updateCurrentSong", currentSong),
		updateStation: ({ commit }, station) => commit("updateStation", station)
	},
	mutations: {
		showTab(state, tab) {
			state.tab = tab;
		},
		editStation(state, station) {
			state.station = JSON.parse(JSON.stringify(station));
		},
		setAutofillPlaylists(state, autofillPlaylists) {
			state.autofill = JSON.parse(JSON.stringify(autofillPlaylists));
		},
		setBlacklist(state, blacklist) {
			state.blacklist = JSON.parse(JSON.stringify(blacklist));
		},
		clearStation(state) {
			state.station = {};
			state.stationPlaylist = { songs: [] };
			state.autofill = [];
			state.blacklist = [];
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
		},
		updateStation(state, station) {
			state.station = { ...state.station, ...station };
		}
	}
};
