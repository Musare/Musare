<script setup lang="ts">
import { defineAsyncComponent, ref, computed, onMounted, watch } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useWebsocketsStore } from "@/stores/websockets";
import { useConfigStore } from "@/stores/config";
import { useStationStore } from "@/stores/station";
import { useManageStationStore } from "@/stores/manageStation";
import { useSearchYoutube } from "@/composables/useSearchYoutube";
import { useSearchMusare } from "@/composables/useSearchMusare";
import { useYoutubeDirect } from "@/composables/useYoutubeDirect";
import { useSoundcloudDirect } from "@/composables/useSoundcloudDirect";

const SongItem = defineAsyncComponent(
	() => import("@/components/SongItem.vue")
);
const SearchQueryItem = defineAsyncComponent(
	() => import("@/components/SearchQueryItem.vue")
);
const PlaylistTabBase = defineAsyncComponent(
	() => import("@/components/PlaylistTabBase.vue")
);

const props = defineProps({
	modalUuid: { type: String, default: null },
	sector: { type: String, default: "station" },
	disableAutoRequest: { type: Boolean, default: false }
});

const { youtubeSearch, searchForSongs, loadMoreSongs } = useSearchYoutube();
const { musareSearch, searchForMusareSongs } = useSearchMusare();
const { youtubeDirect, addToQueue } = useYoutubeDirect();
const { soundcloudDirect, addToQueue: soundcloudAddToQueue } =
	useSoundcloudDirect();

const { socket } = useWebsocketsStore();
const configStore = useConfigStore();
const { sitename, experimental } = storeToRefs(configStore);
const stationStore = useStationStore();
const manageStationStore = useManageStationStore({
	modalUuid: props.modalUuid
});

const tab = ref("songs");
const tabs = ref({});

const station = computed({
	get() {
		if (props.sector === "manageStation") return manageStationStore.station;
		return stationStore.station;
	},
	set(value) {
		if (props.sector === "manageStation")
			manageStationStore.updateStation(value);
		else stationStore.updateStation(value);
	}
});
// const blacklist = computed({
// 	get() {
// 		if (props.sector === "manageStation") return manageStationStore.blacklist;
// 		return stationStore.blacklist;
// 	},
// 	set(value) {
// 		if (props.sector === "manageStation")
// 			manageStationStore.setBlacklist(value);
// 		else stationStore.setBlacklist(value);
// 	}
// });
const songsList = computed({
	get() {
		if (props.sector === "manageStation")
			return manageStationStore.songsList;
		return stationStore.songsList;
	},
	set(value) {
		if (props.sector === "manageStation")
			manageStationStore.updateSongsList(value);
		else stationStore.updateSongsList(value);
	}
});
const musareResultsLeftCount = computed(
	() => musareSearch.value.count - musareSearch.value.results.length
);
const nextPageMusareResultsCount = computed(() =>
	Math.min(musareSearch.value.pageSize, musareResultsLeftCount.value)
);
const songsInQueue = computed(() => {
	if (station.value.currentSong)
		return songsList.value
			.map(song => song.mediaSource)
			.concat(station.value.currentSong.mediaSource);
	return songsList.value.map(song => song.mediaSource);
});
// const currentUserQueueSongs = computed(
// 	() =>
// 		songsList.value.filter(
// 			queueSong => queueSong.requestedBy === userId.value
// 		).length
// );
const autorequestPlaylistCount = computed(() => {
	if (props.sector === "station") return stationStore.autoRequest.length;
	return 0;
});

const showTab = _tab => {
	const tabElement = tabs.value[`${_tab}-tab`];
	if (tabElement) tabElement.scrollIntoView({ block: "nearest" });
	tab.value = _tab;
};

const addSongToQueue = (mediaSource: string, index?: number) => {
	socket.dispatch(
		"stations.addToQueue",
		station.value._id,
		mediaSource,
		"manual",
		res => {
			if (res.status !== "success") new Toast(`Error: ${res.message}`);
			else {
				if (index)
					youtubeSearch.value.songs.results[index].isAddedToQueue =
						true;

				new Toast(res.message);
			}
		}
	);
};

