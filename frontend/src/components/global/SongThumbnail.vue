<script setup lang="ts">
import { ref, computed, watch } from "vue";

const props = defineProps({
	song: { type: Object, default: () => {} },
	fallback: { type: Boolean, default: true }
});

const emit = defineEmits(["loadError"]);

const loadError = ref(0);

const isYoutubeThumbnail = computed(
	() =>
		props.song.youtubeId &&
		((props.song.thumbnail &&
			(props.song.thumbnail.lastIndexOf("i.ytimg.com") !== -1 ||
				props.song.thumbnail.lastIndexOf("img.youtube.com") !== -1)) ||
			(props.fallback &&
				(!props.song.thumbnail ||
					(props.song.thumbnail &&
						(props.song.thumbnail.lastIndexOf(
							"notes-transparent"
						) !== -1 ||
							props.song.thumbnail.lastIndexOf(
								"/assets/notes.png"
							) !== -1 ||
							props.song.thumbnail === "empty")) ||
					loadError.value === 1)))
);

const onLoadError = () => {
	// Error codes
	// -1 - Error occured, fallback disabled
	// 0 - No errors
	// 1 - Error occured with thumbnail, fallback enabled
	// 2 - Error occured with youtube thumbnail, fallback enabled
	if (!props.fallback) loadError.value = -1;
	else if (loadError.value === 0 && !isYoutubeThumbnail.value)
		loadError.value = 1;
	else loadError.value = 2;
	emit("loadError", loadError.value);
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
	<div
		:class="{
			thumbnail: true,
			'youtube-thumbnail': isYoutubeThumbnail
		}"
	>
		<slot name="icon" />
		<div
			v-if="-1 < loadError && loadError < 2 && isYoutubeThumbnail"
			class="yt-thumbnail-bg"
			:style="{
				'background-image':
					'url(' +
					`https://img.youtube.com/vi/${song.youtubeId}/mqdefault.jpg` +
					')'
			}"
		></div>
		<img
			v-if="-1 < loadError && loadError < 2 && isYoutubeThumbnail"
			loading="lazy"
			:src="`https://img.youtube.com/vi/${song.youtubeId}/mqdefault.jpg`"
			@error="onLoadError"
		/>
		<img
			v-else-if="loadError <= 0"
			loading="lazy"
			:src="song.thumbnail"
			@error="onLoadError"
		/>
		<img v-else loading="lazy" src="/assets/notes-transparent.png" />
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

	.yt-thumbnail-bg {
		display: none;
	}

	img {
		height: 100%;
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

	&.youtube-thumbnail {
		.yt-thumbnail-bg {
			height: 100%;
			width: 100%;
			display: block;
			position: absolute;
			top: 0;
			filter: blur(1px);
			background: url("/assets/notes-transparent.png") no-repeat center
				center;
		}

		img {
			height: auto;
		}
	}
}
</style>
