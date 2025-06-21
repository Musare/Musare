<script lang="ts" setup>
import { storeToRefs } from "pinia";
import {
	computed,
	defineAsyncComponent,
	onBeforeUnmount,
	onMounted,
	ref,
	watch
} from "vue";
import { Duration } from "dayjs/plugin/duration";
import dayjs, { Dayjs } from "@/dayjs";
import { useConfigStore } from "@/stores/config";
import { Song } from "@/types/song";

const YoutubePlayer = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/YoutubePlayer.vue")
);

/**
 * TODO:
 * - provide youtubePlayer with youtubeId during createPlayer
 * 	- should source be tracked and loaded/cued in YT?
 * 		- would also need to track/calc timeElapsed and skipDuration
 * - volume
 * - autoPlay
 * - UI
 * - seekTo on progress bar for standalone
 * - Experimental: Soundcloud, listenMode, mediaSession
 * - activityWatch
 * */

const props = defineProps<{
	source?: Song;
	sourceStartedAt?: Dayjs;
	sourcePausedAt?: Dayjs;
	sourceTimePaused?: Duration;
	sourceTimeOffset?: Duration;
	syncPlayerTimeEnabled?: boolean;
}>();

const emit = defineEmits(["error", "notFound", "notAllowed"]);

const configStore = useConfigStore();

const { experimental } = storeToRefs(configStore);

const updateTimeElapsedTimeout = ref();
const syncPlayerTimeWithElapsedTimeout = ref();
const isYoutubeReady = ref(false);
const isYoutubeLoading = ref(false);
const youtubePlayer = ref<typeof YoutubePlayer>();
const soundcloudPlayer = ref();
const timeElapsed = ref(dayjs.duration(0));
const isAutomaticallyPaused = ref(false);
const playerStartedAt = ref(dayjs());
const playerPausedAt = ref<Dayjs>();
const playerTimePaused = ref(dayjs.duration(0));

const sourceType = computed(() => props.source?.mediaSource.split(":")[0]);
const sourceId = computed(() => props.source?.mediaSource.split(":")[1]);
const isSourceControlled = computed(() => !!props.sourceStartedAt);
const mediaStartedAt = computed(() =>
	isSourceControlled.value ? props.sourceStartedAt : playerStartedAt.value
);
const mediaPausedAt = computed(() =>
	isSourceControlled.value ? props.sourcePausedAt : playerPausedAt.value
);
const mediaTimePaused = computed(() =>
	isSourceControlled.value ? props.sourceTimePaused : playerTimePaused.value
);
const isSourcePaused = computed(
	() => isSourceControlled.value && !!props.sourcePausedAt
);
const isMediaPaused = computed(
	() => !!playerPausedAt.value || isSourcePaused.value
);
const playerState = computed(() => {
	if (!props.source) return "no_song";
	// if (
	// 	experimentalChangableListenModeEnabled.value &&
	// 	experimentalChangableListenMode.value === "participate"
	// )
	// 	return "participate";
	if (!isYoutubeReady.value || isYoutubeLoading.value) return "buffering";
	if (isAutomaticallyPaused.value) return "unavailable";
	if (isMediaPaused.value) return "local_paused";
	// if (volumeSliderValue.value === 0 || muted.value) return "muted";
	return "playing";
});

const getTimeElapsed = () => {
	if (!props.source) return dayjs.duration(0);

	let currentTime = dayjs().valueOf();

	if (props.sourceTimeOffset) {
		currentTime += props.sourceTimeOffset.asMilliseconds();
	}

	let timePaused = mediaTimePaused.value.asMilliseconds();

	if (mediaPausedAt.value) {
		timePaused += currentTime - mediaPausedAt.value.valueOf();
	}

	return dayjs.duration(
		currentTime - mediaStartedAt.value.valueOf() - timePaused
	);
};

const updateTimeElapsed = () => {
	clearTimeout(updateTimeElapsedTimeout.value);

	if (!props.source) {
		timeElapsed.value = dayjs.duration(0);

		updateTimeElapsedTimeout.value = setTimeout(updateTimeElapsed, 150);

		return;
	}

	const elapsed = getTimeElapsed();

	if (elapsed.asSeconds() > props.source.duration) {
		timeElapsed.value = dayjs.duration(props.source.duration, "s");
	} else {
		timeElapsed.value = elapsed;
	}

	updateTimeElapsedTimeout.value = setTimeout(updateTimeElapsed, 150);
};