watch(
	() => station.value.requests.allowAutorequest && !props.disableAutoRequest,
	value => {
		if (!value && tab.value === "autorequest") showTab("songs");
	}
);

onMounted(async () => {
	showTab("songs");
});
</script>

<template>
	<div class="station-playlists">
		<p
			class="top-info has-text-centered"
			v-if="
				tab !== 'songs' ||
				(station.requests.allowAutorequest && !disableAutoRequest)
			"
		>
			Add songs to the queue or automatically request songs from playlists
		</p>
		<div class="tabs-container">
			<div
				class="tab-selection"
				v-if="
					tab !== 'songs' ||
					(station.requests.allowAutorequest && !disableAutoRequest)
				"
			>
				<button
					class="button is-default"
					:ref="el => (tabs['songs-tab'] = el)"
					:class="{ selected: tab === 'songs' }"
					@click="showTab('songs')"
				>
					Songs
				</button>
				<button
					v-if="
						station.requests.allowAutorequest && !disableAutoRequest
					"
					class="button is-default"
					:ref="el => (tabs['autorequest-tab'] = el)"
					:class="{ selected: tab === 'autorequest' }"
					@click="showTab('autorequest')"
				>
					Autorequest
					<span
						v-tippy
						content="You are autorequesting playlists"
						class="tag has-icon"
						v-if="autorequestPlaylistCount > 0"
						><i class="material-icons">play_arrow</i></span
					>
				</button>
				<button
					v-else-if="station.requests.allowAutorequest"
					class="button is-default disabled"
					content="Only available on station pages"
					v-tippy
				>
					Autorequest
				</button>
			</div>
			<div class="tab" v-show="tab === 'songs'">
				<div class="musare-songs">
					<label class="label">
						Search for a song on {{ sitename }}
					</label>
					<div class="control is-grouped input-with-button">
						<p class="control is-expanded">
							<input
								class="input"
								type="text"
								placeholder="Enter your song query here..."
								v-model="musareSearch.query"
								@keyup.enter="searchForMusareSongs(1)"
							/>
						</p>
						<p class="control">
							<a
								class="button is-info"
								@click="searchForMusareSongs(1)"
								><i class="material-icons icon-with-button"
									>search</i
								>Search</a
							>
						</p>
					</div>
					<div v-if="musareSearch.results.length > 0">
						<song-item
							v-for="song in musareSearch.results"
							:key="song._id"
							:song="song"
						>
							<template #actions>
								<transition
									name="musare-search-query-actions"
									mode="out-in"
								>
									<i
										v-if="
											songsInQueue.indexOf(
												song.mediaSource
											) !== -1
										"
										class="material-icons added-to-playlist-icon"
										content="Song is already in queue"
										v-tippy
										>done</i
									>
									<i
										v-else
										class="material-icons add-to-queue-icon"
										@click="
											addSongToQueue(song.mediaSource)
										"
										content="Add Song to Queue"
										v-tippy
										>queue</i
									>
								</transition>
							</template>
						</song-item>
						<button
							v-if="musareResultsLeftCount > 0"
							class="button is-primary load-more-button"
							@click="searchForMusareSongs(musareSearch.page + 1)"
						>
							Load {{ nextPageMusareResultsCount }} more results
						</button>
					</div>
				</div>

				<div class="youtube-direct">
					<label class="label"> Add a YouTube song from a URL </label>
					<div class="control is-grouped input-with-button">
						<p class="control is-expanded">
							<input
								class="input"
								type="text"
								placeholder="Enter your YouTube song URL here..."
								v-model="youtubeDirect"
								@keyup.enter="addToQueue(station._id)"
							/>
						</p>
						<p class="control">
							<a
								class="button is-info"
								@click="addToQueue(station._id)"
								><i class="material-icons icon-with-button"
									>add</i
								>Add</a
							>
						</p>
					</div>
				</div>

				<div
					class="youtube-search"
					v-if="!experimental.disable_youtube_search"
				>
					<label class="label"> Search for a song on YouTube </label>
					<div class="control is-grouped input-with-button">
						<p class="control is-expanded">
							<input
								class="input"
								type="text"
								placeholder="Enter your YouTube query here..."
								v-model="youtubeSearch.songs.query"
								autofocus
								@keyup.enter="searchForSongs()"
							/>
						</p>
						<p class="control">
							<a
								class="button is-info"
								@click.prevent="searchForSongs()"
								><i class="material-icons icon-with-button"
									>search</i
								>Search</a
							>
						</p>
					</div>

					<div
						v-if="youtubeSearch.songs.results.length > 0"
						id="song-query-results"
					>
						<search-query-item
							v-for="(result, index) in youtubeSearch.songs
								.results"
							:key="result.id"
							:result="result"
						>
							<template #actions>
								<transition
									name="youtube-search-query-actions"
									mode="out-in"
								>
									<i
										v-if="
											songsInQueue.indexOf(result.id) !==
											-1
										"
										class="material-icons added-to-playlist-icon"
										content="Song is already in queue"
										v-tippy
										>done</i
									>
									<i
										v-else
										class="material-icons add-to-queue-icon"
										@click="
											addSongToQueue(result.id, index)
										"
										content="Add Song to Queue"
										v-tippy
										>queue</i
									>
								</transition>
							</template>
						</search-query-item>

						<a
							class="button is-primary load-more-button"
							@click.prevent="loadMoreSongs()"
						>
							Load more...
						</a>
					</div>
				</div>

				<div v-if="experimental.soundcloud" class="soundcloud-direct">
					<label class="label">
						Add a SoundCloud song from a URL
					</label>
					<div class="control is-grouped input-with-button">
						<p class="control is-expanded">
							<input
								class="input"
								type="text"
								placeholder="Enter your SoundCloud song URL here..."
								v-model="soundcloudDirect"
								@keyup.enter="soundcloudAddToQueue(station._id)"
							/>
						</p>
						<p class="control">
							<a
								class="button is-info"
								@click="soundcloudAddToQueue(station._id)"
								><i class="material-icons icon-with-button"
									>add</i
								>Add</a
							>
						</p>
					</div>
				</div>
			</div>
			<playlist-tab-base
				v-if="!disableAutoRequest"
				class="tab"
				v-show="tab === 'autorequest'"
				:type="'autorequest'"
				:sector="sector"
				:modal-uuid="modalUuid"
			/>
		</div>
	</div>
