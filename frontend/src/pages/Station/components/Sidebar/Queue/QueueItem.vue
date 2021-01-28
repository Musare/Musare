<template>
	<div class="queue-item">
		<div id="thumbnail-and-info">
			<img
				id="thumbnail"
				:src="song.ytThumbnail ? song.ytThumbnail : song.thumbnail"
				onerror="this.src='/assets/notes-transparent.png'"
			/>
			<div id="song-info">
				<h4
					id="song-title"
					:style="
						song.artists.length < 1 ? { fontSize: '16px' } : null
					"
				>
					{{ song.title }}
				</h4>
				<h5 id="song-artists" v-if="song.artists">
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
		<div id="duration-and-actions">
			<p id="song-duration">
				{{ utils.formatTime(song.duration) }}
			</p>
			<div id="queue-item-buttons">
				<i
					v-if="
						$parent.loggedIn &&
							!song.simpleSong &&
							song.likes !== -1 &&
							song.dislikes !== -1
					"
					class="material-icons"
					id="report-queue-item"
					@click="reportQueueSong(song)"
					>flag</i
				>
				<i
					v-if="
						$parent.isAdminOnly() &&
							!song.simpleSong &&
							song.likes !== -1 &&
							song.dislikes !== -1
					"
					class="material-icons"
					id="edit-queue-item"
					@click="$parent.$parent.$parent.editSong(song)"
					>edit</i
				>
				<i
					v-if="
						station.type === 'community' &&
							($parent.isOwnerOnly() || $parent.isAdminOnly())
					"
					class="material-icons"
					id="remove-queue-item"
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

import UserIdToUsername from "../../../../../components/common/UserIdToUsername.vue";
import utils from "../../../../../../js/utils";

export default {
	components: { UserIdToUsername },
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
			utils
		};
	},
	methods: {
		reportQueueSong(song) {
			this.updateReportQueueSong(song);
			this.openModal({ sector: "station", modal: "report" });
		},
		...mapActions("station", ["updateReportQueueSong"]),
		...mapActions("modals", ["openModal"]),
		formatDistance,
		parseISO
	}
};
</script>

<style lang="scss" scoped>
@import "../../../../../styles/global.scss";

.queue-item {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 7.5px;
	border: 1px solid $light-grey-2;
	border-radius: 3px;

	#thumbnail-and-info,
	#duration-and-actions {
		display: flex;
		align-items: center;
	}

	#duration-and-actions {
		margin-left: 5px;
	}

	#queue-item-buttons {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		margin-left: 10px;
		justify-content: center;
	}

	#thumbnail {
		width: 65px;
		height: 65px;
		margin: -7.5px;
		border-radius: 3px 0 0 3px;
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

		*:not(i) {
			margin: 0;
			font-family: Karla, Arial, sans-serif;
		}

		#song-title {
			font-size: 20px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		#song-artists {
			font-size: 14px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		#song-request-time {
			font-size: 12px;
			margin-top: 7px;
		}
	}

	#song-duration {
		font-size: 20px;
	}

	#report-queue-item {
		cursor: pointer;
		color: $yellow;
		&:hover,
		&:focus {
			color: darken($yellow, 5%);
		}
	}

	#edit-queue-item {
		cursor: pointer;
		color: var(--station-theme);
		&:hover,
		&:focus {
			filter: brightness(90%);
		}
	}

	#remove-queue-item {
		cursor: pointer;
		color: $red;
		&:hover,
		&:focus {
			color: darken($red, 5%);
		}
	}
}
</style>
