/* eslint no-param-reassign: 0 */

// import Vue from "vue";
// import admin from "@/api/admin/index";

export default {
	namespaced: true,
	state: {
		video: {
			player: null,
			paused: true,
			playerReady: false,
			autoPlayed: false,
			currentTime: 0
		},
		song: {},
		originalSong: {}
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
		updateSongField: ({ commit }, data) => commit("updateSongField", data),
		selectDiscogsInfo: ({ commit }, discogsInfo) =>
			commit("selectDiscogsInfo", discogsInfo)
	},
	mutations: {
		editSong(state, song) {
			if (song.discogs === undefined) song.discogs = null;
			state.originalSong = JSON.parse(JSON.stringify(song));
			state.song = { ...song };
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
		updateSongField(state, data) {
			state.song[data.field] = data.value;
		},
		selectDiscogsInfo(state, discogsInfo) {
			state.song.discogs = discogsInfo;
		}
	}
};
