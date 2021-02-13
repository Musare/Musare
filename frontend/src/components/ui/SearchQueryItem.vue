<template>
	<div class="universal-item search-query-item">
		<div id="thumbnail-and-info">
			<img class="item-thumbnail" :src="result.thumbnail" />
			<div id="song-info">
				<h4 class="item-title" :title="result.title">
					{{ result.title }}
				</h4>

				<!-- <p
					id="song-request-time"
					v-if="
						station.type === 'community' &&
							station.partyMode === true
					"
				>
					Requested by
					<strong>
						<user-id-to-username
							:user-id="song.requestedBy"
							:link="true"
						/>
						{{
							formatDistance(
								parseISO(song.requestedAt),
								new Date(),
								{
									addSuffix: true
								}
							)
						}}
					</strong>
				</p> -->
			</div>
		</div>
		<div class="universal-item-actions">
			<slot name="actions" />
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
.search-query-item .universal-item-actions i {
	color: #fff !important;
}

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
@import "../../styles/global.scss";

.night-mode {
	.search-query-item {
		background-color: $night-mode-bg-secondary !important;
		border: 0 !important;
	}
}

.search-query-item {
	#thumbnail-and-info,
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

	#thumbnail-and-info {
		width: calc(100% - 160px);
	}

	#song-info {
		display: flex;
		flex-direction: column;
		justify-content: center;
		margin-left: 20px;
		width: calc(100% - 65px);

		.item-title {
			font-size: 16px;
		}

		*:not(i) {
			margin: 0;
			font-family: Karla, Arial, sans-serif;
		}
	}
}
</style>
