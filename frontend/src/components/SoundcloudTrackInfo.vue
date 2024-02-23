<script setup lang="ts">
import { defineAsyncComponent } from "vue";

import utils from "@/utils";

export type SoundcloudTrack = {
	_id: string;
	trackId: string;
	userPermalink: string;
	permalink: string;
	title: string;
	username: string;
	duration: number;
	soundcloudCreatedAt: string;
	artworkUrl: string;
};

const SongThumbnail = defineAsyncComponent(
	() => import("@/components/SongThumbnail.vue")
);

defineProps<{
	track: SoundcloudTrack;
}>();
</script>

<template>
	<div class="soundcloud-track-info-container">
		<div class="left-section">
			<p>
				<strong>ID:</strong>
				<span :title="track._id">{{ track._id }}</span>
			</p>
			<p>
				<strong>SoundCloud ID:</strong>
				<a
					:href="`https://soundcloud.com/${track.userPermalink}/${track.permalink}`"
					target="_blank"
				>
					{{ track.trackId }}
				</a>
			</p>
			<p>
				<strong>Title:</strong>
				<span :title="track.title">{{ track.title }}</span>
			</p>
			<p>
				<strong>Artist:</strong>
				<span :title="track.username">{{ track.username }}</span>
			</p>
			<p>
				<strong>Duration:</strong>
				<span :title="`${track.duration}`">{{ track.duration }}</span>
			</p>
			<p>
				<strong>Created Date:</strong>
				<span
					:title="
						track.soundcloudCreatedAt
							? new Date(track.soundcloudCreatedAt).toString()
							: 'Unknown'
					"
					>{{
						track.soundcloudCreatedAt
							? utils.getDateFormatted(
									new Date(track.soundcloudCreatedAt)
								)
							: "Unknown"
					}}</span
				>
			</p>
		</div>
		<div class="right-section">
			<song-thumbnail
				:song="{
					mediaSource: `soundcloud:${track.trackId}`,
					thumbnail: track.artworkUrl
				}"
				class="thumbnail-preview"
			/>
		</div>
	</div>
</template>

<style lang="less" scoped>
.night-mode {
	.soundcloud-track-info-container {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;

		.duration-canvas {
			background-color: var(--dark-grey-2) !important;
		}
	}
}

.soundcloud-track-info-container {
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
</style>
