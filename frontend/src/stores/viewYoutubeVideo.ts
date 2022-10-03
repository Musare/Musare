import { defineStore } from "pinia";

export const useViewYoutubeVideoStore = ({
	modalUuid
}: {
	modalUuid: string;
}) =>
	defineStore(`viewYoutubeVideo-${modalUuid}`, {
		state: (): {
			video: {
				_id: string;
				youtubeId: string;
				title: string;
				author: string;
				duration: number;
				uploadedAt?: number;
			};
			player: {
				error: boolean;
				errorMessage: string;
				player: null;
				paused: boolean;
				playerReady: boolean;
				autoPlayed: boolean;
				duration: string;
				currentTime: number;
				playbackRate: number;
				videoNote: string;
				volume: number;
				muted: boolean;
				showRateDropdown: boolean;
			};
		} => ({
			video: {
				_id: null,
				youtubeId: null,
				title: null,
				author: null,
				duration: 0
			},
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
		}),
		actions: {
			viewYoutubeVideo(video) {
				this.video = video;
			},
			updatePlayer(player) {
				this.player = Object.assign(this.player, player);
			},
			stopVideo() {
				if (this.player.player && this.player.player.pauseVideo) {
					this.player.player.pauseVideo();
					this.player.player.seekTo(0);
				}
			},
			loadVideoById(id) {
				this.player.player.loadVideoById(id);
			},
			pauseVideo(status: boolean) {
				if (
					(this.player.player && this.player.player.pauseVideo) ||
					this.player.playVideo
				) {
					if (status) this.player.player.pauseVideo();
					else this.player.player.playVideo();
				}
				this.player.paused = status;
			},
			setPlaybackRate(rate?: number) {
				if (typeof rate === "number") {
					this.player.playbackRate = rate;
					this.player.player.setPlaybackRate(rate);
				} else if (
					this.player.player.getPlaybackRate() !== undefined &&
					this.player.playbackRate !==
						this.player.player.getPlaybackRate()
				) {
					this.player.player.setPlaybackRate(
						this.player.playbackRate
					);
					this.player.playbackRate =
						this.player.player.getPlaybackRate();
				}
			}
		}
	})();
