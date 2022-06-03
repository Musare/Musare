<template>
	<modal title="View YouTube Video">
		<template #body>
			<div v-if="loaded" class="top-section">
				<div class="left-section">
					<p>
						<strong>ID:</strong>
						<span :title="video._id">{{ video._id }}</span>
					</p>
					<p>
						<strong>YouTube ID:</strong>
						<a
							:href="
								'https://www.youtube.com/watch?v=' +
								`${video.youtubeId}`
							"
							target="_blank"
						>
							{{ video.youtubeId }}
						</a>
					</p>
					<p>
						<strong>Title:</strong>
						<span :title="video.title">{{ video.title }}</span>
					</p>
					<p>
						<strong>Author:</strong>
						<span :title="video.author">{{ video.author }}</span>
					</p>
					<p>
						<strong>Duration:</strong>
						<span :title="video.duration">{{
							video.duration
						}}</span>
					</p>
				</div>
				<div class="right-section">
					<song-thumbnail :song="video" class="thumbnail-preview" />
				</div>
			</div>

			<div v-show="loaded" class="player-section">
				<div class="player-container">
					<div :id="`viewYoutubeVideoPlayer-${modalUuid}`" />
				</div>

				<div v-show="player.error" class="player-error">
					<h2>{{ player.errorMessage }}</h2>
				</div>

				<canvas
					:ref="`durationCanvas-${modalUuid}`"
					class="duration-canvas"
					v-show="!player.error"
					height="20"
					:width="canvasWidth"
					@click="setTrackPosition($event)"
				/>
				<div class="player-footer">
					<div class="player-footer-left">
						<button
							class="button is-primary"
							@click="play()"
							@keyup.enter="play()"
							v-if="player.paused"
							content="Resume Playback"
							v-tippy
						>
							<i class="material-icons">play_arrow</i>
						</button>
						<button
							class="button is-primary"
							@click="settings('pause')"
							@keyup.enter="settings('pause')"
							v-else
							content="Pause Playback"
							v-tippy
						>
							<i class="material-icons">pause</i>
						</button>
						<button
							class="button is-danger"
							@click.exact="settings('stop')"
							@click.shift="settings('hardStop')"
							@keyup.enter.exact="settings('stop')"
							@keyup.shift.enter="settings('hardStop')"
							content="Stop Playback"
							v-tippy
						>
							<i class="material-icons">stop</i>
						</button>
						<tippy
							class="playerRateDropdown"
							:touch="true"
							:interactive="true"
							placement="bottom"
							theme="dropdown"
							ref="dropdown"
							trigger="click"
							append-to="parent"
							@show="
								() => {
									player.showRateDropdown = true;
								}
							"
							@hide="
								() => {
									player.showRateDropdown = false;
								}
							"
						>
							<div
								ref="trigger"
								class="control has-addons"
								content="Set Playback Rate"
								v-tippy
							>
								<button class="button is-primary">
									<i class="material-icons">fast_forward</i>
								</button>
								<button class="button dropdown-toggle">
									<i class="material-icons">
										{{
											player.showRateDropdown
												? "expand_more"
												: "expand_less"
										}}
									</i>
								</button>
							</div>

							<template #content>
								<div class="nav-dropdown-items">
									<button
										class="nav-item button"
										:class="{
											active: player.playbackRate === 0.5
										}"
										title="0.5x"
										@click="setPlaybackRate(0.5)"
									>
										<p>0.5x</p>
									</button>
									<button
										class="nav-item button"
										:class="{
											active: player.playbackRate === 1
										}"
										title="1x"
										@click="setPlaybackRate(1)"
									>
										<p>1x</p>
									</button>
									<button
										class="nav-item button"
										:class="{
											active: player.playbackRate === 2
										}"
										title="2x"
										@click="setPlaybackRate(2)"
									>
										<p>2x</p>
									</button>
								</div>
							</template>
						</tippy>
					</div>
					<div class="player-footer-center">
						<span>
							<span>
								{{ player.currentTime }}
							</span>
							/
							<span>
								{{ player.duration }}
								{{ player.videoNote }}
							</span>
						</span>
					</div>
					<div class="player-footer-right">
						<p id="volume-control">
							<i
								class="material-icons"
								@click="toggleMute()"
								:content="`${player.muted ? 'Unmute' : 'Mute'}`"
								v-tippy
								>{{
									player.muted
										? "volume_mute"
										: player.volume >= 50
										? "volume_up"
										: "volume_down"
								}}</i
							>
							<input
								v-model="player.volume"
								type="range"
								min="0"
								max="100"
								class="volume-slider active"
								@change="changeVolume()"
								@input="changeVolume()"
							/>
						</p>
					</div>
				</div>
			</div>

			<div v-if="!loaded" class="vertical-padding">
				<p>Video hasn't loaded yet</p>
			</div>
		</template>
		<template #footer>
			<button
				class="button is-primary icon-with-button material-icons"
				@click.prevent="
					openModal({ modal: 'editSong', data: { song: video } })
				"
				content="Create/edit song from video"
				v-tippy
			>
				music_note
			</button>
			<div class="right">
				<button
					class="button is-danger icon-with-button material-icons"
					@click.prevent="
						confirmAction({
							message:
								'Removing this video will remove it from all playlists and cause a ratings recalculation.',
							action: 'remove'
						})
					"
					content="Delete Video"
					v-tippy
				>
					delete_forever
				</button>
			</div>
		</template>
	</modal>
