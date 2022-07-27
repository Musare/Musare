<script setup lang="ts">
import { defineAsyncComponent, ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";
import useSearchYoutube from "@/composables/useSearchYoutube";
import useSearchMusare from "@/composables/useSearchMusare";

const SongItem = defineAsyncComponent(
	() => import("@/components/SongItem.vue")
);
const SearchQueryItem = defineAsyncComponent(
	() => import("@/components/SearchQueryItem.vue")
);
const PlaylistTabBase = defineAsyncComponent(
	() => import("@/components/PlaylistTabBase.vue")
);

const store = useStore();
const { youtubeSearch, searchForSongs, loadMoreSongs } = useSearchYoutube();
const { musareSearch, searchForMusareSongs } = useSearchMusare();

const { socket } = useWebsocketsStore();

const props = defineProps({
	modalUuid: { type: String, default: "" },
	sector: { type: String, default: "station" },
	disableAutoRequest: { type: Boolean, default: false }
});

const tab = ref("songs");
const sitename = ref("Musare");
const tabs = ref({});

// const loggedIn = computed(() => store.state.user.auth.loggedIn);
// const role = computed(() => store.state.user.auth.role);
// const userId = computed(() => store.state.user.auth.userId);

const station = computed({
	get() {
		if (props.sector === "manageStation")
			return store.state.modals.manageStation[props.modalUuid].station;
		return store.state.station.station;
	},
	set(station) {
		if (props.sector === "manageStation")
			store.commit(
				`modals/manageStation/${props.modalUuid}/updateStation`,
				station
			);
		else store.commit("station/updateStation", station);
	}
});
// const blacklist = computed({
// 	get() {
// 		if (props.sector === "manageStation")
// 			return store.state.modals.manageStation[props.modalUuid]
// 				.blacklist;
// 		return store.state.station.blacklist;
// 	},
// 	set(blacklist) {
// 		if (props.sector === "manageStation")
// 			store.commit(
// 				`modals/manageStation/${props.modalUuid}/setBlacklist`,
// 				blacklist
// 			);
// 		else store.commit("station/setBlacklist", blacklist);
// 	}
// });
const songsList = computed({
	get() {
		if (props.sector === "manageStation")
			return store.state.modals.manageStation[props.modalUuid].songsList;
		return store.state.station.songsList;
	},
	set(songsList) {
		if (props.sector === "manageStation")
			store.commit(
				`modals/manageStation/${props.modalUuid}/updateSongsList`,
				songsList
			);
		else store.commit("station/updateSongsList", songsList);
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
			.map(song => song.youtubeId)
			.concat(station.value.currentSong.youtubeId);
	return songsList.value.map(song => song.youtubeId);
});
// const currentUserQueueSongs = computed(
// 	() =>
// 		songsList.value.filter(
// 			queueSong => queueSong.requestedBy === userId.value
// 		).length
// );

const showTab = _tab => {
	tabs.value[`${_tab}-tab`].scrollIntoView({ block: "nearest" });
	tab.value = _tab;
};

const addSongToQueue = (youtubeId, index) => {
	socket.dispatch(
		"stations.addToQueue",
		station.value._id,
		youtubeId,
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

onMounted(async () => {
	sitename.value = await lofig.get("siteSettings.sitename");

	showTab("songs");
});
</script>

<template>
	<div class="station-playlists">
		<p class="top-info has-text-centered">
			Add songs to the queue or automatically request songs from playlists
		</p>
		<div class="tabs-container">
			<div class="tab-selection">
				<button
					class="button is-default"
					:ref="el => (tabs['songs-tab'] = el)"
					:class="{ selected: tab === 'songs' }"
					@click="showTab('songs')"
				>
					Songs
				</button>
				<button
					v-if="!disableAutoRequest"
					class="button is-default"
					:ref="el => (tabs['autorequest-tab'] = el)"
					:class="{ selected: tab === 'autorequest' }"
					@click="showTab('autorequest')"
				>
					Autorequest
				</button>
				<button
					v-else
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
												song.youtubeId
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
										@click="addSongToQueue(song.youtubeId)"
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

				<div class="youtube-search">
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
			padding: 10px 0;
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

.youtube-search {
	margin-top: 10px;

	.search-query-item:not(:last-of-type) {
		margin-bottom: 10px;
	}
}
</style>
