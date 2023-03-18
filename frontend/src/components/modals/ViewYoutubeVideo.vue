<script setup lang="ts">
import {
	defineAsyncComponent,
	onMounted,
	onBeforeUnmount,
	ref,
	computed
} from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import aw from "@/aw";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import { useViewYoutubeVideoStore } from "@/stores/viewYoutubeVideo";
import { useStationStore } from "@/stores/station";
import { useUserAuthStore } from "@/stores/userAuth";
import utils from "@/utils";

import Modal from "@/components/Modal.vue";

const SongThumbnail = defineAsyncComponent(
	() => import("@/components/SongThumbnail.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true },
	videoId: { type: String, default: null },
	youtubeId: { type: String, default: null }
});

const interval = ref(null);
const loaded = ref(false);
const canvasWidth = ref(760);
const volumeSliderValue = ref(20);
const durationCanvas = ref(null);
const activityWatchMediaDataInterval = ref(null);
const activityWatchMediaLastStatus = ref("");
const activityWatchMediaLastStartDuration = ref(0);

const viewYoutubeVideoStore = useViewYoutubeVideoStore({
	modalUuid: props.modalUuid
});
const stationStore = useStationStore();
const { video, player } = storeToRefs(viewYoutubeVideoStore);
const {
	updatePlayer,
	stopVideo,
	loadVideoById,
	pauseVideo,
	setPlaybackRate,
	viewYoutubeVideo
} = viewYoutubeVideoStore;
const { updateMediaModalPlayingAudio } = stationStore;

const { openModal, closeCurrentModal } = useModalsStore();

const { socket } = useWebsocketsStore();

const userAuthStore = useUserAuthStore();
const { hasPermission } = userAuthStore;

const youtubeId = computed(() => {
	if (props.videoId && props.videoId.startsWith("youtube:"))
		return props.videoId.split(":")[1];
	if (props.youtubeId && props.youtubeId.startsWith("youtube:"))
		return props.youtubeId.split(":")[1];
	return props.videoId || props.youtubeId;
});

const remove = () => {
	socket.dispatch("youtube.removeVideos", video.value._id, res => {
		if (res.status === "success") {
			new Toast("YouTube video successfully removed.");
			closeCurrentModal();
		} else {
			new Toast("Youtube video with that ID not found.");
		}
	});
};

const seekTo = position => {
	pauseVideo(false);
	player.value.player.seekTo(position);
};

const settings = type => {
	switch (type) {
		case "stop":
			stopVideo();
			pauseVideo(true);
			break;
		case "pause":
			pauseVideo(true);
			break;
		case "play":
			pauseVideo(false);
			break;
		case "skipToLast10Secs":
			seekTo(Number(player.value.duration) - 10);
			break;
		default:
			break;
	}
};

const play = () => {
	if (player.value.player.getVideoData().video_id !== video.value.youtubeId) {
		video.value.duration = -1;
		loadVideoById(video.value.youtubeId);
	}
	settings("play");
};

const changeVolume = () => {
	const { volume } = player.value;
	localStorage.setItem("volume", `${volume}`);
	player.value.player.setVolume(volume);
	if (volume > 0) {
		player.value.player.unMute();
		player.value.muted = false;
	}
};

const toggleMute = () => {
	const previousVolume = parseFloat(localStorage.getItem("volume"));
	const volume = player.value.player.getVolume() <= 0 ? previousVolume : 0;
	player.value.muted = !player.value.muted;
	volumeSliderValue.value = volume;
	player.value.player.setVolume(volume);
	if (!player.value.muted) localStorage.setItem("volume", volume.toString());
};

// const increaseVolume = () => {
// 	const previousVolume = parseFloat(localStorage.getItem("volume"));
// 	let volume = previousVolume + 5;
// 	player.value.muted = false;
// 	if (volume > 100) volume = 100;
// 	player.value.volume = volume;
// 	player.value.player.setVolume(volume);
// 	localStorage.setItem("volume", volume.toString());
// };

const drawCanvas = () => {
	if (!loaded.value) return;
	const canvasElement = durationCanvas.value;
	if (!canvasElement) return;
	const ctx = canvasElement.getContext("2d");

	const videoDuration = Number(player.value.duration);

	const duration = Number(video.value.duration);
	const afterDuration = videoDuration - duration;

	canvasWidth.value = Math.min(document.body.clientWidth - 40, 760);
	const width = canvasWidth.value;

	const currentTime =
		player.value.player && player.value.player.getCurrentTime
			? player.value.player.getCurrentTime()
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
};