const cueMedia = () => {
	console.log("CUEMEDIA");

	youtubePlayer.value.cue(
		sourceId.value,
		timeElapsed.value.asSeconds() + props.source.skipDuration
	);
};

const loadMedia = () => {
	console.log("LOADMEDIA");

	youtubePlayer.value.load(
		sourceId.value,
		timeElapsed.value.asSeconds() + props.source.skipDuration
	);
};

const resumeMedia = () => {
	console.log("RESUMEMEDIA");
	youtubePlayer.value.play();
};

const pauseMedia = () => {
	console.log("PAUSEMEDIA");
	youtubePlayer.value.pause();
};

const stopMedia = () => {
	youtubePlayer.value.stop();
};

const getMediaCurrentTime = () => youtubePlayer.value.getCurrentTime();

const seekPlayer = () => {
	console.log(
		"SEEK",
		timeElapsed.value.asSeconds(),
		props.source.skipDuration
	);
	youtubePlayer.value.seekTo(
		timeElapsed.value.asSeconds() + props.source.skipDuration
	);
};

const getPlayerPlaybackRate = () => youtubePlayer.value.getPlaybackRate();

const setPlayerPlaybackRate = (playbackRate: number) => {
	if (getPlayerPlaybackRate() === playbackRate) return;

	console.log("PLAYBACKRATE", playbackRate);
	youtubePlayer.value.setPlaybackRate(playbackRate);
};

const applySourceState = () => {
	if (!isYoutubeReady.value || isYoutubeLoading.value) return;
	console.log("APPLYSOURCESTATE", isMediaPaused.value);

	if (isMediaPaused.value) {
		pauseMedia();

		return;
	}

	seekPlayer();

	resumeMedia();
};

const applySource = () => {
	if (!isYoutubeReady.value) return;
	console.log("APPLYSOURCE", isMediaPaused.value);

	playerStartedAt.value = dayjs();

	updateTimeElapsed();

	isYoutubeLoading.value = true;

	if (isMediaPaused.value) cueMedia();
	else loadMedia();
};

const resumePlayer = () => {
	playerTimePaused.value = playerTimePaused.value.add(
		playerPausedAt.value?.diff() ?? 0
	);
	playerPausedAt.value = null;
	isAutomaticallyPaused.value = false;

	applySourceState();
};

const pausePlayer = () => {
	playerPausedAt.value = dayjs();

	applySourceState();
};

const stopPlayer = () => {
	playerStartedAt.value = dayjs();
	playerPausedAt.value = dayjs();
	playerTimePaused.value = dayjs.duration(0);

	stopMedia();

	updateTimeElapsed();
};

const onYoutubeReady = () => {
	isYoutubeReady.value = true;

	applySource();
};

const onYoutubeError = (event: YT.OnErrorEvent) => {
	isAutomaticallyPaused.value = true;

	switch (event.data) {
		case 100:
			emit("notFound");
			break;
		case 101:
		case 150:
			emit("notAllowed");
			break;
		default:
			emit("error", "There has been an error with the YouTube Embed.");
			break;
	}
};

const onYoutubeStateChange = (event: YT.OnStateChangeEvent) => {
	console.log("STATECHANGE", event.data, isYoutubeLoading.value);

	if (isYoutubeLoading.value) {
		const loadedStates = [
			YT.PlayerState.ENDED,
			YT.PlayerState.PLAYING,
			YT.PlayerState.PAUSED,
			YT.PlayerState.CUED
		];
		if (!loadedStates.includes(event.data)) return;

		console.log("LOADED");
		isYoutubeLoading.value = false;

		applySourceState();

		return;
	}

	if (
		event.data !== YT.PlayerState.PAUSED &&
		event.data !== YT.PlayerState.PLAYING
	) {
		return;
	}

	if (isSourcePaused.value) {
		seekPlayer();

		pauseMedia();

		return;
	}

	if (event.data === YT.PlayerState.PAUSED) {
		pausePlayer();

		return;
	}

	if (!playerPausedAt.value && !isAutomaticallyPaused.value) {
		return;
	}

	resumePlayer();
};

