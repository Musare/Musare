<template>
	<div class="thumbnail">
		<div
			v-if="
				song.youtubeId &&
					(!song.thumbnail ||
						(song.thumbnail &&
							(song.thumbnail.lastIndexOf('notes-transparent') !==
								-1 ||
								song.thumbnail.lastIndexOf(
									'/assets/notes.png'
								) !== -1 ||
								song.thumbnail.lastIndexOf('i.ytimg.com') !==
									-1)) ||
						song.thumbnail === 'empty' ||
						song.thumbnail == null)
			"
			class="yt-thumbnail-bg"
			:style="{
				'background-image':
					'url(' +
					`https://img.youtube.com/vi/${song.youtubeId}/mqdefault.jpg` +
					')'
			}"
		></div>
		<img
			v-if="
				song.youtubeId &&
					(!song.thumbnail ||
						(song.thumbnail &&
							(song.thumbnail.lastIndexOf('notes-transparent') !==
								-1 ||
								song.thumbnail.lastIndexOf(
									'/assets/notes.png'
								) !== -1 ||
								song.thumbnail.lastIndexOf('i.ytimg.com') !==
									-1)) ||
						song.thumbnail === 'empty' ||
						song.thumbnail == null)
			"
			:src="`https://img.youtube.com/vi/${song.youtubeId}/mqdefault.jpg`"
			onerror="this.src='/assets/notes-transparent.png'"
		/>
		<img
			v-else
			:src="song.thumbnail"
			onerror="this.src='/assets/notes-transparent.png'"
		/>
	</div>
</template>

<script>
export default {
	props: {
		song: {
			type: Object,
			default: () => {}
		}
	}
};
</script>

<style lang="scss">
.thumbnail {
	min-width: 130px;
	height: 130px;
	position: relative;
	margin-top: -15px;
	margin-bottom: -15px;
	margin-left: -10px;

	.yt-thumbnail-bg {
		height: 100%;
		width: 100%;
		position: absolute;
		top: 0;
		filter: blur(1px);
		background: url("/assets/notes-transparent.png") no-repeat center center;
	}

	img {
		height: auto;
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
}
</style>
