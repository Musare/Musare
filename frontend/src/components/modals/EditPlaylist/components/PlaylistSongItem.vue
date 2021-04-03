<template>
	<div class="universal-item playlist-song-item">
		<div id="thumbnail-and-info">
			<img
				class="item-thumbnail"
				:src="
					song.songId &&
					(!song.thumbnail ||
						(song.thumbnail &&
							(song.thumbnail.lastIndexOf('notes-transparent') !==
								-1 ||
								song.thumbnail.lastIndexOf(
									'/assets/notes.png'
								) !== -1)) ||
						song.thumbnail === 'empty' ||
						song.thumbnail == null)
						? `https://img.youtube.com/vi/${song.songId}/mqdefault.jpg`
						: song.thumbnail
				"
				onerror="this.src='/assets/notes-transparent.png'"
			/>
			<div id="song-info">
				<h4 class="item-title" :title="song.title">
					{{ song.title }}
					<i
						v-if="song.status === 'verified'"
						class="material-icons verified-song"
						content="Verified Song"
						v-tippy
					>
						check_circle
					</i>
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
			<tippy
				v-if="loggedIn"
				interactive="true"
				placement="left"
				theme="songActions"
				trigger="click"
			>
				<template #trigger>
					<i
						class="material-icons action-dropdown-icon"
						content="Song Options"
						v-tippy
						>more_horiz</i
					>
				</template>
				<a
					target="_blank"
					:href="`https://www.youtube.com/watch?v=${song.songId}`"
					content="View on Youtube"
					v-tippy
				>
					<div class="youtube-icon"></div>
				</a>
				<i
					class="material-icons report-icon"
					@click="reportSongInPlaylist(song)"
					content="Report Song"
					v-tippy
				>
					flag
				</i>
				<add-to-playlist-dropdown :song="song">
					<i
						slot="button"
						class="material-icons add-to-playlist-icon"
						content="Add Song to Playlist"
						v-tippy
						>queue</i
					>
				</add-to-playlist-dropdown>
				<i
					v-if="userRole === 'admin'"
					class="material-icons edit-icon"
					@click="editSongInPlaylist(song)"
					content="Edit Song"
					v-tippy
				>
					edit
				</i>
				<slot name="remove" />
				<slot name="actions" />
			</tippy>
			<a
				v-else
				target="_blank"
				:href="`https://www.youtube.com/watch?v=${song.songId}`"
				content="View on Youtube"
				v-tippy
			>
				<div class="youtube-icon"></div>
			</a>
		</div>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";

import AddToPlaylistDropdown from "../../../ui/AddToPlaylistDropdown.vue";

export default {
	components: { AddToPlaylistDropdown },
	props: {
		song: {
			type: Object,
			default: () => {}
		}
	},
	computed: mapState({
		loggedIn: state => state.user.auth.loggedIn,
		userRole: state => state.user.auth.role
	}),
	methods: {
		editSongInPlaylist(song) {
			this.editSong(song);
			this.openModal({ sector: "admin", modal: "editSong" });
		},
		reportSongInPlaylist(song) {
			this.reportSong(song);
			this.openModal({ sector: "station", modal: "report" });
		},
		...mapActions("modals/editSong", ["editSong"]),
		...mapActions("modals/report", ["reportSong"]),
		...mapActions("modalVisibility", ["openModal"])
	}
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
		width: calc(100% - 50px);
	}

	#song-info {
		display: flex;
		flex-direction: column;
		justify-content: center;
		margin-left: 20px;
		width: calc(100% - 50px);

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
