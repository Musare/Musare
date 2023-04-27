<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import Toast from "toasters";
import { useSoundcloudPlayer } from "@/composables/useSoundcloudPlayer";
import { useStationStore } from "@/stores/station";

import aw from "@/aw";

const props = defineProps<{
	song: {
		mediaSource: string;
		title: string;
		artists: string[];
		duration: number;
	};
}>();

const TAG = "[SP]";

const {
	soundcloudIframeElement: playerElement,
	soundcloudGetDuration,
	soundcloudLoadTrack,
	soundcloudSetVolume,
	soundcloudPlay,
	soundcloudPause,
	soundcloudSeekTo,
	soundcloudOnTrackStateChange,
	soundcloudBindListener,
	soundcloudGetPosition,
	soundcloudGetCurrentSound,
	soundcloudGetTrackState,
	soundcloudUnload
} = useSoundcloudPlayer();

const stationStore = useStationStore();
const { updateMediaModalPlayingAudio } = stationStore;

const interval = ref(null);
const durationCanvas = ref(null);
const activityWatchMediaDataInterval = ref(null);
const activityWatchMediaLastStatus = ref("");
const activityWatchMediaLastStartDuration = ref(0);
const canvasWidth = ref(760);
const player = ref<{
	error: boolean;
	errorMessage: string;
	paused: boolean;
	currentTime: number;
	duration: number;
	muted: boolean;
	volume: number;
}>({
	error: false,
	errorMessage: "",
	paused: true,
	currentTime: 0,
	duration: 0,
	muted: false,
	volume: 20
});

const playerVolumeControlIcon = computed(() => {
	const { muted, volume } = player.value;
	if (muted) return "volume_mute";
	if (volume >= 50) return "volume_up";
	return "volume_down";
});

const soundcloudTrackId = computed(() => props.song.mediaSource.split(":")[1]);

const playerSetTrackPosition = event => {
	console.debug(TAG, "PLAYER SET TRACK POSITION");

	soundcloudGetDuration(duration => {
		soundcloudSeekTo(
			Number(
				Number(duration / 1000) *
					((event.pageX - event.target.getBoundingClientRect().left) /
						canvasWidth.value)
			) * 1000
		);
	});
};

const playerPlay = () => {
	console.debug(TAG, "PLAYER PLAY");

	soundcloudPlay();
};

const playerPause = () => {
	console.debug(TAG, "PLAYER PAUSE");

	soundcloudPause();
};

const playerStop = () => {
	console.debug(TAG, "PLAYER STOP");

	soundcloudPause();
	soundcloudSeekTo(0);
};

const playerHardStop = () => {
	console.debug(TAG, "PLAYER HARD STOP");

	playerStop();
};

const playerToggleMute = () => {
	console.debug(TAG, "PLAYER TOGGLE MUTE");

	player.value.muted = !player.value.muted;

	const { muted, volume } = player.value;
	localStorage.setItem("muted", `${muted}`);

	if (muted) {
		soundcloudSetVolume(0);
		player.value.volume = 0;
	} else if (volume > 0) {
		soundcloudSetVolume(volume);
		player.value.volume = volume;
		localStorage.setItem("volume", `${volume}`);
	} else {
		soundcloudSetVolume(20);
		player.value.volume = 20;
		localStorage.setItem("volume", `${20}`);
	}
};

const playerChangeVolume = () => {
	console.debug(TAG, "PLAYER CHANGE VOLUME");

	const { muted, volume } = player.value;
	localStorage.setItem("volume", `${volume}`);

	soundcloudSetVolume(volume);

	if (muted && volume > 0) {
		player.value.muted = false;
		localStorage.setItem("muted", `${false}`);
	} else if (!muted && volume === 0) {
		player.value.muted = true;
		localStorage.setItem("muted", `${true}`);
	}
};

