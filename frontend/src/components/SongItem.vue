<script setup lang="ts">
import { useStore } from "vuex";
import { ref, computed, onMounted, onUnmounted } from "vue";
import { formatDistance, parseISO } from "date-fns";
import AddToPlaylistDropdown from "./AddToPlaylistDropdown.vue";
import utils from "@/utils";

const store = useStore();

const props = defineProps({
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

const loggedIn = computed(() => store.state.user.auth.loggedIn);
const userRole = computed(() => store.state.user.auth.userRole);

function formatRequestedAt() {
	if (props.requestedBy && props.song.requestedAt)
		formatedRequestedAt.value = formatDistance(
			parseISO(props.song.requestedAt),
			new Date()
		);
}
function formatArtists() {
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
}
function hideTippyElements() {
	songActions.value.tippy.hide();

	setTimeout(
		() =>
			Array.from(document.querySelectorAll(".tippy-popper")).forEach(
				popper => popper._tippy.hide()
			),
		500
	);
}
function hoverTippy() {
	hoveredTippy.value = true;
}
function openModal(payload) {
	store.dispatch("modalVisibility/openModal", payload);
}
function report(song) {
	hideTippyElements();
	openModal({ modal: "report", data: { song } });
}
function edit(song) {
	hideTippyElements();
	openModal({
		modal: "editSong",
		data: { song }
	});
}

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
		:class="{ 'with-duration': duration }"
		v-if="song"
	>
		<div class="thumbnail-and-info">
			<slot v-if="$slots.leftIcon" name="leftIcon" />
			<song-thumbnail :song="song" v-if="thumbnail" />
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
				<p class="song-request-time" v-if="requestedBy">
					Requested by
					<strong>
						<user-link
							v-if="song.requestedBy"
							:key="song._id"
							:user-id="song.requestedBy"
						/>
						<span v-else>station</span>
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
								v-if="disabledActions.indexOf('youtube') === -1"
								@click="
									openModal({
										modal: 'viewYoutubeVideo',
										data: {
											youtubeId: song.youtubeId
										}
									})
								"
								content="View YouTube Video"
								v-tippy
							>
								<div class="youtube-icon"></div>
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
									-1
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
				<i
					class="material-icons action-dropdown-icon"
					v-else-if="loggedIn && !hoveredTippy"
					@mouseenter="hoverTippy()"
					>more_horiz</i
				>
				<a
					v-else-if="
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
	min-height: 70px;

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
		min-width: 0;
	}

	.thumbnail {
		min-width: 70px;
		width: 70px;
		height: 70px;
		margin: -7.5px;
		margin-right: calc(20px - 7.5px);
	}

	.song-info {
		display: flex;
		flex-direction: column;
		justify-content: center;
		// margin-left: 20px;
		min-width: 0;

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

	.song-duration {
		font-size: 20px;
	}

	.edit-icon {
		color: var(--primary-color);
	}
}
</style>
