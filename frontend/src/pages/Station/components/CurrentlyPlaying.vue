<template>
	<div class="currently-playing">
		<figure class="thumbnail">
			<div
				v-if="song.ytThumbnail"
				id="yt-thumbnail-bg"
				:style="{
					'background-image': 'url(' + song.ytThumbnail + ')'
				}"
			></div>
			<img
				v-if="song.ytThumbnail"
				:src="song.ytThumbnail"
				onerror="this.src='/assets/notes-transparent.png'"
			/>
			<img
				v-else
				:src="song.thumbnail"
				onerror="this.src='/assets/notes-transparent.png'"
			/>
		</figure>
		<div id="song-info">
			<div id="song-details">
				<h6 v-if="type === 'current'">Currently Playing...</h6>
				<h6 v-if="type === 'next'">Next Up...</h6>
				<h4
					id="song-title"
					:style="!song.artists ? { fontSize: '17px' } : null"
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
					Requested
					<strong>{{
						formatDistance(parseISO(song.requestedAt), Date.now(), {
							addSuffix: true
						})
					}}</strong>
				</p>
			</div>
			<div id="song-actions">
				<button
					class="button"
					id="report-icon"
					v-if="loggedIn && !song.simpleSong"
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
					v-if="$parent.isAdminOnly() && !song.simpleSong"
					@click="$parent.editSong(song)"
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

export default {
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
.currently-playing {
	display: flex;
	flex-direction: row;
	align-items: center;
	width: 100%;
	height: 100%;
	padding: 10px;
	min-height: 130px;

	.thumbnail {
		min-width: 130px;
		height: 130px;
		position: relative;
		margin-top: -15px;
		margin-bottom: -15px;
		margin-left: -10px;

		#yt-thumbnail-bg {
			height: 100%;
			width: 100%;
			position: absolute;
			top: 0;
			filter: blur(1px);
			background: url("/assets/notes-transparent.png") no-repeat center
				center;
		}

		img {
			height: auto;
			width: 100%;
			margin-top: auto;
			margin-bottom: auto;
			z-index: 1;
			position: absolute;
			top: 0;
			bottom: 0;
			left: 0;
			right: 0;
		}
	}

	#song-info {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		margin-left: 20px;
		width: 100%;
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
			h6 {
				color: var(--primary-color) !important;
				font-weight: bold;
				font-size: 17px;
			}

			#song-title {
				margin-top: 7px;
				font-size: 22px;
			}

			#song-artists {
				font-size: 16px;
				margin-bottom: 5px;
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
