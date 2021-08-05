<template>
	<div class="universal-item search-query-item">
		<div class="thumbnail-and-info">
			<img class="item-thumbnail" :src="result.thumbnail" />
			<div class="song-info">
				<h4 class="item-title" :title="result.title">
					{{ result.title }}
				</h4>
				<a
					v-if="result.channelTitle && result.channelId"
					class="item-description"
					:title="result.channelTitle"
					:href="'https://youtube.com/channel/' + result.channelId"
					target="_blank"
				>
					{{ result.channelTitle }}
				</a>
			</div>
		</div>

		<div class="universal-item-actions">
			<tippy
				:touch="true"
				:interactive="true"
				placement="left"
				theme="songActions"
				ref="songActions"
				trigger="click"
			>
				<i
					class="material-icons action-dropdown-icon"
					content="Song Options"
					v-tippy
					>more_horiz</i
				>

				<template #content>
					<div class="icons-group">
						<a
							target="_blank"
							:href="`https://www.youtube.com/watch?v=${result.id}`"
							content="View on Youtube"
							v-tippy
						>
							<div class="youtube-icon"></div>
						</a>
						<slot name="actions" />
					</div>
				</template>
			</tippy>
		</div>
	</div>
</template>

<script>
export default {
	props: {
		result: {
			type: Object,
			default: () => {}
		}
	}
};
</script>

<style lang="scss">
.search-query-actions-enter-active {
	transition: all 0.2s ease;
}

.search-query-actions-leave-active {
	transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.search-query-actions-enter {
	transform: translateX(-20px);
	opacity: 0;
}

.search-query-actions-leave-to {
	transform: translateX(20px);
	opacity: 0;
}
</style>

<style lang="scss" scoped>
.night-mode {
	.search-query-item {
		background-color: var(--dark-grey-2) !important;
		border: 0 !important;
	}
}

.search-query-item {
	.thumbnail-and-info,
	.universal-item-actions {
		display: flex;
		align-items: center;
	}

	.universal-item-actions {
		margin-left: 5px;
	}

	.item-thumbnail {
		width: 55px;
		height: 55px;
	}

	.thumbnail-and-info {
		width: calc(100% - 160px);
	}

	.song-info {
		display: flex;
		flex-direction: column;
		justify-content: center;
		margin-left: 20px;
		width: calc(100% - 65px);

		.item-title {
			font-size: 20px;
		}

		.item-description {
			margin: 0;
			font-size: 14px;
		}

		*:not(i) {
			margin: 0;
			font-family: Karla, Arial, sans-serif;
		}
	}
}
</style>