const setTrackPosition = event => {
	seekTo(
		Number(
			Number(player.value.player.getDuration()) *
				((event.pageX - event.target.getBoundingClientRect().left) /
					canvasWidth.value)
		)
	);
};
const sendActivityWatchMediaData = () => {
	if (
		!player.value.paused &&
		player.value.player.getPlayerState() === window.YT.PlayerState.PLAYING
	) {
		if (activityWatchMediaLastStatus.value !== "playing") {
			activityWatchMediaLastStatus.value = "playing";
			activityWatchMediaLastStartDuration.value = Math.floor(
				Number(player.value.currentTime)
			);
		}

		const videoData = {
			title: video.value.title,
			artists: video.value.author,
			mediaSource: `youtube:${video.value.youtubeId}`,
			muted: player.value.muted,
			volume: player.value.volume,
			startedDuration:
				activityWatchMediaLastStartDuration.value <= 0
					? 0
					: activityWatchMediaLastStartDuration.value,
			source: `viewYoutubeVideo#${video.value.youtubeId}`,
			hostname: window.location.hostname,
			playerState: Object.keys(window.YT.PlayerState).find(
				key =>
					window.YT.PlayerState[key] ===
					player.value.player.getPlayerState()
			),
			playbackRate: player.value.playbackRate
		};

		aw.sendMediaData(videoData);
	} else {
		activityWatchMediaLastStatus.value = "not_playing";
	}
};

onMounted(() => {
	socket.onConnect(() => {
		loaded.value = false;
		socket.dispatch("youtube.getVideo", youtubeId.value, true, res => {
			if (res.status === "success") {
				const youtubeVideo = res.data;
				viewYoutubeVideo(youtubeVideo);
				loaded.value = true;

				interval.value = setInterval(() => {
					if (
						video.value.duration !== -1 &&
						player.value.paused === false &&
						player.value.playerReady &&
						(player.value.player.getCurrentTime() >
							video.value.duration ||
							(player.value.player.getCurrentTime() > 0 &&
								player.value.player.getCurrentTime() >=
									player.value.player.getDuration()))
					) {
						stopVideo();
						pauseVideo(true);
						drawCanvas();
					}
					if (
						player.value.playerReady &&
						player.value.player.getVideoData &&
						player.value.player.getVideoData() &&
						player.value.player.getVideoData().video_id ===
							video.value.youtubeId
					) {
						const currentTime =
							player.value.player.getCurrentTime();

						if (currentTime !== undefined)
							player.value.currentTime = currentTime.toFixed(3);

						if (player.value.duration.indexOf(".000") !== -1) {
							const duration = player.value.player.getDuration();

							if (duration !== undefined) {
								if (
									`${player.value.duration}` ===
									`${Number(video.value.duration).toFixed(3)}`
								)
									video.value.duration = duration.toFixed(3);

								player.value.duration = duration.toFixed(3);
								if (
									player.value.duration.indexOf(".000") !== -1
								)
									player.value.videoNote = "(~)";
								else player.value.videoNote = "";

								drawCanvas();
							}
						}
					}

					if (player.value.paused === false) drawCanvas();
				}, 200);

				activityWatchMediaDataInterval.value = setInterval(() => {
					sendActivityWatchMediaData();
				}, 1000);

				if (window.YT && window.YT.Player) {
					player.value.player = new window.YT.Player(
						`viewYoutubeVideoPlayer-${props.modalUuid}`,
						{
							height: 298,
							width: 530,
							videoId: youtubeId.value,
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
									player.value.player.setVolume(volume);
									if (volume > 0)
										player.value.player.unMute();

									player.value.playerReady = true;

									if (video.value && video.value._id)
										player.value.player.cueVideoById(
											video.value.youtubeId
										);

									setPlaybackRate();

									drawCanvas();
								},
								onStateChange: event => {
									drawCanvas();

									if (event.data === 1) {
										player.value.paused = false;
										updateMediaModalPlayingAudio(true);
										const youtubeDuration =
											player.value.player.getDuration();
										const newYoutubeVideoDuration =
											youtubeDuration.toFixed(3);

										if (
											player.value.duration.indexOf(
												".000"
											) !== -1 &&
											`${player.value.duration}` !==
												`${newYoutubeVideoDuration}`
										) {
											const songDurationNumber = Number(
												video.value.duration
											);
											const songDurationNumber2 =
												Number(video.value.duration) +
												1;
											const songDurationNumber3 =
												Number(video.value.duration) -
												1;
											const fixedSongDuration =
												songDurationNumber.toFixed(3);
											const fixedSongDuration2 =
												songDurationNumber2.toFixed(3);
											const fixedSongDuration3 =
												songDurationNumber3.toFixed(3);

											if (
												`${player.value.duration}` ===
													`${Number(
														video.value.duration
													).toFixed(3)}` &&
												(fixedSongDuration ===
													player.value.duration ||
													fixedSongDuration2 ===
														player.value.duration ||
													fixedSongDuration3 ===
														player.value.duration)
											)
												video.value.duration =
													newYoutubeVideoDuration;

											player.value.duration =
												newYoutubeVideoDuration;
											if (
												player.value.duration.indexOf(
													".000"
												) !== -1
											)
												player.value.videoNote = "(~)";
											else player.value.videoNote = "";
										}

										if (video.value.duration === -1)
											video.value.duration = Number(
												player.value.duration
											);

										if (
											video.value.duration >
											youtubeDuration + 1
										) {
											stopVideo();
											pauseVideo(true);
											return new Toast(
												"Video can't play. Specified duration is bigger than the YouTube song duration."
											);
										}
										if (video.value.duration <= 0) {
											stopVideo();
											pauseVideo(true);
											return new Toast(
												"Video can't play. Specified duration has to be more than 0 seconds."
											);
										}

										setPlaybackRate();
									} else if (event.data === 2) {
										player.value.paused = true;
										updateMediaModalPlayingAudio(false);
									}

									return false;
								}
							}
						}
					);
				} else {
					updatePlayer({
						error: true,
						errorMessage: "Player could not be loaded."
					});
				}

				let volume = parseFloat(localStorage.getItem("volume"));
				volume =
					typeof volume === "number" && !Number.isNaN(volume)
						? volume
						: 20;
				localStorage.setItem("volume", volume.toString());
				updatePlayer({ volume });

				socket.dispatch(
					"apis.joinRoom",
					`view-youtube-video.${video.value._id}`
				);
			} else {
				new Toast("YouTube video with that ID not found");
				closeCurrentModal();
			}
		});
	});

	socket.on(
		"event:youtubeVideo.removed",
		() => {
			new Toast("This YouTube video was removed.");
			closeCurrentModal();
		},
		{ modalUuid: props.modalUuid }
	);
});

