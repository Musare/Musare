<template>
	<div class="universal-item queue-item">
		<div id="thumbnail-and-info">
			<img
				class="item-thumbnail"
				:src="song.ytThumbnail ? song.ytThumbnail : song.thumbnail"
				onerror="this.src='/assets/notes-transparent.png'"
			/>
			<div id="song-info">
				<h4
					class="item-title"
					:style="
						song.artists.length < 1 ? { fontSize: '16px' } : null
					"
					:title="song.title"
				>
					{{ song.title }}
				</h4>
				<h5
					class="item-description"
					v-if="song.artists"
					:title="song.artists.join(', ')"
				>
					{{ song.artists.join(", ") }}
				</h5>
				<p
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
				</p>
			</div>
		</div>
		<add-to-playlist-dropdown v-if="showPlaylistDropdown" :song="song" />

		<div id="duration-and-actions">
			<p id="song-duration">
				{{ utils.formatTime(song.duration) }}
			</p>
			<div class="universal-item-actions">
				<i
					v-if="
						$parent.loggedIn &&
							song.likes !== -1 &&
							song.dislikes !== -1
					"
					class="material-icons report-icon"
					@click="report(song)"
				>
					flag
				</i>
				<i
					class="material-icons add-to-playlist-icon"
					@click="showPlaylistDropdown = !showPlaylistDropdown"
					>queue</i
				>
				<i
					v-if="
						$parent.isAdminOnly() &&
							song.likes !== -1 &&
							song.dislikes !== -1
					"
					class="material-icons edit-icon"
					@click="$parent.$parent.$parent.editSong(song)"
				>
					edit
				</i>
				<i
					v-if="$parent.isOwnerOnly() || $parent.isAdminOnly()"
					class="material-icons delete-icon"
					@click="$parent.removeFromQueue(song.songId)"
					>delete_forever</i
				>
			</div>
		</div>
	</div>
</template>

<script>
import { mapActions } from "vuex";
import { formatDistance, parseISO } from "date-fns";

import AddToPlaylistDropdown from "../../../../../components/ui/AddToPlaylistDropdown.vue";
import UserIdToUsername from "../../../../../components/common/UserIdToUsername.vue";
import utils from "../../../../../../js/utils";

export default {
	components: { UserIdToUsername, AddToPlaylistDropdown },
	props: {
		song: {
			type: Object,
			default: () => {}
		},
		station: {
			type: Object,
			default: () => {
				return { type: "community", partyMode: false };
			}
		}
	},
	data() {
		return {
			utils,
			showPlaylistDropdown: false
		};
	},
	methods: {
		report(song) {
			this.reportSong(song);
			this.openModal({ sector: "station", modal: "report" });
		},
		...mapActions("modals/report", ["reportSong"]),
		...mapActions("modalVisibility", ["openModal"]),
		formatDistance,
		parseISO
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.queue-item {
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

.queue-item {
	#thumbnail-and-info,
	#duration-and-actions {
		display: flex;
		align-items: center;
	}

	#duration-and-actions {
		margin-left: 5px;

		.universal-item-actions div i {
			margin-left: 5px;
		}
	}

	#thumbnail-and-info {
		width: calc(100% - 110px);
	}

	#song-info {
		display: flex;
		flex-direction: column;
		justify-content: center;
		margin-left: 20px;
		width: calc(100% - 65px);

		*:not(i) {
			margin: 0;
			font-family: Karla, Arial, sans-serif;
		}

		#song-request-time {
			font-size: 12px;
			margin-top: 7px;
		}
	}

	#song-duration {
		font-size: 20px;
	}

	.edit-icon {
		color: var(--primary-color);
	}
}
</style>
