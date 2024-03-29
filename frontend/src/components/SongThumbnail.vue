<script setup lang="ts">
import { ref, computed, watch } from "vue";

const props = defineProps({
	song: { type: Object, default: () => {} },
	fallback: { type: Boolean, default: true }
});

const emit = defineEmits(["loadError"]);

const loadError = ref(0);
const loaded = ref(false);

const isYoutubeThumbnail = computed(
	() =>
		props.song.thumbnail &&
		(props.song.thumbnail.lastIndexOf("i.ytimg.com") !== -1 ||
			props.song.thumbnail.lastIndexOf("img.youtube.com") !== -1)
);

const isNotesThumbnail = computed(
	() =>
		!props.song.thumbnail ||
		(props.song.thumbnail &&
			(props.song.thumbnail.lastIndexOf("notes-transparent") !== -1 ||
				props.song.thumbnail.lastIndexOf("/assets/notes.png") !== -1 ||
				props.song.thumbnail === "empty"))
);

const thumbnail = computed(() => {
	if (
		(loadError.value === 0 &&
			!(isNotesThumbnail.value || isYoutubeThumbnail.value)) ||
		!props.fallback ||
		loadError.value === -1
	)
		return props.song.thumbnail;

	const { mediaSource, youtubeId } = props.song;
	if (
		loadError.value < 2 &&
		((mediaSource && mediaSource.startsWith("youtube:")) || youtubeId)
	)
		return `https://img.youtube.com/vi/${
			mediaSource ? mediaSource.split(":")[1] : youtubeId
		}/mqdefault.jpg`;
	return "/assets/notes-transparent.png";
});

const backgroundVisible = computed(
	() =>
		loaded.value &&
		thumbnail.value !== "/assets/notes-transparent.png" &&
		!((!props.fallback || loadError.value === -1) && isNotesThumbnail.value)
);

const onLoadError = () => {
	// Error codes
	// -1 - Error occured, fallback disabled
	// 0 - No errors
	// 1 - Error occured with thumbnail, fallback to YouTube
	// 2 - Error occured with thumbnail, fallback to notes
	if (!props.fallback) loadError.value = -1;
	else if (
		loadError.value === 0 &&
		!(isNotesThumbnail.value || isYoutubeThumbnail.value) &&
		((props.song.mediaSource &&
			props.song.mediaSource.startsWith("youtube:")) ||
			props.song.youtubeId)
	)
		loadError.value = 1;
	else loadError.value = 2;
	emit("loadError", loadError.value);
};

const onLoad = () => {
	loaded.value = true;
};

watch(
	() => props.song,
	() => {
		loadError.value = 0;
		emit("loadError", loadError.value);
	}
);
</script>

<template>
	<div class="thumbnail">
		<slot name="icon" />
		<div
			v-if="backgroundVisible"
			class="thumbnail-bg"
			:style="{
				'background-image': `url('${thumbnail}')`
			}"
		></div>
		<img
			loading="lazy"
			:src="thumbnail"
			@error="onLoadError"
			@load="onLoad"
		/>
	</div>
</template>

<style lang="less">
.thumbnail {
	min-width: 130px;
	height: 130px;
	position: relative;
	margin-top: -15px;
	margin-bottom: -15px;
	margin-left: -10px;
	overflow: hidden;

	img {
		width: 100%;
		margin-top: auto;
		margin-bottom: auto;
		z-index: 1;
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
	}

	.thumbnail-bg {
		height: 100%;
		width: 100%;
		display: block;
		position: absolute;
		top: 0;
		filter: blur(1px);
		background: url("/assets/notes-transparent.png") no-repeat center center;
		background-size: cover;
	}
}
</style>
