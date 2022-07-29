/* eslint no-param-reassign: 0 */

import { defineStore } from "pinia";

// TODO fix/decide eslint rule properly
// eslint-disable-next-line
export const useEditSongStore = props => {
	const { modalUuid } = props;
	return defineStore(`editSong-${modalUuid}`, {
		state: () => ({
			video: {
				player: null,
				paused: true,
				playerReady: false,
				autoPlayed: false,
				currentTime: 0,
				playbackRate: 1
			},
			youtubeId: null,
			song: {},
			originalSong: {},
			reports: [],
			tab: "discogs",
			newSong: false,
			prefillData: {}
		}),
		actions: {
			init({ song }) {
				this.editSong(song);
			},
			showTab(tab) {
				this.tab = tab;
			},
			editSong(song) {
				this.newSong = !!song.newSong || !song._id;
				this.youtubeId = song.youtubeId || null;
				this.prefillData = song.prefill ? song.prefill : {};
			},
			setSong(song) {
				if (song.discogs === undefined) song.discogs = null;
				this.originalSong = JSON.parse(JSON.stringify(song));
				this.song = JSON.parse(JSON.stringify(song));
				this.newSong = !song._id;
				this.youtubeId = song.youtubeId;
			},
			updateOriginalSong(song) {
				this.originalSong = JSON.parse(JSON.stringify(song));
			},
			resetSong(youtubeId) {
				if (this.youtubeId === youtubeId) this.youtubeId = "";
				if (this.song && this.song.youtubeId === youtubeId)
					this.song = {};
				if (
					this.originalSong &&
					this.originalSong.youtubeId === youtubeId
				)
					this.originalSong = {};
			},
			stopVideo() {
				if (this.video.player && this.video.player.pauseVideo) {
					this.video.player.pauseVideo();
					this.video.player.seekTo(0);
				}
			},
			hardStopVideo() {
				if (this.video.player && this.video.player.stopVideo) {
					this.video.player.stopVideo();
				}
			},
			loadVideoById(id, skipDuration) {
				this.song.duration = -1;
				this.video.player.loadVideoById(id, skipDuration);
			},
			pauseVideo(status) {
				if (
					(this.video.player && this.video.player.pauseVideo) ||
					this.video.playVideo
				) {
					if (status) this.video.player.pauseVideo();
					else this.video.player.playVideo();
				}
				this.video.paused = status;
			},
			updateSongField(data) {
				this.song[data.field] = data.value;
			},
			selectDiscogsInfo(discogsInfo) {
				this.song.discogs = discogsInfo;
			},
			updateReports(reports) {
				this.reports = reports;
			},
			resolveReport(reportId) {
				this.reports = this.reports.filter(
					report => report._id !== reportId
				);
			},
			updateYoutubeId(youtubeId) {
				this.song.youtubeId = youtubeId;
				this.loadVideoById(youtubeId, 0);
			},
			updateTitle(title) {
				this.song.title = title;
			},
			updateThumbnail(thumbnail) {
				this.song.thumbnail = thumbnail;
			},
			setPlaybackRate(rate) {
				if (rate) {
					this.video.playbackRate = rate;
					this.video.player.setPlaybackRate(rate);
				} else if (
					this.video.player.getPlaybackRate() !== undefined &&
					this.video.playbackRate !==
						this.video.player.getPlaybackRate()
				) {
					this.video.player.setPlaybackRate(this.video.playbackRate);
					this.video.playbackRate =
						this.video.player.getPlaybackRate();
				}
			},

			getCurrentTime(fixedVal) {
				// new Promise(resolve => {
				// 	commit("getCurrentTime", fixedVal);
				// 	resolve(this.video.currentTime);
				// }),
				// 	if (!this.playerReady) this.video.currentTime = 0;
				// else {
				// 	Promise.resolve(this.video.player.getCurrentTime()).then(
				// 		time => {
				// 			if (fixedVal)
				// 				Promise.resolve(time.toFixed(fixedVal)).then(
				// 					fixedTime => {
				// 						this.video.currentTime = fixedTime;
				// 					}
				// 				);
				// 			else this.video.currentTime = time;
				// 		}
				// 	);
				// }
			}
		}
	})();
};
