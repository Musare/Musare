<script setup lang="ts">
import {
	defineAsyncComponent,
	ref,
	computed,
	onMounted,
	onUnmounted
} from "vue";
import { formatDistance, parseISO } from "date-fns";
import { storeToRefs } from "pinia";
import AddToPlaylistDropdown from "./AddToPlaylistDropdown.vue";
import { useUserAuthStore } from "@/stores/userAuth";
import { useModalsStore } from "@/stores/modals";
import { useConfigStore } from "@/stores/config";
import utils from "@/utils";

const SongThumbnail = defineAsyncComponent(
	() => import("@/components/SongThumbnail.vue")
);
const UserLink = defineAsyncComponent(
	() => import("@/components/UserLink.vue")
);

const props = defineProps({
	song: {
		type: Object,
		default: () => {}
	},
	requestedBy: {
		type: Boolean,
		default: false
	},
	requestedType: {
		type: Boolean,
		default: false
	},
	duration: {
		type: Boolean,
		default: true
	},
	thumbnail: {
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
});

const formatedRequestedAt = ref(null);
const formatRequestedAtInterval = ref();
const hoveredTippy = ref(false);
const songActions = ref(null);

const configStore = useConfigStore();

const { experimental, sitename } = storeToRefs(configStore);

const userAuthStore = useUserAuthStore();
const { loggedIn } = storeToRefs(userAuthStore);
const { hasPermission } = userAuthStore;

const { openModal } = useModalsStore();

const songMediaType = computed(() => {
	if (
		!props.song ||
		!props.song.mediaSource ||
		props.song.mediaSource.indexOf(":") === -1
	)
		return "none";
	return props.song.mediaSource.split(":")[0];
});
const songMediaValue = computed(() => {
	if (
		!props.song ||
		!props.song.mediaSource ||
		props.song.mediaSource.indexOf(":") === -1
	)
		return null;
	return props.song.mediaSource.split(":")[1];
});

const formatRequestedAt = () => {
	if (props.requestedBy && props.song.requestedAt)
		formatedRequestedAt.value = formatDistance(
			parseISO(props.song.requestedAt),
			new Date()
		);
};

const formatArtists = () => {
	if (props.song.artists.length === 1) {
		return props.song.artists[0];
	}
	if (props.song.artists.length === 2) {
		return props.song.artists.join(" & ");
	}
	if (props.song.artists.length > 2) {
		return `${props.song.artists
			.slice(0, -1)
			.join(", ")} & ${props.song.artists.slice(-1)}`;
	}
	return null;
};

const hideTippyElements = () => {
	songActions.value.tippy.hide();

	setTimeout(
		() =>
			Array.from(document.querySelectorAll(".tippy-popper")).forEach(
				(popper: any) => popper._tippy.hide()
			),
		500
	);
};

const hoverTippy = () => {
	hoveredTippy.value = true;
};

const viewMedia = mediaSource => {
	hideTippyElements();
	openModal({
		modal: "viewMedia",
		props: {
			mediaSource
		}
	});
};

const report = song => {
	hideTippyElements();
	openModal({ modal: "report", props: { song } });
};

const edit = song => {
	hideTippyElements();
	openModal({
		modal: "editSong",
		props: { song }
	});
};

onMounted(() => {
	if (props.requestedBy) {
		formatRequestedAt();
		formatRequestedAtInterval.value = setInterval(() => {
			formatRequestedAt();
		}, 30000);
	}
});

onUnmounted(() => {
	clearInterval(formatRequestedAtInterval.value);
});
</script>

<template>
	<div
		class="universal-item song-item"
		:class="{ 'with-duration': duration, 'with-header': header }"
		v-if="song"
	>
		<div class="thumbnail-and-info">
			<song-thumbnail :song="song" v-if="thumbnail" />
			<i
				v-if="
					songMediaType === 'soundcloud' && !experimental.soundcloud
				"
				class="material-icons warning-icon left-icon"
				:content="`SoundCloud is no longer enabled on ${sitename}`"
				v-tippy="{ theme: 'warning' }"
			>
				warning
			</i>
			<slot v-if="$slots.leftIcon" name="leftIcon" />
			<div class="song-info">
				<h6 v-if="header">{{ header }}</h6>
				<div class="song-title">
					<h4
						:class="{
							'item-title': true,
							'no-artists':
								!song.artists ||
								(song.artists && song.artists.length < 1)
						}"
						:title="song.title"
					>
						{{ song.title }}
					</h4>
					<i
						v-if="song.verified"
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
					v-if="requestedBy && !requestedType"
				>
					Requested by
					<strong>
						<user-link
							v-if="song.requestedBy"
							:key="song.mediaSource"
							:user-id="song.requestedBy"
						/>
						<span v-else>station</span>
						{{ formatedRequestedAt }}
						ago
					</strong>
				</p>
				<p
					class="song-request-time"
					v-if="requestedBy && requestedType"
				>
					<template v-if="song.requestedType === 'automatic'">
						Requested automaticaly
						<strong>
							{{ formatedRequestedAt }}
							ago
						</strong>
					</template>
					<template v-else>
						<span v-if="song.requestedType === 'autorequest'"
							>Autorequested</span
						><span v-else>Requested</span> by
						<strong>
							<user-link
								v-if="song.requestedBy"
								:key="song.mediaSource"
								:user-id="song.requestedBy"
							/>
							<span v-else>station</span>
							{{ formatedRequestedAt }}
							ago
						</strong>
					</template>
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
					v-if="loggedIn && hoveredTippy"
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
							<i
								v-if="
									disabledActions.indexOf('view-song') ===
										-1 &&
									(songMediaType === 'youtube' ||
										(songMediaType === 'soundcloud' &&
											experimental.soundcloud))
								"
								@click="viewMedia(song.mediaSource)"
								content="View Media"
								v-tippy
							>
								<div
									v-if="songMediaType === 'youtube'"
									class="youtube-icon"
								></div>
								<div v-else class="soundcloud-icon"></div>
							</i>
							<i
								v-if="
									song._id &&
									disabledActions.indexOf('report') === -1
								"
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
										-1 &&
									(songMediaType !== 'soundcloud' ||
										experimental.soundcloud)
								"
								:song="song"
								placement="top-end"
							>
								<template #button>
									<i
										class="material-icons add-to-playlist-icon"
										content="Add Song to Playlist"
										v-tippy
										>playlist_add</i
									>
								</template>
							</add-to-playlist-dropdown>
							<i
								v-if="
									loggedIn &&
									song._id &&
									hasPermission('songs.update') &&
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
				<i
					class="material-icons action-dropdown-icon"
					v-else-if="loggedIn && !hoveredTippy"
					@mouseenter="hoverTippy()"
					>more_horiz</i
				>
				<template
					v-else-if="
						!loggedIn && disabledActions.indexOf('view-song') === -1
					"
				>
					<a
						v-if="songMediaType === 'youtube'"
						target="_blank"
						:href="`https://www.youtube.com/watch?v=${songMediaValue}`"
						content="View on Youtube"
						v-tippy
					>
						<div class="youtube-icon"></div>
					</a>
				</template>
			</div>
			<div class="universal-item-actions" v-if="$slots.actions">
				<slot name="actions" />
			</div>
		</div>
	</div>
</template>

<style lang="less" scoped>
.night-mode {
	.song-item {
		background-color: var(--dark-grey-2) !important;
		border: 0 !important;
	}
}

:deep(#nav-dropdown) {
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
	height: 70px;

	&.with-header {
		height: initial;
		min-height: 70px;
	}

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
		position: relative;
		height: calc(100% + 15px);
		min-width: 0;

		.thumbnail {
			position: relative;
			height: 100%;
			min-width: 70px;
			width: 70px;
			margin-left: -7.5px;
			margin-right: 7.5px;
		}

		:deep(.left-icon) {
			margin-right: 7.5px;
		}

		.song-info {
			display: flex;
			flex-direction: column;
			justify-content: center;
			min-width: 0;

			*:not(i) {
				margin: 0;
				font-family: Nunito, Arial, sans-serif;
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

				.item-title {
					font-size: 18px;
				}

				.verified-song {
					margin-left: 5px;
				}

				.item-title.no-artists {
					display: -webkit-inline-box;
					font-size: 16px;
					white-space: normal;
					-webkit-box-orient: vertical;
					-webkit-line-clamp: 2;
				}
			}

			.item-description {
				line-height: 120%;
			}

			.song-request-time {
				font-size: 11px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
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