const drawCanvas = () => {
	const canvasElement = durationCanvas.value;
	if (!canvasElement) return;

	const ctx = canvasElement.getContext("2d");

	const videoDuration = Number(player.value.duration);

	const _duration = Number(player.value.duration);
	const afterDuration = videoDuration - _duration;

	canvasWidth.value = Math.min(document.body.clientWidth - 40, 760);
	const width = canvasWidth.value;

	const { currentTime } = player.value;

	const widthDuration = (_duration / videoDuration) * width;
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

const formatDuration = duration => duration.toFixed(3);

const sendActivityWatchMediaData = () => {
	if (!player.value.paused && soundcloudGetTrackState() === "playing") {
		if (activityWatchMediaLastStatus.value !== "playing") {
			activityWatchMediaLastStatus.value = "playing";
			soundcloudGetPosition(position => {
				activityWatchMediaLastStartDuration.value = Math.floor(
					Number(position / 1000)
				);
			});
		}

		const videoData = {
			title: props.song.title,
			artists: props.song.artists?.join(", ") || "",
			mediaSource: props.song.mediaSource,
			muted: player.value.muted,
			volume: player.value.volume,
			startedDuration:
				activityWatchMediaLastStartDuration.value <= 0
					? 0
					: activityWatchMediaLastStartDuration.value,
			source: `viewMedia#${props.song.mediaSource}`,
			hostname: window.location.hostname,
			playerState: "",
			playbackRate: 1
		};

		aw.sendMediaData(videoData);
	} else {
		activityWatchMediaLastStatus.value = "not_playing";
	}
};

onMounted(() => {
	console.debug(TAG, "ON MOUNTED");

	// Generic
	let volume = parseFloat(localStorage.getItem("volume"));
	volume = typeof volume === "number" && !Number.isNaN(volume) ? volume : 20;
	localStorage.setItem("volume", `${volume}`);
	player.value.volume = volume;

	let muted: boolean | string = localStorage.getItem("muted");
	muted = muted === "true";
	localStorage.setItem("muted", `${muted}`);
	player.value.muted = muted;
	if (muted) player.value.volume = 0;

	soundcloudSetVolume(volume);

	// SoundCloud specific
	soundcloudBindListener("ready", value => {
		console.debug(TAG, "Bind on ready", value);

		soundcloudGetCurrentSound(sound => {
			player.value.duration = sound.duration / 1000;
		});

		soundcloudOnTrackStateChange(newState => {
			console.debug(TAG, `New state: ${newState}`);

			const { paused } = player.value;

			if (
				newState === "attempting_to_play" ||
				newState === "failed_to_play"
			) {
				if (!paused) {
					if (newState === "failed_to_play")
						new Toast(
							"Failed to start SoundCloud player. Please try to manually start it."
						);

					player.value.paused = true;
				}
			} else if (newState === "paused") {
				player.value.paused = true;
			} else if (newState === "playing") {
				player.value.paused = false;
			} else if (newState === "finished") {
				player.value.paused = true;
			} else if (newState === "error") {
				player.value.paused = true;
			}

			if (player.value.paused) updateMediaModalPlayingAudio(false);
			else updateMediaModalPlayingAudio(true);
		});

		soundcloudBindListener("seek", () => {
			console.debug(TAG, "Bind on seek");
		});

		soundcloudBindListener("error", value => {
			console.debug(TAG, "Bind on error", value);
		});
	});

	soundcloudLoadTrack(soundcloudTrackId.value, 0, true);

	interval.value = setInterval(() => {
		soundcloudGetPosition(position => {
			player.value.currentTime = position / 1000;

			drawCanvas();
		});
	}, 200);

	activityWatchMediaDataInterval.value = setInterval(() => {
		sendActivityWatchMediaData();
	}, 1000);
});

onBeforeUnmount(() => {
	clearInterval(interval.value);
	clearInterval(activityWatchMediaDataInterval.value);

	updateMediaModalPlayingAudio(false);

	soundcloudUnload();
});
</script>

<template>
	<div class="player-section">
		<div class="player-container">
			<iframe
				ref="playerElement"
				style="width: 100%; height: 100%; min-height: 426px"
				scrolling="no"
				frameborder="no"
				allow="autoplay"
			></iframe>
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
			@click="playerSetTrackPosition($event)"
		></canvas>

		<div class="player-footer">
			<div class="player-footer-left">
				<button
					v-if="player.paused"
					class="button is-primary"
					@click="playerPlay()"
					@keyup.enter="playerPlay()"
					content="Resume Playback"
					v-tippy
				>
					<i class="material-icons">play_arrow</i>
				</button>
				<button
					v-else
					class="button is-primary"
					@click="playerPause()"
					@keyup.enter="playerPause()"
					content="Pause Playback"
					v-tippy
				>
					<i class="material-icons">pause</i>
				</button>
				<button
					class="button is-danger"
					@click.exact="playerStop()"
					@click.shift="playerHardStop()"
					@keyup.enter.exact="playerStop()"
					@keyup.shift.enter="playerHardStop()"
					content="Stop Playback"
					v-tippy
				>
					<i class="material-icons">stop</i>
				</button>
			</div>
			<div class="player-footer-center">
				<span>
					<span>
						{{ formatDuration(player.currentTime) }}
					</span>
					/
					<span>
						{{ formatDuration(player.duration) }}
					</span>
				</span>
			</div>
			<div class="player-footer-right">
				<p id="volume-control">
					<i
						class="material-icons"
						@click="playerToggleMute()"
						:content="`${player.muted ? 'Unmute' : 'Mute'}`"
						v-tippy
						>{{ playerVolumeControlIcon }}</i
					>
					<input
						v-model.number="player.volume"
						type="range"
						min="0"
						max="100"
						class="volume-slider active"
						@change="playerChangeVolume()"
						@input="playerChangeVolume()"
					/>
				</p>
			</div>
		</div>
	</div>
</template>

<style lang="less" scoped>
.night-mode {
	.player-section {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;

		.duration-canvas {
			background-color: var(--dark-grey-2) !important;
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

		:deep(iframe) {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			min-height: 426px;
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

			& > .playerRateDropdown {
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
