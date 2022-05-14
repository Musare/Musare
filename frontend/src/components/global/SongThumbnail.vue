<template>
	<div
		:class="{
			thumbnail: true,
			'youtube-thumbnail': isYoutubeThumbnail
		}"
	>
		<slot name="icon" />
		<div
			v-if="-1 < loadError < 2 && isYoutubeThumbnail"
			class="yt-thumbnail-bg"
			:style="{
				'background-image':
					'url(' +
					`https://img.youtube.com/vi/${song.youtubeId}/mqdefault.jpg` +
					')'
			}"
		></div>
		<img
			v-if="-1 < loadError < 2 && isYoutubeThumbnail"
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

<script>
export default {
	props: {
		song: {
			type: Object,
			default: () => {}
		},
		fallback: {
			type: Boolean,
			default: true
		}
	},
	emits: ["loadError"],
	data() {
		return {
			loadError: 0
		};
	},
	computed: {
		isYoutubeThumbnail() {
			return (
				this.song.youtubeId &&
				((this.song.thumbnail &&
					(this.song.thumbnail.lastIndexOf("i.ytimg.com") !== -1 ||
						this.song.thumbnail.lastIndexOf("img.youtube.com") !==
							-1)) ||
					(this.fallback &&
						(!this.song.thumbnail ||
							(this.song.thumbnail &&
								(this.song.thumbnail.lastIndexOf(
									"notes-transparent"
								) !== -1 ||
									this.song.thumbnail.lastIndexOf(
										"/assets/notes.png"
									) !== -1 ||
									this.song.thumbnail === "empty")) ||
							this.loadError === 1)))
			);
		}
	},
	watch: {
		song() {
			this.loadError = 0;
			this.$emit("loadError", this.loadError);
		}
	},
	methods: {
		onLoadError() {
			// Error codes
			// -1 - Error occured, fallback disabled
			// 0 - No errors
			// 1 - Error occured with thumbnail, fallback enabled
			// 2 - Error occured with youtube thumbnail, fallback enabled
			if (!this.fallback) this.loadError = -1;
			else if (this.loadError === 0 && !this.isYoutubeThumbnail)
				this.loadError = 1;
			else this.loadError = 2;
			this.$emit("loadError", this.loadError);
		}
	}
};
</script>

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
