/* eslint no-param-reassign: 0 */
/* eslint-disable import/no-cycle */

import admin from "@/api/admin/index";

const state = {};
const getters = {};
const actions = {};
const mutations = {};

const modules = {
	hiddenSongs: {
		namespaced: true,
		state: {
			songs: []
		},
		getters: {},
		actions: {
			resetSongs: ({ commit }) => commit("resetSongs"),
			addSong: ({ commit }, song) => commit("addSong", song),
			removeSong: ({ commit }, songId) => commit("removeSong", songId),
			updateSong: ({ commit }, updatedSong) =>
				commit("updateSong", updatedSong)
		},
		mutations: {
			resetSongs(state) {
				state.songs = [];
			},
			addSong(state, song) {
				if (!state.songs.find(s => s._id === song._id))
					state.songs.push(song);
			},
			removeSong(state, songId) {
				state.songs = state.songs.filter(song => song._id !== songId);
			},
			updateSong(state, updatedSong) {
				state.songs.forEach((song, index) => {
					if (song._id === updatedSong._id)
						state.songs[index] = updatedSong;
				});
			}
		}
	},
	unverifiedSongs: {
		namespaced: true,
		state: {
			songs: []
		},
		getters: {},
		actions: {
			resetSongs: ({ commit }) => commit("resetSongs"),
			addSong: ({ commit }, song) => commit("addSong", song),
			removeSong: ({ commit }, songId) => commit("removeSong", songId),
			updateSong: ({ commit }, updatedSong) =>
				commit("updateSong", updatedSong)
		},
		mutations: {
			resetSongs(state) {
				state.songs = [];
			},
			addSong(state, song) {
				if (!state.songs.find(s => s._id === song._id))
					state.songs.push(song);
			},
			removeSong(state, songId) {
				state.songs = state.songs.filter(song => song._id !== songId);
			},
			updateSong(state, updatedSong) {
				state.songs.forEach((song, index) => {
					if (song._id === updatedSong._id)
						state.songs[index] = updatedSong;
				});
			}
		}
	},
	verifiedSongs: {
		namespaced: true,
		state: {
			songs: []
		},
		getters: {},
		actions: {
			resetSongs: ({ commit }) => commit("resetSongs"),
			addSong: ({ commit }, song) => commit("addSong", song),
			removeSong: ({ commit }, songId) => commit("removeSong", songId),
			updateSong: ({ commit }, updatedSong) =>
				commit("updateSong", updatedSong)
		},
		mutations: {
			resetSongs(state) {
				state.songs = [];
			},
			addSong(state, song) {
				if (!state.songs.find(s => s._id === song._id))
					state.songs.push(song);
			},
			removeSong(state, songId) {
				state.songs = state.songs.filter(song => song._id !== songId);
			},
			updateSong(state, updatedSong) {
				state.songs.forEach((song, index) => {
					if (song._id === updatedSong._id)
						state.songs[index] = updatedSong;
				});
			}
		}
	},
	stations: {
		namespaced: true,
		state: {
			stations: []
		},
		getters: {},
		actions: {
			loadStations: ({ commit }, stations) =>
				commit("loadStations", stations),
			stationRemoved: ({ commit }, stationId) =>
				commit("stationRemoved", stationId),
			stationAdded: ({ commit }, station) =>
				commit("stationAdded", station)
		},
		mutations: {
			loadStations(state, stations) {
				state.stations = stations;
			},
			stationAdded(state, station) {
				state.stations.push(station);
			},
			stationRemoved(state, stationId) {
				state.stations = state.stations.filter(
					station => station._id !== stationId
				);
			}
		}
	},
	reports: {
		namespaced: true,
		state: {
			reports: []
		},
		getters: {},
		actions: {
			/* eslint-disable-next-line no-unused-vars */
			resolveReport: ({ commit }, reportId) =>
				new Promise((resolve, reject) =>
					admin.reports
						.resolve(reportId)
						.then(res => resolve(res))
						.catch(err => reject(new Error(err.message)))
				),
			indexReports({ commit }, reports) {
				commit("indexReports", reports);
			}
		},
		mutations: {}
	},
	users: {
		namespaced: true,
		state: {},
		getters: {},
		actions: {},
		mutations: {}
	},
	news: {
		namespaced: true,
		state: {
			news: []
		},
		getters: {},
		actions: {
			setNews: ({ commit }, news) => commit("setNews", news),
			addNews: ({ commit }, news) => commit("addNews", news),
			removeNews: ({ commit }, newsId) => commit("removeNews", newsId),
			updateNews: ({ commit }, updatedNews) =>
				commit("updateNews", updatedNews)
		},
		mutations: {
			setNews(state, news) {
				state.news = news;
			},
			addNews(state, news) {
				state.news.push(news);
			},
			removeNews(state, newsId) {
				state.news = state.news.filter(news => news._id !== newsId);
			},
			updateNews(state, updatedNews) {
				state.news.forEach((news, index) => {
					if (news._id === updatedNews._id)
						this.set(state.news, index, updatedNews);
				});
			}
		}
	},
	playlists: {
		namespaced: true,
		state: {
			playlists: []
		},
		getters: {},
		actions: {
			setPlaylists: ({ commit }, playlists) =>
				commit("setPlaylists", playlists),
			addPlaylist: ({ commit }, playlist) =>
				commit("addPlaylist", playlist),
			removePlaylist: ({ commit }, playlistId) =>
				commit("removePlaylist", playlistId),
			addPlaylistSong: ({ commit }, { playlistId, song }) =>
				commit("addPlaylistSong", { playlistId, song }),
			removePlaylistSong: ({ commit }, { playlistId, youtubeId }) =>
				commit("removePlaylistSong", { playlistId, youtubeId }),
			updatePlaylistDisplayName: (
				{ commit },
				{ playlistId, displayName }
			) =>
				commit("updatePlaylistDisplayName", {
					playlistId,
					displayName
				}),
			updatePlaylistPrivacy: ({ commit }, { playlistId, privacy }) =>
				commit("updatePlaylistPrivacy", { playlistId, privacy })
		},
		mutations: {
			setPlaylists(state, playlists) {
				state.playlists = playlists;
			},
			addPlaylist(state, playlist) {
				state.playlists.unshift(playlist);
			},
			removePlaylist(state, playlistId) {
				state.playlists = state.playlists.filter(
					playlist => playlist._id !== playlistId
				);
			},
			addPlaylistSong(state, { playlistId, song }) {
				state.playlists[
					state.playlists.findIndex(
						playlist => playlist._id === playlistId
					)
				].songs.push(song);
			},
			removePlaylistSong(state, { playlistId, youtubeId }) {
				const playlistIndex = state.playlists.findIndex(
					playlist => playlist._id === playlistId
				);
				state.playlists[playlistIndex].songs.splice(
					state.playlists[playlistIndex].songs.findIndex(
						song => song.youtubeId === youtubeId
					),
					1
				);
			},
			updatePlaylistDisplayName(state, { playlistId, displayName }) {
				state.playlists[
					state.playlists.findIndex(
						playlist => playlist._id === playlistId
					)
				].displayName = displayName;
			},
			updatePlaylistPrivacy(state, { playlistId, privacy }) {
				state.playlists[
					state.playlists.findIndex(
						playlist => playlist._id === playlistId
					)
				].privacy = privacy;
			}
		}
	}
};

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations,
	modules
};
