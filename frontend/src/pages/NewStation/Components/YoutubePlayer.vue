<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps<{
	videoId: string;
}>();

const emit = defineEmits(["ready", "error", "stateChange"]);

const player = ref<YT.Player | null>(null);
const playerElement = ref();
const interval = ref();

const createPlayer = () => {
	player.value = new YT.Player(playerElement.value, {
		height: 270,
		width: 480,
		videoId: props.videoId,
		host: "https://www.youtube-nocookie.com",
		playerVars: {
			controls: 0,
			iv_load_policy: 3,
			rel: 0,
			showinfo: 0,
			disablekb: 1,
			playsinline: 1
		},
		events: {
			onReady: event => emit("ready", event),
			onError: event => emit("error", event),
			onStateChange: event => emit("stateChange", event)
		}
	});
};

const destroyPlayer = () => {
	player.value?.destroy();
};

const cue = (youtubeId: string, startSeconds?: number) => {
	player.value?.cueVideoById(youtubeId, startSeconds);
};

const load = (youtubeId: string, startSeconds?: number) => {
	player.value?.loadVideoById(youtubeId, startSeconds);
};

const play = () => {
	player.value?.playVideo();
};

const pause = () => {
	player.value?.pauseVideo();
};

const stop = () => {
	player.value?.stopVideo();
};

const seekTo = (seconds: number) => {
	player.value?.seekTo(seconds, true);
};

const getCurrentTime = () => player.value?.getCurrentTime() ?? 0;

const getPlaybackRate = () => player.value?.getPlaybackRate() ?? 1.0;

const setPlaybackRate = (playbackRate: number) => {
	player.value?.setPlaybackRate(playbackRate);
};

defineExpose({
	cue,
	load,
	play,
	pause,
	stop,
	seekTo,
	getCurrentTime,
	getPlaybackRate,
	setPlaybackRate
});

onMounted(() => {
	createPlayer();
});

onBeforeUnmount(() => {
	clearInterval(interval.value);
	destroyPlayer();
});
</script>

<template>
	<div
		ref="playerElement"
		style="width: 100%; height: 100%; min-height: 200px"
	/>
</template>

<style lang="less" scoped></style>
