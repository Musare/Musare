<template>
	<div class="item activity-item universal-item">
		<div :class="[theme, 'thumbnail']">
			<img
				v-if="activity.payload.thumbnail"
				:src="activity.payload.thumbnail"
				onerror="this.src='/assets/notes.png'"
				:alt="textOnlyMessage"
			/>
			<i class="material-icons activity-type-icon">{{ getIcon() }}</i>
		</div>
		<div class="left-part">
			<component
				class="item-title"
				:title="textOnlyMessage"
				:is="formattedMessage"
			/>
			<p class="item-description">
				{{
					formatDistance(parseISO(activity.createdAt), new Date(), {
						addSuffix: true
					})
				}}
			</p>
		</div>
		<div class="universal-item-actions">
			<slot name="actions" />
		</div>
	</div>
</template>

<script>
import { mapActions } from "vuex";
import { formatDistance, parseISO } from "date-fns";

export default {
	props: {
		activity: {
			type: Object,
			default: () => {}
		}
	},
	data() {
		return {
			theme: "blue"
		};
	},
	computed: {
		formattedMessage() {
			const { youtubeId, playlistId, stationId, reportId } =
				this.activity.payload;
			let { message } = this.activity.payload;

			if (youtubeId) {
				message = message.replace(
					/<youtubeId>(.*)<\/youtubeId>/g,
					"$1"
				);
			}

			if (reportId) {
				message = message.replace(
					/<reportId>(.*)<\/reportId>/g,
					`<a href='#' class='activity-item-link' @click='showReport("${reportId}")'>report</a>`
				);
			}

			if (playlistId) {
				message = message.replace(
					/<playlistId>(.*)<\/playlistId>/g,
					`<a href='#' class='activity-item-link' @click='showPlaylist("${playlistId}")'>$1</a>`
				);
			}

			if (stationId) {
				message = message.replace(
					/<stationId>(.*)<\/stationId>/g,
					`<router-link class='activity-item-link' :to="{ name: 'station', params: { id: '${stationId}' } }">$1</router-link>`
				);
			}

			return {
				template: `<p>${message}</p>`,
				methods: {
					showPlaylist: this.showPlaylist,
					showReport: this.showReport
				}
			};
		},
		textOnlyMessage() {
			const { youtubeId, playlistId, stationId, reportId } =
				this.activity.payload;
			let { message } = this.activity.payload;

			if (reportId) {
				message = message.replace(
					/<reportId>(.*)<\/reportId>/g,
					"report"
				);
			}

			if (youtubeId) {
				message = message.replace(
					/<youtubeId>(.*)<\/youtubeId>/g,
					"$1"
				);
			}

			if (playlistId) {
				message = message.replace(
					/<playlistId>(.*)<\/playlistId>/g,
					`$1`
				);
			}

			if (stationId) {
				message = message.replace(
					/<stationId>(.*)<\/stationId>/g,
					`$1`
				);
			}

			return message;
		}
	},
	mounted() {
		if (this.activity.type === "station__edit_theme")
			this.theme = this.activity.payload.message.replace(
				/to\s(\w+)/g,
				"$1"
			);
	},
	methods: {
		getIcon() {
			const icons = {
				/** User */
				user__joined: "account_circle",
				user__edit_bio: "create",
				user__edit_avatar: "insert_photo",
				user__edit_name: "create",
				user__edit_location: "place",
				user__toggle_nightmode: "nightlight_round",
				user__toggle_autoskip_disliked_songs: "thumb_down_alt",
				user__toggle_activity_watch: "visibility",
				/** Songs */
				song__report: "flag",
				song__like: "thumb_up_alt",
				song__dislike: "thumb_down_alt",
				song__unlike: "not_interested",
				song__undislike: "not_interested",
				/** Stations */
				station__favorite: "star",
				station__unfavorite: "star_border",
				station__create: "create",
				station__remove: "delete",
				station__edit_theme: "color_lens",
				station__edit_name: "create",
				station__edit_display_name: "create",
				station__edit_description: "create",
				station__edit_privacy: "security",
				station__edit_genres: "create",
				station__edit_blacklisted_genres: "create",
				/** Playlists */
				playlist__create: "create",
				playlist__remove: "delete",
				playlist__remove_song: "not_interested",
				playlist__remove_songs: "not_interested",
				playlist__add_song: "library_add",
				playlist__add_songs: "library_add",
				playlist__edit_privacy: "security",
				playlist__edit_display_name: "create",
				playlist__import_playlist: "publish"
			};

			return icons[this.activity.type];
		},
		showReport(reportId) {
			this.viewReport(reportId);
			this.openModal("viewReport");
		},
		showPlaylist(playlistId) {
			this.editPlaylist(playlistId);
			this.openModal("editPlaylist");
		},
		...mapActions("user/playlists", ["editPlaylist"]),
		formatDistance,
		parseISO,
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("modals/viewReport", ["viewReport"])
	}
};
</script>

<style lang="scss">
.activity-item-link {
	color: var(--primary-color) !important;

	&:hover {
		border-color: var(--light-grey-2) !important;
	}
}
</style>

<style lang="scss" scoped>
.activity-item {
	height: 72px;
	border: 0.5px var(--light-grey-3) solid;
	border-radius: 3px;
	padding: 0;

	.thumbnail {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 70.5px;
		max-width: 70.5px;
		height: 70.5px;
		margin-left: 0px;

		&.red {
			background-color: var(--red);
		}

		&.green {
			background-color: var(--green);
		}

		&.blue {
			background-color: var(--primary-color);
		}

		&.orange {
			background-color: var(--orange);
		}

		&.yellow {
			background-color: var(--yellow);
		}

		&.purple {
			background-color: var(--purple);
		}

		&.teal {
			background-color: var(--teal);
		}

		.activity-type-icon {
			position: absolute;
			color: var(--light-grey);
			font-size: 25px;
			background-color: rgba(0, 0, 0, 0.8);
			padding: 5px;
			border-radius: 100%;
		}
	}

	.left-part {
		flex: 1;
		padding: 12px;
		min-width: 0;

		.item-title {
			margin: 0;
			font-size: 16px;
		}
	}

	.universal-item-actions {
		right: 10px;
		position: sticky;

		a {
			border-bottom: 0;
		}
	}
}
</style>
