<template>
	<div class="universal-item playlist-song-item">
		<div id="thumbnail-and-info">
			<img
				v-if="song.thumbnail"
				class="item-thumbnail"
				:src="song.thumbnail"
				onerror="this.src='/assets/notes-transparent.png'"
			/>
			<img
				v-else
				class="item-thumbnail"
				src="/assets/notes-transparent.png"
			/>
			<div id="song-info">
				<h4 class="item-title" :title="song.title">
					{{ song.title }}
				</h4>
				<h5
					class="item-description"
					v-if="song.artists"
					:style="
						song.artists.length < 1 ? { fontSize: '16px' } : null
					"
					:title="song.artists.join(', ')"
				>
					{{ song.artists.join(", ") }}
				</h5>
			</div>
		</div>
		<div class="universal-item-actions">
			<slot name="actions" />
			<i
				class="material-icons add-to-playlist-icon"
				v-if="loggedIn"
				@click="showPlaylistDropdown = !showPlaylistDropdown"
			>
				queue
			</i>
		</div>
		<add-to-playlist-dropdown v-if="showPlaylistDropdown" :song="song" />
	</div>
</template>

<script>
import { mapState } from "vuex";

import AddToPlaylistDropdown from "../../../ui/AddToPlaylistDropdown.vue";

export default {
	components: { AddToPlaylistDropdown },
	props: {
		song: {
			type: Object,
			default: () => {}
		}
	},
	data() {
		return {
			showPlaylistDropdown: false
		};
	},
	computed: mapState({
		loggedIn: state => state.user.auth.loggedIn
	})
};
</script>

<style lang="scss" scoped>
.night-mode {
	.playlist-song-item {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;
	}
}

/deep/ #nav-dropdown {
	margin-top: 36px;
	width: 0;
	height: 0;

	.nav-dropdown-items {
		width: 250px;
		max-width: 100vw;
		position: relative;
		right: 250px;
	}
}

.playlist-song-item {
	width: 100%;

	#thumbnail-and-info,
	.universal-item-actions div {
		display: flex;
		align-items: center;
	}

	.universal-item-actions {
		margin-left: 5px;

		i {
			margin-left: 5px;
		}
	}

	.item-thumbnail {
		width: 55px;
		height: 55px;
	}

	#thumbnail-and-info {
		width: calc(100% - 120px);
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
