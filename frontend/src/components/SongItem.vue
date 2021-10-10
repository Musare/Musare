<template>
	<div
		class="universal-item song-item"
		:class="{ 'with-duration': duration }"
		v-if="song"
	>
		<div class="thumbnail-and-info">
			<song-thumbnail :song="song" />
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
						v-tippy="{ theme: 'info' }"
					>
						check_circle
					</i>
				</div>
				<h5
					class="item-description"
					v-if="formatArtists()"
					:title="formatArtists()"
				>
					{{ formatArtists() }}
				</h5>
				<p
					class="song-request-time"
					v-if="requestedBy && song.requestedBy"
				>
					Requested by
					<strong>
						<user-id-to-username
							:key="song._id"
							:user-id="song.requestedBy"
							:link="true"
						/>
						{{ formatedRequestedAt }}
						ago
					</strong>
				</p>
			</div>
		</div>

		<div class="duration-and-actions">
			<p v-if="duration" class="song-duration">
				{{ utils.formatTime(song.duration) }}
			</p>
			<div
				class="universal-item-actions"
				v-if="disabledActions.indexOf('all') === -1"
			>
				<tippy
					v-if="loggedIn"
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
								v-if="disabledActions.indexOf('youtube') === -1"
								target="_blank"
								:href="`https://www.youtube.com/watch?v=${song.youtubeId}`"
								content="View on Youtube"
								v-tippy
							>
								<div class="youtube-icon"></div>
							</a>
							<i
								v-if="disabledActions.indexOf('report') === -1"
								class="material-icons report-icon"
								@click="report(song)"
								content="Report Song"
								v-tippy
							>
								flag
							</i>
							<add-to-playlist-dropdown
								v-if="
									disabledActions.indexOf('addToPlaylist') ===
									-1
								"
								:song="song"
								placement="top-end"
							>
								<template #button>
									<i
										class="
											material-icons
											add-to-playlist-icon
										"
										content="Add Song to Playlist"
										v-tippy
										>playlist_add</i
									>
								</template>
							</add-to-playlist-dropdown>
							<i
								v-if="
									loggedIn &&
									userRole === 'admin' &&
									disabledActions.indexOf('edit') === -1
								"
								class="material-icons edit-icon"
								@click="edit(song)"
								content="Edit Song"
								v-tippy
							>
								edit
							</i>
							<slot name="tippyActions" />
						</div>
					</template>
				</tippy>
				<a
					v-if="
						!loggedIn && disabledActions.indexOf('youtube') === -1
					"
					target="_blank"
					:href="`https://www.youtube.com/watch?v=${song.youtubeId}`"
					content="View on Youtube"
					v-tippy
				>
					<div class="youtube-icon"></div>
				</a>
			</div>
			<div class="universal-item-actions" v-if="$slots.actions">
				<slot name="actions" />
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
		disabledActions: {
			type: Array,
			default: () => []
		},
		header: {
			type: String,
			default: null
		}
	},
	data() {
		return {
			utils,
			formatedRequestedAt: null
		};
	},
	computed: {
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			userRole: state => state.user.auth.role
		})
	},
	mounted() {
		if (this.requestedBy) {
			this.formatRequestedAt();
			setInterval(() => {
				this.formatRequestedAt();
			}, 30000);
		}
	},
	methods: {
		formatRequestedAt() {
			if (
				this.requestedBy &&
				this.song.requestedBy &&
				this.song.requestedAt
			)
				this.formatedRequestedAt = this.formatDistance(
					parseISO(this.song.requestedAt),
					new Date()
				);
		},
		formatArtists() {
			if (this.song.artists.length === 1) {
				return this.song.artists[0];
			}
			if (this.song.artists.length === 2) {
				return this.song.artists.join(" & ");
			}
			if (this.song.artists.length > 2) {
				return `${this.song.artists
					.slice(0, -1)
					.join(", ")} & ${this.song.artists.slice(-1)}`;
			}
			return null;
		},
		hideTippyElements() {
			this.$refs.songActions.tippy.hide();

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
			this.openModal("report");
		},
		edit(song) {
			this.hideTippyElements();
			this.editSong(song);
			this.openModal("editSong");
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
	&:not(:last-of-type) {
		margin-bottom: 10px;
	}

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
	}

	.song-info {
		display: flex;
		flex-direction: column;
		justify-content: center;
		margin-left: 20px;
		width: calc(100% - 10px);

		*:not(i) {
			margin: 0;
			font-family: Karla, Arial, sans-serif;
		}

		h6 {
			color: var(--primary-color) !important;
			font-weight: bold;
			font-size: 17px;
			margin-bottom: 5px;
		}

		.song-title {
			display: flex;
			flex-direction: row;

			.verified-song {
				margin-left: 5px;
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

	&.with-duration .song-info {
		width: calc(100% - 80px);
	}
}
</style>