const syncPlayerTimeWithElapsed = () => {
	clearTimeout(syncPlayerTimeWithElapsedTimeout.value);

	if (
		!props.syncPlayerTimeEnabled ||
		!isYoutubeReady.value ||
		isYoutubeLoading.value ||
		isMediaPaused.value
	) {
		syncPlayerTimeWithElapsedTimeout.value = setTimeout(
			syncPlayerTimeWithElapsed,
			150
		);

		return;
	}

	const difference = timeElapsed.value
		.subtract(
			Math.max(getMediaCurrentTime() - props.source.skipDuration, 0),
			"s"
		)
		.asMilliseconds();
	// console.log("DIFFERENCE", difference);

	if (difference < -2000 || difference > 2000) {
		seekPlayer();
	} else if (difference < -200) {
		setPlayerPlaybackRate(0.8);
	} else if (difference < -50) {
		setPlayerPlaybackRate(0.9);
	} else if (difference < -25) {
		setPlayerPlaybackRate(0.95);
	} else if (difference > 200) {
		setPlayerPlaybackRate(1.2);
	} else if (difference > 50) {
		setPlayerPlaybackRate(1.1);
	} else if (difference > 25) {
		setPlayerPlaybackRate(1.05);
	} else {
		setPlayerPlaybackRate(1.0);
	}

	syncPlayerTimeWithElapsedTimeout.value = setTimeout(
		syncPlayerTimeWithElapsed,
		150
	);
};

watch(() => props.source, applySource);
watch(() => [props.sourceStartedAt, props.sourcePausedAt], applySourceState);

defineExpose({
	isMediaPaused,
	playerState,
	resumePlayer,
	pausePlayer,
	stopPlayer
});

onMounted(() => {
	updateTimeElapsed();
	syncPlayerTimeWithElapsed();
});

onBeforeUnmount(() => {
	clearTimeout(updateTimeElapsedTimeout.value);
	clearTimeout(syncPlayerTimeWithElapsedTimeout.value);
});
</script>

<template>
	<div class="media-player">
		<div class="media-player__player">
			<YoutubePlayer
				v-show="sourceType === 'youtube'"
				ref="youtubePlayer"
				:video-id="sourceId"
				@ready="onYoutubeReady"
				@error="onYoutubeError"
				@state-change="onYoutubeStateChange"
			/>
			<iframe
				v-if="experimental.soundcloud"
				v-show="sourceType === 'soundcloud'"
				ref="soundcloudPlayer"
				style="width: 100%; height: 100%; min-height: 200px"
				scrolling="no"
				frameborder="no"
				allow="autoplay"
			></iframe>
			<div v-if="isSourcePaused" class="media-player__overlay">
				<slot name="sourcePausedReason" />
			</div>
			<div
				v-else-if="playerPausedAt"
				class="media-player__overlay"
				@click.prevent="resumePlayer"
			>
				<p><strong>Playback paused</strong></p>
				<p>Click here to continue playback.</p>
			</div>
			<div
				v-else-if="isAutomaticallyPaused"
				class="media-player__overlay"
			>
				<img
					class="media-player__bouncer"
					src="/assets/notes-transparent.png"
				/>
				<p><strong>Unable to play</strong></p>
				<p>
					This media is unavailable for you, please try another
					source.
				</p>
			</div>
		</div>
		<div class="media-player__controls">
			<button
				v-if="playerPausedAt || isAutomaticallyPaused"
				@click.prevent="resumePlayer"
			>
				Resume
			</button>
			<button v-else @click.prevent="pausePlayer">Pause</button>
		</div>
		<div class="media-player__controls">
			{{ timeElapsed.formatDuration() }} /
			{{ dayjs.duration(source.duration, "s").formatDuration() }}
			<progress :value="timeElapsed.asSeconds()" :max="source.duration" />
		</div>
	</div>
</template>

<style lang="less" scoped>
.media-player {
	display: flex;
	flex-direction: column;
	flex-grow: 1;

	&__player {
		position: relative;
		display: flex;
		flex-direction: column;
		aspect-ratio: 16/9;
		overflow: hidden;
		border: solid 1px var(--light-grey-1);
		border-radius: 5px;
	}

	&__overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		height: 100%;
		background: var(--primary-color);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 10px;
		gap: 5px;

		:deep(p) {
			color: var(--white);
			text-align: center;
		}
	}

	&__controls {
		display: flex;
		flex-grow: 1;
		gap: 5px;
		align-items: center;

		progress {
			flex-grow: 1;
		}
	}
}
</style>
