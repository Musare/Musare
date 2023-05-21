<script setup lang="ts">
import { computed } from "vue";

const props = defineProps({
	type: { type: String, required: true },
	data: {
		type: Object,
		required: true
	}
});

const imageUrl = computed(() => {
	if (props.type === "youtube")
		return props.data.rawData.snippet.thumbnails.default.url;
	if (props.type === "soundcloud") return props.data.avatarUrl;
	if (props.type === "spotify") return props.data.rawData.images[0].url;
	return null;
});

const artistUrl = computed(() => {
	if (props.type === "youtube")
		return `https://youtube.com/channel/${props.data.channelId}`;
	if (props.type === "soundcloud")
		return `https://soundcloud.com/${props.data.permalink}`;
	if (props.type === "spotify")
		return `https://open.spotify.com/artist/${props.data.artistId}`;
	return null;
});

const artistName = computed(() => {
	if (props.type === "youtube") return props.data.title;
	if (props.type === "soundcloud") return props.data.username;
	if (props.type === "spotify") return props.data.rawData.name;
	return null;
});
</script>

<template>
	<div class="artist-item">
		<img v-if="imageUrl" :src="imageUrl" alt="Artist image" />
		<a :href="artistUrl" target="_blank"
			><div :class="`${type}-icon`"></div
		></a>
		<span>
			{{ artistName }}
		</span>
	</div>
</template>

<style lang="less">
.artist-item {
	display: flex;
	flex-direction: row;
	gap: 8px;
	align-items: center;
	outline: 1px solid white;
	border-radius: 4px;

	img {
		max-height: 88px;
		max-width: 88px;
	}

	.youtube-icon,
	.soundcloud-icon,
	.spotify-icon {
		width: 30px;
		max-width: 30px;
		height: 30px;
		max-height: 30px;
	}
}
</style>
