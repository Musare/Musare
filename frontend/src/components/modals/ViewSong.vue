<script setup lang="ts">
import {
	defineAsyncComponent,
	onMounted,
	onBeforeUnmount,
	ref,
	computed
} from "vue";
import Toast from "toasters";
import aw from "@/aw";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import { useYoutubePlayer } from "@/composables/useYoutubePlayer";
import { useStationStore } from "@/stores/station";
import { useUserAuthStore } from "@/stores/userAuth";
import utils from "@/utils";

import Modal from "@/components/Modal.vue";

const SongThumbnail = defineAsyncComponent(
	() => import("@/components/SongThumbnail.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true },
	mediaSource: { type: String, default: null }
});

const {
	player: youtubePlayer,
	updatePlayer: youtubeUpdatePlayer,
	loadVideoById: youtubeLoadVideoById,
	playVideo: youtubePlayVideo,
	pauseVideo: youtubePauseVideo,
	stopVideo: youtubeStopVideo,
	setPlaybackRate: youtubeSetPlaybackRate
} = useYoutubePlayer();

type YoutubeVideo = {
	_id: string;
	youtubeId: string;
	title: string;
	author: string;
	duration: number;
	uploadedAt?: Date;
};

const youtubeVideo = ref<YoutubeVideo>({
	_id: null,
	youtubeId: null,
	title: null,
	author: null,
	duration: 0
});

const currentSongMediaType = computed(() => props.mediaSource.split(":")[0]);
const currentSongMediaValue = computed(() => props.mediaSource.split(":")[1]);

const interval = ref(null);
const loaded = ref(false);
const canvasWidth = ref(760);
const volumeSliderValue = ref(20);
const durationCanvas = ref(null);

const activityWatchMediaDataInterval = ref(null);
const activityWatchMediaLastStatus = ref("");
const activityWatchMediaLastStartDuration = ref(0);

const stationStore = useStationStore();

const { updateMediaModalPlayingAudio } = stationStore;

const { openModal, closeCurrentModal } = useModalsStore();

const { socket } = useWebsocketsStore();

const userAuthStore = useUserAuthStore();
const { hasPermission } = userAuthStore;

const youtubeRemove = () => {
	socket.dispatch("youtube.removeVideos", youtubeVideo.value._id, res => {
		if (res.status === "success") {
			new Toast("YouTube video successfully removed.");
			closeCurrentModal();
		} else {
			new Toast("Youtube video with that ID not found.");
		}
	});
};

const remove = () => {
	if (currentSongMediaType.value === "youtube") youtubeRemove();
	else throw new Error("Not implemented.");
};

const seekTo = position => {
	youtubePlayVideo();
	youtubePlayer.value.player.seekTo(position);
};

const settings = type => {
	switch (type) {
		case "stop":
			youtubeStopVideo();
			youtubePauseVideo();
			break;
		case "pause":
			youtubePauseVideo();
			break;
		case "play":
			youtubePlayVideo();
			break;
		case "skipToLast10Secs":
			seekTo(Number(youtubePlayer.value.duration) - 10);
			break;
		default:
			break;
	}
};

const play = () => {
	if (
		youtubePlayer.value.player.getVideoData().video_id !==
		youtubeVideo.value.youtubeId
	) {
		youtubeVideo.value.duration = -1;
		youtubeLoadVideoById(youtubeVideo.value.youtubeId);
	}
	settings("play");
};

const changeVolume = () => {
	const { volume } = youtubePlayer.value;
	localStorage.setItem("volume", `${volume}`);
	youtubePlayer.value.player.setVolume(volume);
	if (volume > 0) {
		youtubePlayer.value.player.unMute();
		youtubePlayer.value.muted = false;
	}
};

const toggleMute = () => {
	const previousVolume = parseFloat(localStorage.getItem("volume"));
	const volume =
		youtubePlayer.value.player.getVolume() <= 0 ? previousVolume : 0;
	youtubePlayer.value.muted = !youtubePlayer.value.muted;
	volumeSliderValue.value = volume;
	youtubePlayer.value.player.setVolume(volume);
	if (!youtubePlayer.value.muted)
		localStorage.setItem("volume", volume.toString());
};

