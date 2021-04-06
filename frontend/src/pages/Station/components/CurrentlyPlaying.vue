<template>
	<div class="currently-playing">
		<song-thumbnail :song="song" />
		<div class="song-info">
			<div class="song-details">
				<h6 v-if="type === 'current'">Currently Playing...</h6>
				<h6 v-if="type === 'next'">Next Up...</h6>
				<h4
					class="song-title"
					:style="!song.artists ? { fontSize: '17px' } : null"
					:title="song.title"
				>
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
					class="song-artists"
					v-if="song.artists"
					:title="song.artists.join(', ')"
				>
					{{ song.artists.join(", ") }}
				</h5>
				<p
					class="song-request-time"
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
									includeSeconds: true
								}
							)
						}}
						ago
					</strong>
				</p>
			</div>
		</div>
		<tippy
			class="song-actions"
			interactive="true"
			placement="right"
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
				v-if="$parent.loggedIn"
				class="material-icons report-icon"
				@click="report(song)"
				content="Report Song"
				v-tippy
			>
				flag
			</i>
			<add-to-playlist-dropdown v-if="$parent.loggedIn" :song="song">
				<i
					slot="button"
					class="material-icons add-to-playlist-icon"
					content="Add Song to Playlist"
					v-tippy
					>queue</i
				>
			</add-to-playlist-dropdown>
			<i
				v-if="$parent.isAdminOnly()"
				class="material-icons edit-icon"
				@click="edit(song)"
				content="Edit Song"
				v-tippy
			>
				edit
			</i>
		</tippy>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import { formatDistance, parseISO } from "date-fns";

import AddToPlaylistDropdown from "../../../components/ui/AddToPlaylistDropdown.vue";
import UserIdToUsername from "../../../components/common/UserIdToUsername.vue";
import SongThumbnail from "../../../components/ui/SongThumbnail.vue";

export default {
	components: { AddToPlaylistDropdown, UserIdToUsername, SongThumbnail },
	props: {
		song: {
			type: Object,
			default: () => {}
		},
		type: {
			type: String,
			default: "current"
		}
	},
	computed: {
		...mapState("station", {
			station: state => state.station
		}),
		...mapState({
			loggedIn: state => state.user.auth.loggedIn
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
		edit(song) {
			this.hideTippyElements();
			this.editSong(song);
			this.openModal({ sector: "admin", modal: "editSong" });
		},
		report(song) {
			this.hideTippyElements();
			this.reportSong(song);
			this.openModal({ sector: "station", modal: "report" });
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
.currently-playing {
	display: flex;
	flex-direction: row;
	align-items: center;
	width: 100%;
	height: 100%;
	padding: 10px;
	min-height: 130px;

	.song-info {
		display: flex;
		flex-direction: column;
		flex-wrap: wrap;
		margin-left: 20px;
		width: calc(100% - 130px - 34px);
		height: 100%;

		*:not(i) {
			margin: 0;
			font-family: Karla, Arial, sans-serif;
		}

		.song-details {
			display: flex;
			justify-content: center;
			flex-direction: column;
			flex-grow: 1;
			width: 100%;

			h6 {
				color: var(--primary-color) !important;
				font-weight: bold;
				font-size: 17px;
			}

			.song-title {
				margin-top: 7px;
				font-size: 22px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.song-artists {
				font-size: 16px;
				margin-bottom: 5px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.song-request-time {
				font-size: 12px;
				margin-top: 7px;
				color: var(--dark-grey);
			}
		}
	}

	.song-actions {
		display: flex;
		cursor: pointer;
		color: var(--primary-color);

		&:hover,
		&:focus {
			filter: brightness(90%);
		}
	}
}
</style>
