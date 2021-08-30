/* eslint no-param-reassign: 0 */

const state = {
	station: {},
	partyPlaylists: [],
	editing: {},
	userCount: 0,
	users: {
		loggedIn: [],
		loggedOut: []
	},
	currentSong: {},
	previousSong: null,
	nextSong: null,
	songsList: [],
	stationPaused: true,
	localPaused: false,
	noSong: true,
	includedPlaylists: [],
	excludedPlaylists: []
};

const getters = {};

const actions = {
	joinStation: ({ commit }, station) => {
		commit("joinStation", station);
	},
	leaveStation: ({ commit }, station) => {
		commit("leaveStation", station);
	},
	editStation: ({ commit }, station) => {
		commit("editStation", station);
	},
	updateUserCount: ({ commit }, userCount) => {
		commit("updateUserCount", userCount);
	},
	updateUsers: ({ commit }, users) => {
		commit("updateUsers", users);
	},
	updateCurrentSong: ({ commit }, currentSong) => {
		commit("updateCurrentSong", currentSong);
	},
	updatePreviousSong: ({ commit }, previousSong) => {
		commit("updatePreviousSong", previousSong);
	},
	updateNextSong: ({ commit }, nextSong) => {
		commit("updateNextSong", nextSong);
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
	updateLocalPaused: ({ commit }, localPaused) => {
		commit("updateLocalPaused", localPaused);
	},
	updateNoSong: ({ commit }, noSong) => {
		commit("updateNoSong", noSong);
	},
	updatePartyPlaylists: ({ commit }, playlists) => {
		commit("updatePartyPlaylists", playlists);
	},
	updateIfStationIsFavorited: ({ commit }, { isFavorited }) => {
		commit("updateIfStationIsFavorited", isFavorited);
	},
	setIncludedPlaylists: ({ commit }, includedPlaylists) => {
		commit("setIncludedPlaylists", includedPlaylists);
	},
	setExcludedPlaylists: ({ commit }, excludedPlaylists) => {
		commit("setExcludedPlaylists", excludedPlaylists);
	},
	updateCurrentSongRatings: ({ commit }, songRatings) => {
		commit("updateCurrentSongRatings", songRatings);
	},
	updateOwnCurrentSongRatings: ({ commit }, ownSongRatings) => {
		commit("updateOwnCurrentSongRatings", ownSongRatings);
	},
	updateCurrentSongSkipVotes: (
		{ commit },
		{ skipVotes, skipVotesCurrent }
	) => {
		commit("updateCurrentSongSkipVotes", { skipVotes, skipVotesCurrent });
	}
};

const mutations = {
	joinStation(state, station) {
		state.station = { ...station };
	},
	leaveStation(state) {
		state.station = {};
		state.partyPlaylists = [];
		state.editing = {};
		state.userCount = 0;
		state.users = {
			loggedIn: [],
			loggedOut: []
		};
		state.currentSong = {};
		state.previousSong = null;
		state.nextSong = null;
		state.songsList = [];
		state.stationPaused = true;
		state.localPaused = false;
		state.noSong = true;
		state.includedPlaylists = [];
		state.excludedPlaylists = [];
	},
	editStation(state, station) {
		state.editing = { ...station };
	},
	updateUserCount(state, userCount) {
		state.userCount = userCount;
	},
	updateUsers(state, users) {
		state.users = users;
	},
	updateCurrentSong(state, currentSong) {
		state.currentSong = currentSong;
	},
	updatePreviousSong(state, previousSong) {
		state.previousSong = previousSong;
	},
	updateNextSong(state, nextSong) {
		state.nextSong = nextSong;
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
	updateLocalPaused(state, localPaused) {
		state.localPaused = localPaused;
	},
	updateNoSong(state, noSong) {
		state.noSong = noSong;
	},
	updatePartyPlaylists(state, playlists) {
		state.partyPlaylists = playlists;
	},
	updateIfStationIsFavorited(state, isFavorited) {
		state.station.isFavorited = isFavorited;
	},
	setIncludedPlaylists(state, includedPlaylists) {
		state.includedPlaylists = JSON.parse(JSON.stringify(includedPlaylists));
	},
	setExcludedPlaylists(state, excludedPlaylists) {
		state.excludedPlaylists = JSON.parse(JSON.stringify(excludedPlaylists));
	},
	updateCurrentSongRatings(state, songRatings) {
		state.currentSong.likes = songRatings.likes;
		state.currentSong.dislikes = songRatings.dislikes;
	},
	updateOwnCurrentSongRatings(state, ownSongRatings) {
		state.currentSong.liked = ownSongRatings.liked;
		state.currentSong.disliked = ownSongRatings.disliked;
	},
	updateCurrentSongSkipVotes(state, { skipVotes, skipVotesCurrent }) {
		state.currentSong.skipVotes = skipVotes;
		if (skipVotesCurrent !== null)
			state.currentSong.skipVotesCurrent = skipVotesCurrent;
	}
};

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
};
