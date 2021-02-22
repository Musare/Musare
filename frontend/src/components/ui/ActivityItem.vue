<template>
	<div class="item activity-item universal-item">
		<div class="thumbnail">
			<img
				v-if="activity.payload.thumbnail"
				:src="activity.payload.thumbnail"
				:alt="formattedMessage()"
			/>
			<i class="material-icons activity-type-icon">{{ getIcon() }}</i>
		</div>
		<div class="left-part">
			<p
				class="item-title"
				v-html="formattedMessage()"
				:title="formattedMessage()"
			></p>
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
import { formatDistance, parseISO } from "date-fns";

export default {
	props: {
		activity: {
			type: Object,
			default: () => {}
		}
	},
	methods: {
		formattedMessage() {
			// const { songId, playlistId, stationId } = this.activity.payload;

			// console.log(stationId);

			// if (songId) {
			// 	return this.activity.payload.message.replace(
			// 		/<songId>(.*)<\/songId>/g,
			// 		"$1"
			// 	);
			// }

			// if (playlistId) {
			// 	return this.activity.payload.message.replace(
			// 		/<playlistId>(.*)<\/playlistId>/g,
			// 		"$1"
			// 	);
			// }

			// if (stationId) {
			// 	return this.activity.payload.message.replace(
			// 		/<stationId>(.*)<\/stationId>/g,
			// 		"$1"
			// 	);
			// }

			return this.activity.payload.message;
		},
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
				playlist__add_song: "library_add",
				playlist__edit_privacy: "security",
				playlist__edit_display_name: "create",
				playlist__import_playlist: "publish"
			};

			return icons[this.activity.type];
		},
		formatDistance,
		parseISO
	}
};
</script>

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
		background-color: var(--primary-color);

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
		width: calc(100% - 150px);

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