// const increaseVolume = () => {
// 	const previousVolume = parseFloat(localStorage.getItem("volume"));
// 	let volume = previousVolume + 5;
// 	youtubePlayer.value.muted = false;
// 	if (volume > 100) volume = 100;
// 	youtubePlayer.value.volume = volume;
// 	youtubePlayer.value.player.setVolume(volume);
// 	localStorage.setItem("volume", volume.toString());
// };

const drawCanvas = () => {
	if (!loaded.value) return;
	const canvasElement = durationCanvas.value;
	if (!canvasElement) return;
	const ctx = canvasElement.getContext("2d");

	const videoDuration = Number(youtubePlayer.value.duration);

	const duration = Number(youtubeVideo.value.duration);
	const afterDuration = videoDuration - duration;

	canvasWidth.value = Math.min(document.body.clientWidth - 40, 760);
	const width = canvasWidth.value;

	const currentTime =
		youtubePlayer.value.player && youtubePlayer.value.player.getCurrentTime
			? youtubePlayer.value.player.getCurrentTime()
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
			Number(youtubePlayer.value.player.getDuration()) *
				((event.pageX - event.target.getBoundingClientRect().left) /
					canvasWidth.value)
		)
	);
};
const sendActivityWatchMediaData = () => {
	if (
		!youtubePlayer.value.paused &&
		youtubePlayer.value.player.getPlayerState() ===
			window.YT.PlayerState.PLAYING
	) {
		if (activityWatchMediaLastStatus.value !== "playing") {
			activityWatchMediaLastStatus.value = "playing";
			activityWatchMediaLastStartDuration.value = Math.floor(
				Number(youtubePlayer.value.currentTime)
			);
		}

		const videoData = {
			title: youtubeVideo.value.title,
			artists: youtubeVideo.value.author,
			mediaSource: `youtube:${youtubeVideo.value.youtubeId}`,
			muted: youtubePlayer.value.muted,
			volume: youtubePlayer.value.volume,
			startedDuration:
				activityWatchMediaLastStartDuration.value <= 0
					? 0
					: activityWatchMediaLastStartDuration.value,
			source: `viewYoutubeVideo#${youtubeVideo.value.youtubeId}`,
			hostname: window.location.hostname,
			playerState: Object.keys(window.YT.PlayerState).find(
				key =>
					window.YT.PlayerState[key] ===
					youtubePlayer.value.player.getPlayerState()
			),
			playbackRate: youtubePlayer.value.playbackRate
		};

		aw.sendMediaData(videoData);
	} else {
		activityWatchMediaLastStatus.value = "not_playing";
	}
};

