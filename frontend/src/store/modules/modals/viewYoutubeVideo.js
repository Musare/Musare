/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		videoId: null,
		video: {},
		player: {
			error: false,
			errorMessage: "",
			player: null,
			paused: true,
			playerReady: false,
			autoPlayed: false,
			duration: "0.000",
			currentTime: 0,
			playbackRate: 1,
			videoNote: "",
			volume: 0,
			muted: false,
			showRateDropdown: false
		}
	},
	getters: {},
	actions: {
		init: ({ commit }, data) => commit("init", data),
		viewYoutubeVideo: ({ commit }, video) =>
			commit("viewYoutubeVideo", video),
		updatePlayer: ({ commit }, player) => commit("updatePlayer", player),
		stopVideo: ({ commit }) => commit("stopVideo"),
		loadVideoById: ({ commit }, id) => commit("loadVideoById", id),
		pauseVideo: ({ commit }, status) => commit("pauseVideo", status),
		setPlaybackRate: ({ commit }, rate) => commit("setPlaybackRate", rate)
	},
	mutations: {
		init(state, { videoId }) {
			state.videoId = videoId;
		},
		viewYoutubeVideo(state, video) {
			state.video = video;
		},
		updatePlayer(state, player) {
			console.log(1212, player, state.player);
			// state.player = player;
			state.player = Object.assign(state.player, player);
			console.log(1313, state.player);
		},
		stopVideo(state) {
			if (state.player.player && state.player.player.pauseVideo) {
				state.player.player.pauseVideo();
				state.player.player.seekTo(0);
			}
		},
		loadVideoById(state, id) {
			state.player.player.loadVideoById(id);
		},
		pauseVideo(state, status) {
			if (
				(state.player.player && state.player.player.pauseVideo) ||
				state.player.playVideo
			) {
				if (status) state.player.player.pauseVideo();
				else state.player.player.playVideo();
			}
			state.player.paused = status;
		},
		setPlaybackRate(state, rate) {
			if (rate) {
				state.player.playbackRate = rate;
				state.player.player.setPlaybackRate(rate);
			} else if (
				state.player.player.getPlaybackRate() !== undefined &&
				state.player.playbackRate !==
					state.player.player.getPlaybackRate()
			) {
				state.player.player.setPlaybackRate(state.player.playbackRate);
				state.player.playbackRate =
					state.player.player.getPlaybackRate();
			}
		}
	}
};