onBeforeUnmount(() => {
	stopVideo();
	pauseVideo(true);
	updateMediaModalPlayingAudio(false);
	player.value.duration = "0.000";
	player.value.currentTime = 0;
	player.value.playerReady = false;
	player.value.videoNote = "";
	clearInterval(interval.value);
	clearInterval(activityWatchMediaDataInterval.value);
	loaded.value = false;

	socket.dispatch(
		"apis.leaveRoom",
		`view-youtube-video.${video.value._id}`,
		() => {}
	);

	// Delete the Pinia store that was created for this modal, after all other cleanup tasks are performed
	viewYoutubeVideoStore.$dispose();
});
</script>

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
						<span :title="`${video.duration}`">{{
							video.duration
						}}</span>
					</p>
					<p>
						<strong>Upload Date:</strong>
						<span
							:title="
								video.uploadedAt
									? new Date(video.uploadedAt).toString()
									: 'Unknown'
							"
							>{{
								video.uploadedAt
									? utils.getDateFormatted(video.uploadedAt)
									: "Unknown"
							}}</span
						>
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
					ref="durationCanvas"
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
				v-if="
					hasPermission('songs.create') ||
					hasPermission('songs.update')
				"
				class="button is-primary icon-with-button material-icons"
				@click.prevent="
					openModal({
						modal: 'editSong',
						props: {
							song: {
								mediaSource: `youtube:${video.youtubeId}`,
								...video
							}
						}
					})
				"
				content="Create/edit song from video"
				v-tippy
			>
				music_note
			</button>
			<div class="right">
				<button
					v-if="hasPermission('youtube.removeVideos')"
					class="button is-danger icon-with-button material-icons"
					@click.prevent="
						openModal({
							modal: 'confirm',
							props: {
								message:
									'Removing this video will remove it from all playlists and cause a ratings recalculation.',
								onCompleted: remove
							}
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
