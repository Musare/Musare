<template>
	<div class="currently-playing">
		<song-thumbnail :song="song" />
		<div id="song-info">
			<div id="song-details">
				<h6 v-if="type === 'current'">Currently Playing...</h6>
				<h6 v-if="type === 'next'">Next Up...</h6>
				<h4
					id="song-title"
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
					id="song-artists"
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
									includeSeconds: true
								}
							)
						}}
						ago
					</strong>
				</p>
			</div>
			<div id="song-actions">
				<button
					class="button"
					id="report-icon"
					v-if="loggedIn"
					@click="report(song)"
				>
					<i class="material-icons icon-with-button">flag</i>
				</button>
				<a
					class="button"
					id="youtube-icon"
					target="_blank"
					:href="`https://www.youtube.com/watch?v=${song.songId}`"
				>
					<div class="icon"></div>
				</a>
				<button
					class="button is-primary"
					id="editsong-icon"
					v-if="$parent.isAdminOnly()"
					@click="edit(song)"
				>
					<i class="material-icons icon-with-button">edit</i>
				</button>
			</div>
		</div>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import { formatDistance, parseISO } from "date-fns";

import UserIdToUsername from "../../../components/common/UserIdToUsername.vue";
import SongThumbnail from "../../../components/ui/SongThumbnail.vue";

export default {
	components: { UserIdToUsername, SongThumbnail },
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
		edit(song) {
			this.editSong(song);
			this.openModal({ sector: "admin", modal: "editSong" });
		},
		report(song) {
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

	#song-info {
		display: flex;
		flex-direction: column;
		flex-wrap: wrap;
		margin-left: 20px;
		width: calc(100% - 130px - 20px);
		height: 100%;

		*:not(i) {
			margin: 0;
			font-family: Karla, Arial, sans-serif;
		}

		#song-details {
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

			#song-title {
				margin-top: 7px;
				font-size: 22px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			#song-artists {
				font-size: 16px;
				margin-bottom: 5px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			#song-request-time {
				font-size: 12px;
				margin-top: 7px;
				color: var(--dark-grey);
			}
		}

		#song-actions {
			display: flex;

			.button {
				color: var(--white);
				padding: 0 15px;
				border: 0;
				margin: auto 3px;
			}

			#report-icon {
				background-color: var(--yellow);
			}

			#youtube-icon {
				background-color: var(--youtube);

				.icon {
					margin-right: 3px;
					height: 20px;
					width: 20px;
					-webkit-mask: url("/assets/social/youtube.svg") no-repeat
						center;
					mask: url("/assets/social/youtube.svg") no-repeat center;
					background-color: var(--white);
				}
			}

			#editsong-icon.button.is-primary {
				background-color: var(--primary-color) !important;
				&:hover,
				&:focus {
					filter: brightness(90%);
				}
			}
		}
	}
}
</style>
