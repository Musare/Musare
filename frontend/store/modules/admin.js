/* eslint no-param-reassign: 0 */

import Vue from "vue";
import admin from "../../api/admin/index";

const state = {};
const getters = {};
const actions = {};
const mutations = {};

const modules = {
	songs: {
		namespaced: true,
		state: {
			video: {
				player: null,
				paused: true,
				playerReady: false,
				autoPlayed: false,
				currentTime: 0
			},
			editing: {},
			songs: []
		},
		getters: {},
		actions: {
			editSong: ({ commit }, song) => commit("editSong", song),
			stopVideo: ({ commit }) => commit("stopVideo"),
			loadVideoById: ({ commit }, id, skipDuration) =>
				commit("loadVideoById", id, skipDuration),
			pauseVideo: ({ commit }, status) => commit("pauseVideo", status),
			getCurrentTime: ({ commit, state }, fixedVal) => {
				return new Promise(resolve => {
					commit("getCurrentTime", fixedVal);
					resolve(state.video.currentTime);
				});
			},
			addSong: ({ commit }, song) => commit("addSong", song),
			removeSong: ({ commit }, songId) => commit("removeSong", songId),
			updateSong: ({ commit }, updatedSong) =>
				commit("updateSong", updatedSong),
			updateSongField: ({ commit }, data) =>
				commit("updateSongField", data),
			selectDiscogsInfo: ({ commit }, discogsInfo) =>
				commit("selectDiscogsInfo", discogsInfo)
		},
		mutations: {
			editSong(state, song) {
				if (song.song.discogs === undefined) song.song.discogs = null;
				state.editing = { ...song };
			},
			stopVideo(state) {
				state.video.player.stopVideo();
			},
			loadVideoById(state, id, skipDuration) {
				state.video.player.loadVideoById(id, skipDuration);
			},
			pauseVideo(state, status) {
				if (status) state.video.player.pauseVideo();
				else state.video.player.playVideo();
				state.video.paused = status;
			},
			getCurrentTime(state, fixedVal) {
				if (!state.playerReady) state.video.currentTime = 0;
				else {
					Promise.resolve(state.video.player.getCurrentTime()).then(
						time => {
							if (fixedVal)
								Promise.resolve(time.toFixed(fixedVal)).then(
									fixedTime => {
										state.video.currentTime = fixedTime;
									}
								);
							else state.video.currentTime = time;
						}
					);
				}
			},
			addSong(state, song) {
				state.songs.push(song);
			},
			removeSong(state, songId) {
				state.songs = state.songs.filter(song => {
					return song._id !== songId;
				});
			},
			updateSong(state, updatedSong) {
				state.songs.forEach((song, index) => {
					if (song._id === updatedSong._id)
						Vue.set(state.songs, index, updatedSong);
				});
			},
			updateSongField(state, data) {
				state.editing.song[data.field] = data.value;
			},
			selectDiscogsInfo(state, discogsInfo) {
				state.editing.song.discogs = discogsInfo;
			}
		}
	},
	stations: {
		namespaced: true,
		state: {
			stations: [],
			station: {},
			editing: {}
		},
		getters: {},
		actions: {
			editStation: ({ commit }, station) =>
				commit("editStation", station),
			loadStations: ({ commit }, stations) =>
				commit("loadStations", stations),
			stationRemoved: ({ commit }, stationId) =>
				commit("stationRemoved", stationId),
			stationAdded: ({ commit }, station) =>
				commit("stationAdded", station)
		},
		mutations: {
			editStation(state, station) {
				state.station = station;
				state.editing = JSON.parse(JSON.stringify(station));
			},
			loadStations(state, stations) {
				state.stations = stations;
			},
			stationAdded(state, station) {
				state.stations.push(station);
			},
			stationRemoved(state, stationId) {
				state.stations = state.stations.filter(station => {
					return station._id !== stationId;
				});
			}
		}
	},
	reports: {
		namespaced: true,
		state: {
			report: {}
		},
		getters: {},
		actions: {
			viewReport: ({ commit }, report) => commit("viewReport", report),
			/* eslint-disable-next-line no-unused-vars */
			resolveReport: ({ commit }, reportId) => {
				return new Promise((resolve, reject) => {
					return admin.reports
						.resolve(reportId)
						.then(res => {
							return resolve(res);
						})
						.catch(err => {
							return reject(new Error(err.message));
						});
				});
			}
		},
		mutations: {
			viewReport(state, report) {
				state.report = report;
			}
		}
	},
	punishments: {
		namespaced: true,
		state: {
			punishment: {}
		},
		getters: {},
		actions: {
			viewPunishment: ({ commit }, punishment) =>
				commit("viewPunishment", punishment)
		},
		mutations: {
			viewPunishment(state, punishment) {
				state.punishment = punishment;
			}
		}
	},
	users: {
		namespaced: true,
		state: {
			editing: {}
		},
		getters: {},
		actions: {
			editUser: ({ commit }, user) => commit("editUser", user)
		},
		mutations: {
			editUser(state, user) {
				state.editing = user;
			}
		}
	},
	news: {
		namespaced: true,
		state: {
			editing: {},
			news: []
		},
		getters: {},
		actions: {
			editNews: ({ commit }, news) => commit("editNews", news),
			addChange: ({ commit }, data) => commit("addChange", data),
			removeChange: ({ commit }, data) => commit("removeChange", data),
			addNews: ({ commit }, news) => commit("addNews", news),
			removeNews: ({ commit }, newsId) => commit("removeNews", newsId),
			updateNews: ({ commit }, updatedNews) =>
				commit("updateNews", updatedNews)
		},
		mutations: {
			editNews(state, news) {
				state.editing = news;
			},
			addChange(state, data) {
				state.editing[data.type].push(data.change);
			},
			removeChange(state, data) {
				state.editing[data.type].splice(data.index, 1);
			},
			addNews(state, news) {
				state.news.push(news);
			},
			removeNews(state, newsId) {
				state.news = state.news.filter(news => {
					return news._id !== newsId;
				});
			},
			updateNews(state, updatedNews) {
				state.news.forEach((news, index) => {
					if (news._id === updatedNews._id)
						Vue.set(state.news, index, updatedNews);
				});
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
