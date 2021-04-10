<template>
	<div class="universal-item song-item">
		<div class="thumbnail-and-info">
			<song-thumbnail :class="{ large: largeThumbnail }" :song="song" />
			<div class="song-info">
				<h6 v-if="header">{{ header }}</h6>
				<div class="song-title">
					<h4
						class="item-title"
						:style="
							song.artists && song.artists.length < 1
								? { fontSize: '16px' }
								: null
						"
						:title="song.title"
					>
						{{ song.title }}
					</h4>
					<i
						v-if="song.status === 'verified'"
						class="material-icons verified-song"
						content="Verified Song"
						v-tippy
					>
						check_circle
					</i>
				</div>
				<h5
					class="item-description"
					v-if="song.artists"
					:title="song.artists.join(', ')"
				>
					{{ song.artists.join(", ") }}
				</h5>
				<p
					class="song-request-time"
					v-if="requestedBy && song.requestedBy"
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
									includeSeconds: true
								}
							)
						}}
						ago
					</strong>
				</p>
			</div>
		</div>

		<div class="duration-and-actions">
			<p v-if="duration" class="song-duration">
				{{ utils.formatTime(song.duration) }}
			</p>
			<div class="universal-item-actions">
				<tippy
					v-if="loggedIn"
					interactive="true"
					placement="left"
					theme="songActions"
					ref="songActions"
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
						@click="report(song)"
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
							>playlist_add</i
						>
					</add-to-playlist-dropdown>
					<i
						v-if="loggedIn && userRole === 'admin'"
						class="material-icons edit-icon"
						@click="edit(song)"
						content="Edit Song"
						v-tippy
					>
						edit
					</i>
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
	</div>
</template>

<script>
import { mapActions, mapState } from "vuex";
import { formatDistance, parseISO } from "date-fns";

import AddToPlaylistDropdown from "./AddToPlaylistDropdown.vue";
import UserIdToUsername from "./UserIdToUsername.vue";
import SongThumbnail from "./SongThumbnail.vue";
import utils from "../../js/utils";

export default {
	components: { UserIdToUsername, AddToPlaylistDropdown, SongThumbnail },
	props: {
		song: {
			type: Object,
			default: () => {}
		},
		requestedBy: {
			type: Boolean,
			default: false
		},
		duration: {
			type: Boolean,
			default: true
		},
		largeThumbnail: {
			type: Boolean,
			default: false
		},
		header: {
			type: String,
			default: null
		}
	},
	data() {
		return {
			utils
		};
	},
	computed: {
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			userRole: state => state.user.auth.role
		})
	},
	methods: {
		hideTippyElements() {
			this.$refs.songActions.tip.hide();

			setTimeout(
				() =>
					Array.from(
						document.querySelectorAll(".tippy-popper")
					).forEach(popper => popper._tippy.hide()),
				500
			);
		},
		report(song) {
			this.hideTippyElements();
			this.reportSong(song);
			this.openModal({ sector: "station", modal: "report" });
		},
		edit(song) {
			this.hideTippyElements();
			this.editSong(song);
			this.openModal({ sector: "admin", modal: "editSong" });
		},
		...mapActions("modals/editSong", ["editSong"]),
		...mapActions("modals/report", ["reportSong"]),
		...mapActions("modalVisibility", ["openModal"]),
		formatDistance,
		parseISO
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.song-item {
		background-color: var(--dark-grey-2) !important;
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
		right: 175px;
	}
}

.song-item {
	.thumbnail-and-info,
	.duration-and-actions {
		display: flex;
		align-items: center;
	}

	.duration-and-actions {
		margin-left: 5px;

		.universal-item-actions div i {
			margin-left: 5px;
		}
	}

	.thumbnail-and-info {
		width: calc(100% - 90px);
	}

	.thumbnail {
		min-width: 65px;
		width: 65px;
		height: 65px;
		margin: -7.5px;
		&.large {
			min-width: 130px;
			width: 130px;
			height: 130px;
		}
	}

	.song-info {
		display: flex;
		flex-direction: column;
		justify-content: center;
		margin-left: 20px;
		width: calc(100% - 80px);

		*:not(i) {
			margin: 0;
			font-family: Karla, Arial, sans-serif;
		}

		.song-title {
			display: flex;
			flex-direction: row;
			h6 {
				color: var(--primary-color) !important;
				font-weight: bold;
				font-size: 17px;
				margin-bottom: 5px;
			}
		}

		.song-request-time {
			font-size: 12px;
			margin-top: 7px;
		}
	}

	.song-duration {
		font-size: 20px;
	}

	.edit-icon {
		color: var(--primary-color);
	}
}
</style>