</template>

<style lang="less" scoped>
.night-mode {
	.tabs-container .tab-selection .button {
		background: var(--dark-grey) !important;
		color: var(--white) !important;
	}
}

:deep(#create-new-playlist-button) {
	width: 100%;
}

.station-playlists {
	.top-info {
		font-size: 15px;
		margin-bottom: 15px;
	}

	.tabs-container {
		.tab-selection {
			margin-bottom: 10px;
			display: flex;
			overflow-x: auto;

			.button {
				border-radius: 0;
				border: 0;
				text-transform: uppercase;
				font-size: 14px;
				color: var(--dark-grey-3);
				background-color: var(--light-grey-2);
				flex-grow: 1;
				height: 32px;

				&:not(:first-of-type) {
					margin-left: 5px;
				}
			}

			.selected {
				background-color: var(--primary-color) !important;
				color: var(--white) !important;
				font-weight: 600;
			}
		}
		.tab {
			padding-bottom: 10px;
			border-radius: 0;

			.item.item-draggable:not(:last-of-type) {
				margin-bottom: 10px;
			}
			.load-more-button {
				width: 100%;
				margin-top: 10px;
			}
		}
	}
}

.youtube-direct {
	margin-top: 10px;
}

.youtube-search {
	margin-top: 10px;

	.search-query-item:not(:last-of-type) {
		margin-bottom: 10px;
	}
}
</style>
