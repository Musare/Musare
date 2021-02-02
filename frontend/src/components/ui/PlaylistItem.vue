<template>
	<div class="playlist">
		<div class="left-part">
			<p class="top-text">
				{{ playlist.displayName }}
				<i
					v-if="playlist.privacy === 'private'"
					class="privateIcon material-icons"
					title="This playlist is not visible to other users."
					>lock</i
				>
			</p>
			<p class="bottom-text">
				{{ totalLength(playlist) }} •
				{{ playlist.songs.length }}
				{{ playlist.songs.length === 1 ? "song" : "songs" }}
			</p>
		</div>
		<div class="actions">
			<slot name="actions" />
		</div>
	</div>
</template>

<script>
import utils from "../../../js/utils";

export default {
	props: {
		playlist: { type: Object, default: () => {} }
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
@import "../../styles/global.scss";

.night-mode {
	.playlist {
		background-color: $dark-grey-2 !important;
		border: 0 !important;
		p {
			color: $night-mode-text !important;
		}
	}
}

.playlist {
	width: 100%;
	height: 72px;
	border: 0.5px $light-grey-2 solid;
	border-radius: 3px;
	display: flex;

	.top-text {
		color: $dark-grey-2;
		font-size: 20px;
		line-height: 23px;
		margin-bottom: 0;

		.privateIcon {
			color: $dark-pink;
			font-size: 18px;
		}
	}

	.bottom-text {
		color: $dark-grey-2;
		font-size: 16px;
		line-height: 19px;
		margin-bottom: 0;
		margin-top: 6px;

		&:first-letter {
			text-transform: uppercase;
		}
	}

	.left-part {
		flex: 1;
		padding: 12px;
	}

	.actions {
		display: flex;
		align-items: center;
		padding: 12px;

		div {
			display: flex;
			align-items: center;

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
