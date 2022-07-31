<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { formatDistance, parseISO } from "date-fns";
import { useModalsStore } from "@/stores/modals";

const props = defineProps({
	activity: {
		type: Object,
		default: () => {}
	}
});

const theme = ref("blue");

const { openModal } = useModalsStore();

const messageParts = computed(() => {
	const { message } = props.activity.payload;
	const messageParts = message.split(
		/((?:<youtubeId>.*<\/youtubeId>)|(?:<reportId>.*<\/reportId>)|(?:<playlistId>.*<\/playlistId>)|(?:<stationId>.*<\/stationId>))/g
	);

	return messageParts;
});
const messageStripped = computed(() => {
	let { message } = props.activity.payload;

	message = message.replace(/<reportId>(.*)<\/reportId>/g, "report");
	message = message.replace(/<youtubeId>(.*)<\/youtubeId>/g, "$1");
	message = message.replace(/<playlistId>(.*)<\/playlistId>/g, `$1`);
	message = message.replace(/<stationId>(.*)<\/stationId>/g, `$1`);

	return message;
});

const getMessagePartType = messagePart =>
	messagePart.substring(1, messagePart.indexOf(">"));

const getMessagePartText = messagePart => {
	let message = messagePart;

	message = message.replace(/<reportId>(.*)<\/reportId>/g, "report");
	message = message.replace(/<youtubeId>(.*)<\/youtubeId>/g, "$1");
	message = message.replace(/<playlistId>(.*)<\/playlistId>/g, `$1`);
	message = message.replace(/<stationId>(.*)<\/stationId>/g, `$1`);

	return message;
};

const getIcon = () => {
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

	return icons[props.activity.type];
};

onMounted(() => {
	if (props.activity.type === "station__edit_theme")
		theme.value = props.activity.payload.message.replace(
			/to\s(\w+)/g,
			"$1"
		);
});
</script>

<template>
	<div class="item activity-item universal-item">
		<div :class="[theme, 'thumbnail']">
			<img
				v-if="activity.payload.thumbnail"
				:src="activity.payload.thumbnail"
				onerror="this.src='/assets/notes.png'"
				:alt="messageStripped"
			/>
			<i class="material-icons activity-type-icon">{{ getIcon() }}</i>
		</div>
		<div class="left-part">
			<p :title="messageStripped" class="item-title">
				<span v-for="messagePart in messageParts" :key="messagePart">
					<span
						v-if="getMessagePartType(messagePart) === 'youtubeId'"
						>{{ getMessagePartText(messagePart) }}</span
					>
					<a
						v-else-if="
							getMessagePartType(messagePart) === 'reportId'
						"
						class="activity-item-link"
						@click="
							openModal({
								modal: 'viewReport',
								data: { reportId: activity.payload.reportId }
							})
						"
						>report</a
					>
					<a
						v-else-if="
							getMessagePartType(messagePart) === 'playlistId'
						"
						class="activity-item-link"
						@click="
							openModal({
								modal: 'editPlaylist',
								data: {
									playlistId: activity.payload.playlistId
								}
							})
						"
						>{{ getMessagePartText(messagePart) }}
					</a>
					<router-link
						v-else-if="
							getMessagePartType(messagePart) === 'stationId'
						"
						class="activity-item-link"
						:to="{
							name: 'station',
							params: { id: activity.payload.stationId }
						}"
						>{{ getMessagePartText(messagePart) }}</router-link
					>

					<span v-else>
						{{ messagePart }}
					</span>
				</span>
			</p>
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

<style lang="less">
.activity-item-link {
	color: var(--primary-color) !important;

	&:hover {
		border-color: var(--light-grey-2) !important;
	}
}
</style>

<style lang="less" scoped>
.activity-item {
	height: 72px;
	border: 0.5px var(--light-grey-3) solid;
	border-radius: @border-radius;
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
			background-color: var(--dark-red);
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