</template>

<script>
import { mapActions, mapGetters } from "vuex";

import Toast from "toasters";

import aw from "@/aw";
import ws from "@/ws";
import { mapModalState, mapModalActions } from "@/vuex_helpers";

export default {
	props: {
		modalUuid: { type: String, default: "" }
	},
	data() {
		return {
			loaded: false,
			canvasWidth: 760,
			activityWatchVideoDataInterval: null,
			activityWatchVideoLastStatus: "",
			activityWatchVideoLastStartDuration: ""
		};
	},
	computed: {
		...mapModalState("modals/viewYoutubeVideo/MODAL_UUID", {
			videoId: state => state.videoId,
			youtubeId: state => state.youtubeId,
			video: state => state.video,
			player: state => state.player
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		ws.onConnect(this.init);
	},
	beforeUnmount() {
		this.stopVideo();
		this.pauseVideo(true);
		this.player.duration = "0.000";
		this.player.currentTime = 0;
		this.player.playerReady = false;
		this.player.videoNote = "";
		clearInterval(this.interval);
		clearInterval(this.activityWatchVideoDataInterval);
		this.loaded = false;

		this.socket.dispatch(
			"apis.leaveRoom",
			`view-youtube-video.${this.videoId}`,
			() => {}
		);

		// Delete the VueX module that was created for this modal, after all other cleanup tasks are performed
		this.$store.unregisterModule([
			"modals",
			"viewYoutubeVideo",
			this.modalUuid
		]);
	},
	methods: {
		init() {
			this.loaded = false;
			this.socket.dispatch(
				"youtube.getVideo",
				this.videoId || this.youtubeId,
				true,
				res => {
					if (res.status === "success") {
						const youtubeVideo = res.data;
						this.viewYoutubeVideo(youtubeVideo);
						this.loaded = true;

						this.interval = setInterval(() => {
							if (
								this.video.duration !== -1 &&
								this.player.paused === false &&
								this.player.playerReady &&
								(this.player.player.getCurrentTime() >
									this.video.duration ||
									(this.player.player.getCurrentTime() > 0 &&
										this.player.player.getCurrentTime() >=
											this.player.player.getDuration()))
							) {
								this.stopVideo();
								this.pauseVideo(true);
								this.drawCanvas();
							}
							if (
								this.player.playerReady &&
								this.player.player.getVideoData &&
								this.player.player.getVideoData() &&
								this.player.player.getVideoData().video_id ===
									this.video.youtubeId
							) {
								const currentTime =
									this.player.player.getCurrentTime();

								if (currentTime !== undefined)
									this.player.currentTime =
										currentTime.toFixed(3);

								if (
									this.player.duration.indexOf(".000") !== -1
								) {
									const duration =
										this.player.player.getDuration();

									if (duration !== undefined) {
										if (
											`${this.player.duration}` ===
											`${Number(
												this.video.duration
											).toFixed(3)}`
										)
											this.video.duration =
												duration.toFixed(3);

										this.player.duration =
											duration.toFixed(3);
										if (
											this.player.duration.indexOf(
												".000"
											) !== -1
										)
											this.player.videoNote = "(~)";
										else this.player.videoNote = "";

										this.drawCanvas();
									}
								}
							}

							if (this.player.paused === false) this.drawCanvas();
						}, 200);

						this.activityWatchVideoDataInterval = setInterval(
							() => {
								this.sendActivityWatchVideoData();
							},
							1000
						);

						if (window.YT && window.YT.Player) {
							this.player.player = new window.YT.Player(
								`viewYoutubeVideoPlayer-${this.modalUuid}`,
								{
									height: 298,
									width: 530,
									videoId: null,
									host: "https://www.youtube-nocookie.com",
									playerVars: {
										controls: 0,
										iv_load_policy: 3,
										rel: 0,
										showinfo: 0,
										autoplay: 0
									},
									events: {
										onReady: () => {
											let volume = parseFloat(
												localStorage.getItem("volume")
											);
											volume =
												typeof volume === "number"
													? volume
													: 20;
											this.player.player.setVolume(
												volume
											);
											if (volume > 0)
												this.player.player.unMute();

											this.player.playerReady = true;

											if (this.video && this.video._id)
												this.player.player.cueVideoById(
													this.video.youtubeId
												);

											this.setPlaybackRate(null);

											this.drawCanvas();
										},
										onStateChange: event => {
											this.drawCanvas();

											if (event.data === 1) {
												this.player.paused = false;
												const youtubeDuration =
													this.player.player.getDuration();
												const newYoutubeVideoDuration =
													youtubeDuration.toFixed(3);

												if (
													this.player.duration.indexOf(
														".000"
													) !== -1 &&
													`${this.player.duration}` !==
														`${newYoutubeVideoDuration}`
												) {
													const songDurationNumber =
														Number(
															this.video.duration
														);
													const songDurationNumber2 =
														Number(
															this.video.duration
														) + 1;
													const songDurationNumber3 =
														Number(
															this.video.duration
														) - 1;
													const fixedSongDuration =
														songDurationNumber.toFixed(
															3
														);
													const fixedSongDuration2 =
														songDurationNumber2.toFixed(
															3
														);
													const fixedSongDuration3 =
														songDurationNumber3.toFixed(
															3
														);

													if (
														`${this.player.duration}` ===
															`${Number(
																this.video
																	.duration
															).toFixed(3)}` &&
														(fixedSongDuration ===
															this.player
																.duration ||
															fixedSongDuration2 ===
																this.player
																	.duration ||
															fixedSongDuration3 ===
																this.player
																	.duration)
													)
														this.video.duration =
															newYoutubeVideoDuration;

													this.player.duration =
														newYoutubeVideoDuration;
													if (
														this.player.duration.indexOf(
															".000"
														) !== -1
													)
														this.player.videoNote =
															"(~)";
													else
														this.player.videoNote =
															"";
												}

												if (this.video.duration === -1)
													this.video.duration =
														this.player.duration;

												if (
													this.video.duration >
													youtubeDuration + 1
												) {
													this.stopVideo();
													this.pauseVideo(true);
													return new Toast(
														"Video can't play. Specified duration is bigger than the YouTube song duration."
													);
												}
												if (this.video.duration <= 0) {
													this.stopVideo();
													this.pauseVideo(true);
													return new Toast(
														"Video can't play. Specified duration has to be more than 0 seconds."
													);
												}

												this.setPlaybackRate(null);
											} else if (event.data === 2) {
												this.player.paused = true;
											}

											return false;
										}
									}
								}
							);
						} else {
							this.updatePlayer({
								error: true,
								errorMessage: "Player could not be loaded."
							});
						}

						let volume = parseFloat(localStorage.getItem("volume"));
						volume =
							typeof volume === "number" && !Number.isNaN(volume)
								? volume
								: 20;
						localStorage.setItem("volume", volume);
						this.updatePlayer({ volume });

						this.socket.dispatch(
							"apis.joinRoom",
							`view-youtube-video.${this.videoId}`
						);

						this.socket.on(
							"event:youtubeVideo.removed",
							() => {
								new Toast("This YouTube video was removed.");
								this.closeCurrentModal();
							},
							{ modalUuid: this.modalUuid }
						);
					} else {
						new Toast("YouTube video with that ID not found");
						this.closeCurrentModal();
					}
				}
			);
		},
		remove() {
			this.socket.dispatch("youtube.removeVideos", this.videoId, res => {
				if (res.status === "success") {
					new Toast("YouTube video successfully removed.");
					this.closeCurrentModal();
				} else {
					new Toast("Youtube video with that ID not found.");
				}
			});
		},
		confirmAction({ message, action, params }) {
			this.openModal({
				modal: "confirm",
				data: {
					message,
					action,
					params,
					onCompleted: this.handleConfirmed
				}
			});
		},
		handleConfirmed({ action, params }) {
			if (typeof this[action] === "function") {
				if (params) this[action](params);
				else this[action]();
			}
		},
		settings(type) {
			switch (type) {
				case "stop":
					this.stopVideo();
					this.pauseVideo(true);
					break;
				case "pause":
					this.pauseVideo(true);
					break;
				case "play":
					this.pauseVideo(false);
					break;
				case "skipToLast10Secs":
					this.seekTo(this.song.duration - 10);
					break;
				default:
					break;
			}
		},
		play() {
			if (
				this.player.player.getVideoData().video_id !==
				this.video.youtubeId
			) {
				this.video.duration = -1;
				this.loadVideoById(this.video.youtubeId);
			}
			this.settings("play");
		},
		seekTo(position) {
			this.settings("play");
			this.player.player.seekTo(position);
		},
		changeVolume() {
			const { volume } = this.player;
			localStorage.setItem("volume", volume);
			this.player.player.setVolume(volume);
			if (volume > 0) {
				this.player.player.unMute();
				this.player.muted = false;
			}
		},
		toggleMute() {
			const previousVolume = parseFloat(localStorage.getItem("volume"));
			const volume =
				this.player.player.getVolume() <= 0 ? previousVolume : 0;
			this.player.muted = !this.player.muted;
			this.volumeSliderValue = volume;
			this.player.player.setVolume(volume);
			if (!this.player.muted) localStorage.setItem("volume", volume);
		},
		increaseVolume() {
			const previousVolume = parseFloat(localStorage.getItem("volume"));
			let volume = previousVolume + 5;
			this.player.muted = false;
			if (volume > 100) volume = 100;
			this.player.volume = volume;
			this.player.player.setVolume(volume);
			localStorage.setItem("volume", volume);
		},
		drawCanvas() {
			if (!this.loaded) return;
			const canvasElement =
				this.$refs[`durationCanvas-${this.modalUuid}`];
			if (!canvasElement) return;
			const ctx = canvasElement.getContext("2d");

			const videoDuration = Number(this.player.duration);

			const duration = Number(this.video.duration);
			const afterDuration = videoDuration - duration;

			this.canvasWidth = Math.min(document.body.clientWidth - 40, 760);
			const width = this.canvasWidth;

			const currentTime =
				this.player.player && this.player.player.getCurrentTime
					? this.player.player.getCurrentTime()
					: 0;

			const widthDuration = (duration / videoDuration) * width;
			const widthAfterDuration = (afterDuration / videoDuration) * width;

			const widthCurrentTime = (currentTime / videoDuration) * width;

			const durationColor = "#03A9F4";
			const afterDurationColor = "#41E841";
			const currentDurationColor = "#3b25e8";

			ctx.fillStyle = durationColor;
			ctx.fillRect(0, 0, widthDuration, 20);
			ctx.fillStyle = afterDurationColor;
			ctx.fillRect(widthDuration, 0, widthAfterDuration, 20);

			ctx.fillStyle = currentDurationColor;
			ctx.fillRect(widthCurrentTime, 0, 1, 20);
		},
		setTrackPosition(event) {
			this.seekTo(
				Number(
					Number(this.player.player.getDuration()) *
						((event.pageX -
							event.target.getBoundingClientRect().left) /
							this.canvasWidth)
				)
			);
		},
		sendActivityWatchVideoData() {
			if (!this.player.paused) {
				if (this.activityWatchVideoLastStatus !== "playing") {
					this.activityWatchVideoLastStatus = "playing";
					this.activityWatchVideoLastStartDuration = Math.floor(
						parseFloat(this.player.currentTime)
					);
				}

				const videoData = {
					title: this.video.title,
					artists: this.video.author,
					youtubeId: this.video.youtubeId,
					muted: this.player.muted,
					volume: this.player.volume,
					startedDuration:
						this.activityWatchVideoLastStartDuration <= 0
							? 0
							: this.activityWatchVideoLastStartDuration,
					source: `viewYoutubeVideo#${this.video.youtubeId}`,
					hostname: window.location.hostname
				};

				aw.sendVideoData(videoData);
			} else {
				this.activityWatchVideoLastStatus = "not_playing";
			}
		},
		...mapModalActions("modals/viewYoutubeVideo/MODAL_UUID", [
			"updatePlayer",
			"stopVideo",
			"loadVideoById",
			"pauseVideo",
			"setPlaybackRate",
			"viewYoutubeVideo"
		]),
		...mapActions("modalVisibility", ["openModal", "closeCurrentModal"])
	}
};
</script>

<style lang="less" scoped>
.night-mode {
	.player-section,
	.top-section {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;

		.duration-canvas {
			background-color: var(--dark-grey-2) !important;
		}
	}
}

.top-section {
	display: flex;
	margin: 0 auto;
	padding: 10px;
	border: 1px solid var(--light-grey-3);
	border-radius: @border-radius;

	.left-section {
		display: flex;
		flex-direction: column;
		flex-grow: 1;

		p {
			text-overflow: ellipsis;
			white-space: nowrap;
			overflow: hidden;

			&:first-child {
				margin-top: auto;
			}

			&:last-child {
				margin-bottom: auto;
			}

			& > span,
			& > a {
				margin-left: 5px;
			}
		}
	}

	:deep(.right-section .thumbnail-preview) {
		width: 120px;
		height: 120px;
		margin: 0;
	}

	@media (max-width: 600px) {
		flex-direction: column-reverse;

		.left-section {
			margin-top: 10px;
		}
	}
}

.player-section {
	display: flex;
	flex-direction: column;
	margin: 10px auto 0 auto;
	border: 1px solid var(--light-grey-3);
	border-radius: @border-radius;
	overflow: hidden;

	.player-container {
		position: relative;
		padding-bottom: 56.25%; /* proportion value to aspect ratio 16:9 (9 / 16 = 0.5625 or 56.25%) */
		height: 0;
		overflow: hidden;

		:deep([id^="viewYoutubeVideoPlayer"]) {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			min-height: 200px;
		}
	}

	.duration-canvas {
		background-color: var(--light-grey-2);
	}

	.player-error {
		display: flex;
		height: 428px;
		align-items: center;

		* {
			margin: 0;
			flex: 1;
			font-size: 30px;
			text-align: center;
		}
	}

	.player-footer {
		display: flex;
		justify-content: space-between;
		height: 54px;
		padding-left: 10px;
		padding-right: 10px;

		> * {
			width: 33.3%;
			display: flex;
			align-items: center;
		}

		.player-footer-left {
			flex: 1;

			& > .button:not(:first-child) {
				margin-left: 5px;
			}

			:deep(& > .playerRateDropdown) {
				margin-left: 5px;
				margin-bottom: unset !important;

				.control.has-addons {
					margin-bottom: unset !important;

					& > .button {
						font-size: 24px;
					}
				}
			}

			:deep(.tippy-box[data-theme~="dropdown"]) {
				max-width: 100px !important;

				.nav-dropdown-items .nav-item {
					justify-content: center !important;
					border-radius: @border-radius !important;

					&.active {
						background-color: var(--primary-color);
						color: var(--white);
					}
				}
			}
		}

		.player-footer-center {
			justify-content: center;
			align-items: center;
			flex: 2;
			font-size: 18px;
			font-weight: 400;
			width: 200px;
			margin: 0 5px;

			img {
				height: 21px;
				margin-right: 12px;
				filter: invert(26%) sepia(54%) saturate(6317%) hue-rotate(2deg)
					brightness(92%) contrast(115%);
			}
		}

		.player-footer-right {
			justify-content: right;
			flex: 1;

			#volume-control {
				margin: 3px;
				margin-top: 0;
				display: flex;
				align-items: center;
				cursor: pointer;

				.volume-slider {
					width: 100%;
					padding: 0 15px;
					background: transparent;
					min-width: 100px;
				}

				input[type="range"] {
					-webkit-appearance: none;
					margin: 7.3px 0;
				}

				input[type="range"]:focus {
					outline: none;
				}

				input[type="range"]::-webkit-slider-runnable-track {
					width: 100%;
					height: 5.2px;
					cursor: pointer;
					box-shadow: 0;
					background: var(--light-grey-3);
					border-radius: @border-radius;
					border: 0;
				}

				input[type="range"]::-webkit-slider-thumb {
					box-shadow: 0;
					border: 0;
					height: 19px;
					width: 19px;
					border-radius: 100%;
					background: var(--primary-color);
					cursor: pointer;
					-webkit-appearance: none;
					margin-top: -6.5px;
				}

				input[type="range"]::-moz-range-track {
					width: 100%;
					height: 5.2px;
					cursor: pointer;
					box-shadow: 0;
					background: var(--light-grey-3);
					border-radius: @border-radius;
					border: 0;
				}

				input[type="range"]::-moz-range-thumb {
					box-shadow: 0;
					border: 0;
					height: 19px;
					width: 19px;
					border-radius: 100%;
					background: var(--primary-color);
					cursor: pointer;
					-webkit-appearance: none;
					margin-top: -6.5px;
				}
				input[type="range"]::-ms-track {
					width: 100%;
					height: 5.2px;
					cursor: pointer;
					box-shadow: 0;
					background: var(--light-grey-3);
					border-radius: @border-radius;
				}

				input[type="range"]::-ms-fill-lower {
					background: var(--light-grey-3);
					border: 0;
					border-radius: 0;
					box-shadow: 0;
				}

				input[type="range"]::-ms-fill-upper {
					background: var(--light-grey-3);
					border: 0;
					border-radius: 0;
					box-shadow: 0;
				}

				input[type="range"]::-ms-thumb {
					box-shadow: 0;
					border: 0;
					height: 15px;
					width: 15px;
					border-radius: 100%;
					background: var(--primary-color);
					cursor: pointer;
					-webkit-appearance: none;
					margin-top: 1.5px;
				}
			}
		}
	}
}
</style>
