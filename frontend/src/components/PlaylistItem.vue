<template>
	<div class="playlist-item universal-item">
		<div class="left-part">
			<p class="item-title">
				{{ playlist.displayName }}
				<i
					v-if="playlist.privacy === 'private'"
					class="private-playlist-icon material-icons"
					content="This playlist is not visible to other users."
					v-tippy="{ theme: 'info' }"
					>lock</i
				>
			</p>
			<p class="item-description">
				<span v-if="showOwner"
					><a v-if="playlist.createdBy === 'Musare'" title="Musare"
						>Musare</a
					><user-id-to-username
						v-else
						:user-id="playlist.createdBy"
						:link="true"
					/>
					•</span
				>
				{{ totalLength(playlist) }} •
				{{ playlist.songs.length }}
				{{ playlist.songs.length === 1 ? "song" : "songs" }}
			</p>
		</div>
		<div class="universal-item-actions">
			<slot name="actions" />
		</div>
	</div>
</template>

<script>
import UserIdToUsername from "@/components/UserIdToUsername.vue";
import utils from "../../js/utils";

export default {
	components: { UserIdToUsername },
	props: {
		playlist: { type: Object, default: () => {} },
		showOwner: { type: Boolean, default: false }
	},
	data() {
		return {
			utils
		};
	},
	methods: {
		totalLength(playlist) {
			let length = 0;
			playlist.songs.forEach(song => {
				length += song.duration;
			});
			return this.utils.formatTimeLong(length);
		}
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.playlist-item {
		background-color: var(--dark-grey-2) !important;
		border: 0 !important;

		p {
			color: var(--light-grey-2) !important;
		}
	}
}

.playlist-item {
	width: 100%;
	height: 72px;

	.item-title {
		color: var(--dark-grey-2);
		font-size: 20px;
		line-height: 23px;
		margin-bottom: 0;
		display: flex;
		align-items: center;

		.private-playlist-icon {
			color: var(--dark-pink);
			font-size: 18px;
			margin-left: 5px;
		}
	}

	.left-part {
		flex: 1;
		padding: 12px;
	}

	.universal-item-actions {
		div {
			display: flex;
			align-items: center;
			line-height: 1;

			button,
			.button {
				width: 100%;
				font-size: 17px;
				height: 36px;

				&:not(:last-of-type) {
					margin-right: 5px;
				}
			}
		}
	}
}
</style>
