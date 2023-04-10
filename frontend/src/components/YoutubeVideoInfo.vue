<script setup lang="ts">
import { defineAsyncComponent } from "vue";

import utils from "@/utils";

export type YoutubeVideo = {
	_id: string;
	youtubeId: string;
	title: string;
	author: string;
	duration: number;
	uploadedAt?: Date;
};

const SongThumbnail = defineAsyncComponent(
	() => import("@/components/SongThumbnail.vue")
);

defineProps<{
	video: YoutubeVideo;
}>();
</script>

<template>
	<div class="youtube-video-info-container">
		<div class="left-section">
			<p>
				<strong>ID:</strong>
				<span :title="video._id">{{ video._id }}</span>
			</p>
			<p>
				<strong>YouTube ID:</strong>
				<a
					:href="
						'https://www.youtube.com/watch?v=' +
						`${video.youtubeId}`
					"
					target="_blank"
				>
					{{ video.youtubeId }}
				</a>
			</p>
			<p>
				<strong>Title:</strong>
				<span :title="video.title">{{ video.title }}</span>
			</p>
			<p>
				<strong>Author:</strong>
				<span :title="video.author">{{ video.author }}</span>
			</p>
			<p>
				<strong>Duration:</strong>
				<span :title="`${video.duration}`">{{ video.duration }}</span>
			</p>
			<p>
				<strong>Upload Date:</strong>
				<span
					:title="
						video.uploadedAt
							? new Date(video.uploadedAt).toString()
							: 'Unknown'
					"
					>{{
						video.uploadedAt
							? utils.getDateFormatted(video.uploadedAt)
							: "Unknown"
					}}</span
				>
			</p>
		</div>
		<div class="right-section">
			<song-thumbnail
				:song="{ mediaSource: `youtube:${video.youtubeId}` }"
				class="thumbnail-preview"
			/>
		</div>
	</div>
</template>

<style lang="less" scoped>
.night-mode {
	.youtube-video-info-container {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;

		.duration-canvas {
			background-color: var(--dark-grey-2) !important;
		}
	}
}

.youtube-video-info-container {
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