onMounted(() => {
	socket.onConnect(() => {
		loaded.value = false;
		socket.dispatch(
			"youtube.getVideo",
			currentSongMediaValue.value,
			true,
			res => {
				if (res.status === "success") {
					youtubeVideo.value = res.data;
					loaded.value = true;

					interval.value = setInterval(() => {
						if (
							youtubeVideo.value.duration !== -1 &&
							youtubePlayer.value.paused === false &&
							youtubePlayer.value.playerReady &&
							(youtubePlayer.value.player.getCurrentTime() >
								youtubeVideo.value.duration ||
								(youtubePlayer.value.player.getCurrentTime() >
									0 &&
									youtubePlayer.value.player.getCurrentTime() >=
										youtubePlayer.value.player.getDuration()))
						) {
							youtubeStopVideo();
							youtubePauseVideo();
							drawCanvas();
						}
						if (
							youtubePlayer.value.playerReady &&
							youtubePlayer.value.player.getVideoData &&
							youtubePlayer.value.player.getVideoData() &&
							youtubePlayer.value.player.getVideoData()
								.video_id === youtubeVideo.value.youtubeId
						) {
							const currentTime =
								youtubePlayer.value.player.getCurrentTime();

							if (currentTime !== undefined)
								youtubePlayer.value.currentTime =
									currentTime.toFixed(3);

							if (
								youtubePlayer.value.duration.indexOf(".000") !==
								-1
							) {
								const duration =
									youtubePlayer.value.player.getDuration();

								if (duration !== undefined) {
									if (
										`${youtubePlayer.value.duration}` ===
										`${Number(
											youtubeVideo.value.duration
										).toFixed(3)}`
									)
										youtubeVideo.value.duration =
											duration.toFixed(3);

									youtubePlayer.value.duration =
										duration.toFixed(3);
									if (
										youtubePlayer.value.duration.indexOf(
											".000"
										) !== -1
									)
										youtubePlayer.value.videoNote = "(~)";
									else youtubePlayer.value.videoNote = "";

									drawCanvas();
								}
							}
						}

						if (youtubePlayer.value.paused === false) drawCanvas();
					}, 200);

					activityWatchMediaDataInterval.value = setInterval(() => {
						sendActivityWatchMediaData();
					}, 1000);

					if (window.YT && window.YT.Player) {
						youtubePlayer.value.player = new window.YT.Player(
							`viewYoutubeVideoPlayer-${props.modalUuid}`,
							{
								height: 298,
								width: 530,
								videoId: currentSongMediaValue.value,
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
										youtubePlayer.value.player.setVolume(
											volume
										);
										if (volume > 0)
											youtubePlayer.value.player.unMute();

										youtubePlayer.value.playerReady = true;

										if (
											youtubeVideo.value &&
											youtubeVideo.value._id
										)
											youtubePlayer.value.player.cueVideoById(
												youtubeVideo.value.youtubeId
											);

										youtubeSetPlaybackRate();

										drawCanvas();
									},
									onStateChange: event => {
										drawCanvas();

										if (event.data === 1) {
											youtubePlayer.value.paused = false;
											updateMediaModalPlayingAudio(true);
											const youtubeDuration =
												youtubePlayer.value.player.getDuration();
											const newYoutubeVideoDuration =
												youtubeDuration.toFixed(3);

											if (
												youtubePlayer.value.duration.indexOf(
													".000"
												) !== -1 &&
												`${youtubePlayer.value.duration}` !==
													`${newYoutubeVideoDuration}`
											) {
												const songDurationNumber =
													Number(
														youtubeVideo.value
															.duration
													);
												const songDurationNumber2 =
													Number(
														youtubeVideo.value
															.duration
													) + 1;
												const songDurationNumber3 =
													Number(
														youtubeVideo.value
															.duration
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
													`${youtubePlayer.value.duration}` ===
														`${Number(
															youtubeVideo.value
																.duration
														).toFixed(3)}` &&
													(fixedSongDuration ===
														youtubePlayer.value
															.duration ||
														fixedSongDuration2 ===
															youtubePlayer.value
																.duration ||
														fixedSongDuration3 ===
															youtubePlayer.value
																.duration)
												)
													youtubeVideo.value.duration =
														newYoutubeVideoDuration;

												youtubePlayer.value.duration =
													newYoutubeVideoDuration;
												if (
													youtubePlayer.value.duration.indexOf(
														".000"
													) !== -1
												)
													youtubePlayer.value.videoNote =
														"(~)";
												else
													youtubePlayer.value.videoNote =
														"";
											}

											if (
												youtubeVideo.value.duration ===
												-1
											)
												youtubeVideo.value.duration =
													Number(
														youtubePlayer.value
															.duration
													);

											if (
												youtubeVideo.value.duration >
												youtubeDuration + 1
											) {
												youtubeStopVideo();
												youtubePauseVideo();
												return new Toast(
													"Video can't play. Specified duration is bigger than the YouTube song duration."
												);
											}
											if (
												youtubeVideo.value.duration <= 0
											) {
												youtubeStopVideo();
												youtubePauseVideo();
												return new Toast(
													"Video can't play. Specified duration has to be more than 0 seconds."
												);
											}

											youtubeSetPlaybackRate();
										} else if (event.data === 2) {
											youtubePlayer.value.paused = true;
											updateMediaModalPlayingAudio(false);
										}

										return false;
									}
								}
							}
						);
					} else {
						youtubeUpdatePlayer({
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
					youtubeUpdatePlayer({ volume });

					socket.dispatch(
						"apis.joinRoom",
						`view-youtube-video.${youtubeVideo.value._id}`
					);
				} else {
					new Toast("YouTube video with that ID not found");
					closeCurrentModal();
				}
			}
		);
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
	youtubeStopVideo();
	youtubePauseVideo();
	updateMediaModalPlayingAudio(false);
	youtubePlayer.value.duration = "0.000";
	youtubePlayer.value.currentTime = 0;
	youtubePlayer.value.playerReady = false;
	youtubePlayer.value.videoNote = "";
	clearInterval(interval.value);
	clearInterval(activityWatchMediaDataInterval.value);
	loaded.value = false;

	socket.dispatch(
		"apis.leaveRoom",
		`view-song.${youtubeVideo.value._id}`,
		() => {}
	);
});
</script>

<template>
	<modal title="View Song">
		<template #body>
			<div v-if="loaded" class="top-section">
				<div class="left-section">
					<p>
						<strong>ID:</strong>
						<span :title="youtubeVideo._id">{{
							youtubeVideo._id
						}}</span>
					</p>
					<p>
						<strong>YouTube ID:</strong>
						<a
							:href="
								'https://www.youtube.com/watch?v=' +
								`${youtubeVideo.youtubeId}`
							"
							target="_blank"
						>
							{{ youtubeVideo.youtubeId }}
						</a>
					</p>
					<p>
						<strong>Title:</strong>
						<span :title="youtubeVideo.title">{{
							youtubeVideo.title
						}}</span>
					</p>
					<p>
						<strong>Author:</strong>
						<span :title="youtubeVideo.author">{{
							youtubeVideo.author
						}}</span>
					</p>
					<p>
						<strong>Duration:</strong>
						<span :title="`${youtubeVideo.duration}`">{{
							youtubeVideo.duration
						}}</span>
					</p>
					<p>
						<strong>Upload Date:</strong>
						<span
							:title="
								youtubeVideo.uploadedAt
									? new Date(
											youtubeVideo.uploadedAt
									  ).toString()
									: 'Unknown'
							"
							>{{
								youtubeVideo.uploadedAt
									? utils.getDateFormatted(
											youtubeVideo.uploadedAt
									  )
									: "Unknown"
							}}</span
						>
					</p>
				</div>
				<div class="right-section">
					<song-thumbnail
						:song="youtubeVideo"
						class="thumbnail-preview"
					/>
				</div>
			</div>

			<div v-show="loaded" class="player-section">
				<div class="player-container">
					<div :id="`viewYoutubeVideoPlayer-${modalUuid}`" />
				</div>

				<div v-show="youtubePlayer.error" class="player-error">
					<h2>{{ youtubePlayer.errorMessage }}</h2>
				</div>

				<canvas
					ref="durationCanvas"
					class="duration-canvas"
					v-show="!youtubePlayer.error"
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
							v-if="youtubePlayer.paused"
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
									youtubePlayer.showRateDropdown = true;
								}
							"
							@hide="
								() => {
									youtubePlayer.showRateDropdown = false;
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
											youtubePlayer.showRateDropdown
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
											active:
												youtubePlayer.playbackRate ===
												0.5
										}"
										title="0.5x"
										@click="youtubeSetPlaybackRate(0.5)"
									>
										<p>0.5x</p>
									</button>
									<button
										class="nav-item button"
										:class="{
											active:
												youtubePlayer.playbackRate === 1
										}"
										title="1x"
										@click="youtubeSetPlaybackRate(1)"
									>
										<p>1x</p>
									</button>
									<button
										class="nav-item button"
										:class="{
											active:
												youtubePlayer.playbackRate === 2
										}"
										title="2x"
										@click="youtubeSetPlaybackRate(2)"
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
								{{ youtubePlayer.currentTime }}
							</span>
							/
							<span>
								{{ youtubePlayer.duration }}
								{{ youtubePlayer.videoNote }}
							</span>
						</span>
					</div>
					<div class="player-footer-right">
						<p id="volume-control">
							<i
								class="material-icons"
								@click="toggleMute()"
								:content="`${
									youtubePlayer.muted ? 'Unmute' : 'Mute'
								}`"
								v-tippy
								>{{
									youtubePlayer.muted
										? "volume_mute"
										: youtubePlayer.volume >= 50
										? "volume_up"
										: "volume_down"
								}}</i
							>
							<input
								v-model="youtubePlayer.volume"
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
								mediaSource: `youtube:${youtubeVideo.youtubeId}`,
								...youtubeVideo
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
