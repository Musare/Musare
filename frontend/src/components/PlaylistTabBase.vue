<script setup lang="ts">
import { defineAsyncComponent, ref, reactive, computed, onMounted } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import ws from "@/ws";

import { useWebsocketsStore } from "@/stores/websockets";
import { useStationStore } from "@/stores/station";
import { useUserPlaylistsStore } from "@/stores/userPlaylists";
import { useModalsStore } from "@/stores/modals";
import { useManageStationStore } from "@/stores/manageStation";

import { useSortablePlaylists } from "@/composables/useSortablePlaylists";

const PlaylistItem = defineAsyncComponent(
	() => import("@/components/PlaylistItem.vue")
);
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);

const props = defineProps({
	modalUuid: { type: String, default: "" },
	type: {
		type: String,
		default: ""
	},
	sector: {
		type: String,
		default: "manageStation"
	}
});

const emit = defineEmits(["selected"]);

const { socket } = useWebsocketsStore();
const stationStore = useStationStore();

const tab = ref("current");
const search = reactive({
	query: "",
	searchedQuery: "",
	page: 0,
	count: 0,
	resultsLeft: 0,
	pageSize: 0,
	results: []
});
const featuredPlaylists = ref([]);
const tabs = ref({});

const {
	DraggableList,
	drag,
	playlists,
	savePlaylistOrder,
	orderOfPlaylists,
	myUserId,
	calculatePlaylistOrder
} = useSortablePlaylists();

const { autoRequest } = storeToRefs(stationStore);

const manageStationStore = useManageStationStore(props);
const { autofill } = storeToRefs(manageStationStore);

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

const blacklist = computed({
	get() {
		if (props.sector === "manageStation")
			return manageStationStore.blacklist;
		return stationStore.blacklist;
	},
	set(value) {
		if (props.sector === "manageStation")
			manageStationStore.setBlacklist(value);
		else stationStore.setBlacklist(value);
	}
});

const resultsLeftCount = computed(() => search.count - search.results.length);

const nextPageResultsCount = computed(() =>
	Math.min(search.pageSize, resultsLeftCount.value)
);

const hasPermission = permission =>
	props.sector === "manageStation"
		? manageStationStore.hasPermission(permission)
		: stationStore.hasPermission(permission);

const { openModal } = useModalsStore();

const { setPlaylists } = useUserPlaylistsStore();

const { addPlaylistToAutoRequest, removePlaylistFromAutoRequest } =
	stationStore;

const init = () => {
	socket.dispatch("playlists.indexMyPlaylists", res => {
		if (res.status === "success") setPlaylists(res.data.playlists);
		orderOfPlaylists.value = calculatePlaylistOrder(); // order in regards to the database
	});

	socket.dispatch("playlists.indexFeaturedPlaylists", res => {
		if (res.status === "success")
			featuredPlaylists.value = res.data.playlists;
	});

	if (props.type === "autofill")
		socket.dispatch(
			`stations.getStationAutofillPlaylistsById`,
			station.value._id,
			res => {
				if (res.status === "success") {
					station.value.autofill.playlists = res.data.playlists;
				}
			}
		);

	socket.dispatch(
		`stations.getStationBlacklistById`,
		station.value._id,
		res => {
			if (res.status === "success") {
				station.value.blacklist = res.data.playlists;
			}
		}
	);
};

const showTab = _tab => {
	tabs.value[`${_tab}-tab`].scrollIntoView({ block: "nearest" });
	tab.value = _tab;
};

const label = (tense = "future", typeOverwrite = null, capitalize = false) => {
	let label = typeOverwrite || props.type;

	if (tense === "past") label = `${label}ed`;
	if (tense === "present") label = `${label}ing`;

	if (capitalize) label = `${label.charAt(0).toUpperCase()}${label.slice(1)}`;

	return label;
};

const selectedPlaylists = (typeOverwrite?: string) => {
	const type = typeOverwrite || props.type;

	if (type === "autofill") return autofill.value;
	if (type === "blacklist") return blacklist.value;
	if (type === "autorequest") return autoRequest.value;
	return [];
};

const isSelected = (playlistId, typeOverwrite?: string) => {
	const type = typeOverwrite || props.type;
	let selected = false;

	selectedPlaylists(type).forEach(playlist => {
		if (playlist._id === playlistId) selected = true;
	});
	return selected;
};

const deselectPlaylist = (playlistId, typeOverwrite?: string) => {
	const type = typeOverwrite || props.type;

	if (type === "autofill")
		return new Promise(resolve => {
			socket.dispatch(
				"stations.removeAutofillPlaylist",
				station.value._id,
				playlistId,
				res => {
					new Toast(res.message);
					resolve(true);
				}
			);
		});
	if (type === "blacklist")
		return new Promise(resolve => {
			socket.dispatch(
				"stations.removeBlacklistedPlaylist",
				station.value._id,
				playlistId,
				res => {
					new Toast(res.message);
					resolve(true);
				}
			);
		});
	if (type === "autorequest")
		return new Promise(resolve => {
			removePlaylistFromAutoRequest(playlistId);
			new Toast("Successfully deselected playlist.");
			resolve(true);
		});
	return false;
};

const selectPlaylist = async (playlist, typeOverwrite?: string) => {
	const type = typeOverwrite || props.type;

	if (isSelected(playlist._id, type))
		return new Toast(`Error: Playlist already ${label("past", type)}.`);

	if (type === "autofill")
		return new Promise(resolve => {
			socket.dispatch(
				"stations.autofillPlaylist",
				station.value._id,
				playlist._id,
				res => {
					new Toast(res.message);
					emit("selected");
					resolve(true);
				}
			);
		});
	if (type === "blacklist") {
		if (props.type !== "blacklist" && isSelected(playlist._id))
			await deselectPlaylist(playlist._id);

		return new Promise(resolve => {
			socket.dispatch(
				"stations.blacklistPlaylist",
				station.value._id,
				playlist._id,
				res => {
					new Toast(res.message);
					emit("selected");
					resolve(true);
				}
			);
		});
	}
	if (type === "autorequest")
		return new Promise(resolve => {
			addPlaylistToAutoRequest(playlist);
			new Toast("Successfully selected playlist to auto request songs.");
			emit("selected");
			resolve(true);
		});
	return false;
};

const searchForPlaylists = page => {
	if (search.page >= page || search.searchedQuery !== search.query) {
		search.results = [];
		search.page = 0;
		search.count = 0;
		search.resultsLeft = 0;
		search.pageSize = 0;
	}

	const { query } = search;
	const action =
		station.value.type === "official" && props.type !== "autorequest"
			? "playlists.searchOfficial"
			: "playlists.searchCommunity";

	search.searchedQuery = search.query;
	socket.dispatch(action, query, page, res => {
		const { data } = res;
		if (res.status === "success") {
			const { count, pageSize, playlists } = data;
			search.results = [...search.results, ...playlists];
			search.page = page;
			search.count = count;
			search.resultsLeft = count - search.results.length;
			search.pageSize = pageSize;
		} else if (res.status === "error") {
			search.results = [];
			search.page = 0;
			search.count = 0;
			search.resultsLeft = 0;
			search.pageSize = 0;
			new Toast(res.message);
		}
	});
};

onMounted(() => {
	showTab("search");

	ws.onConnect(init);
});
</script>

<template>
	<div class="playlist-tab-base">
		<div v-if="$slots.info" class="top-info has-text-centered">
			<slot name="info" />
		</div>
		<div class="tabs-container">
			<div class="tab-selection">
				<button
					class="button is-default"
					:ref="el => (tabs['search-tab'] = el)"
					:class="{ selected: tab === 'search' }"
					@click="showTab('search')"
				>
					Search
				</button>
				<button
					class="button is-default"
					:ref="el => (tabs['current-tab'] = el)"
					:class="{ selected: tab === 'current' }"
					@click="showTab('current')"
				>
					Current
				</button>
				<button
					v-if="
						type === 'autorequest' || station.type === 'community'
					"
					class="button is-default"
					:ref="el => (tabs['my-playlists-tab'] = el)"
					:class="{ selected: tab === 'my-playlists' }"
					@click="showTab('my-playlists')"
				>
					My Playlists
				</button>
			</div>
			<div class="tab" v-show="tab === 'search'">
				<div v-if="featuredPlaylists.length > 0">
					<label class="label"> Featured playlists </label>
					<playlist-item
						v-for="featuredPlaylist in featuredPlaylists"
						:key="`featuredKey-${featuredPlaylist._id}`"
						:playlist="featuredPlaylist"
						:show-owner="true"
					>
						<template #item-icon>
							<i
								class="material-icons blacklisted-icon"
								v-if="
									isSelected(
										featuredPlaylist._id,
										'blacklist'
									)
								"
								:content="`This playlist is currently ${label(
									'past',
									'blacklist'
								)}`"
								v-tippy
							>
								block
							</i>
							<i
								class="material-icons"
								v-else-if="isSelected(featuredPlaylist._id)"
								:content="`This playlist is currently ${label(
									'past'
								)}`"
								v-tippy
							>
								play_arrow
							</i>
							<i
								class="material-icons"
								v-else
								:content="`This playlist is currently not ${label(
									'past'
								)}`"
								v-tippy
							>
								{{
									type === "blacklist"
										? "block"
										: "play_disabled"
								}}
							</i>
						</template>

						<template #actions>
							<i
								v-if="
									type !== 'blacklist' &&
									isSelected(
										featuredPlaylist._id,
										'blacklist'
									)
								"
								class="material-icons stop-icon"
								:content="`This playlist is ${label(
									'past',
									'blacklist'
								)} in this station`"
								v-tippy="{ theme: 'info' }"
								>play_disabled</i
							>
							<quick-confirm
								v-if="
									type !== 'blacklist' &&
									isSelected(featuredPlaylist._id)
								"
								@confirm="
									deselectPlaylist(featuredPlaylist._id)
								"
							>
								<i
									class="material-icons stop-icon"
									:content="`Stop ${label(
										'present'
									)} songs from this playlist`"
									v-tippy
								>
									stop
								</i>
							</quick-confirm>
							<i
								v-if="
									type !== 'blacklist' &&
									!isSelected(featuredPlaylist._id) &&
									!isSelected(
										featuredPlaylist._id,
										'blacklist'
									)
								"
								@click="selectPlaylist(featuredPlaylist)"
								class="material-icons play-icon"
								:content="`${label(
									'future',
									null,
									true
								)} songs from this playlist`"
								v-tippy
								>play_arrow</i
							>
							<quick-confirm
								v-if="
									type === 'blacklist' &&
									!isSelected(
										featuredPlaylist._id,
										'blacklist'
									)
								"
								@confirm="
									selectPlaylist(
										featuredPlaylist,
										'blacklist'
									)
								"
							>
								<i
									class="material-icons stop-icon"
									:content="`${label(
										'future',
										null,
										true
									)} Playlist`"
									v-tippy
									>block</i
								>
							</quick-confirm>
							<quick-confirm
								v-if="
									type === 'blacklist' &&
									isSelected(
										featuredPlaylist._id,
										'blacklist'
									)
								"
								@confirm="
									deselectPlaylist(featuredPlaylist._id)
								"
							>
								<i
									class="material-icons stop-icon"
									:content="`Stop ${label(
										'present'
									)} songs from this playlist`"
									v-tippy
								>
									stop
								</i>
							</quick-confirm>
							<i
								v-if="featuredPlaylist.createdBy === myUserId"
								@click="
									openModal({
										modal: 'editPlaylist',
										data: {
											playlistId: featuredPlaylist._id
										}
									})
								"
								class="material-icons edit-icon"
								content="Edit Playlist"
								v-tippy
								>edit</i
							>
							<i
								v-if="
									featuredPlaylist.createdBy !== myUserId &&
									(featuredPlaylist.privacy === 'public' ||
										hasPermission('playlists.view.others'))
								"
								@click="
									openModal({
										modal: 'editPlaylist',
										data: {
											playlistId: featuredPlaylist._id
										}
									})
								"
								class="material-icons edit-icon"
								content="View Playlist"
								v-tippy
								>visibility</i
							>
						</template>
					</playlist-item>
					<br />
				</div>
				<label class="label">Search for a playlist</label>
				<div class="control is-grouped input-with-button">
					<p class="control is-expanded">
						<input
							class="input"
							type="text"
							placeholder="Enter your playlist query here..."
							v-model="search.query"
							@keyup.enter="searchForPlaylists(1)"
						/>
					</p>
					<p class="control">
						<a class="button is-info" @click="searchForPlaylists(1)"
							><i class="material-icons icon-with-button"
								>search</i
							>Search</a
						>
					</p>
				</div>
				<div v-if="search.results.length > 0">
					<playlist-item
						v-for="playlist in search.results"
						:key="`searchKey-${playlist._id}`"
						:playlist="playlist"
						:show-owner="true"
					>
						<template #item-icon>
							<i
								class="material-icons blacklisted-icon"
								v-if="isSelected(playlist._id, 'blacklist')"
								:content="`This playlist is currently ${label(
									'past',
									'blacklist'
								)}`"
								v-tippy
							>
								block
							</i>
							<i
								class="material-icons"
								v-else-if="isSelected(playlist._id)"
								:content="`This playlist is currently ${label(
									'past'
								)}`"
								v-tippy
							>
								play_arrow
							</i>
							<i
								class="material-icons"
								v-else
								:content="`This playlist is currently not ${label(
									'past'
								)}`"
								v-tippy
							>
								{{
									type === "blacklist"
										? "block"
										: "play_disabled"
								}}
							</i>
						</template>

						<template #actions>
							<i
								v-if="
									type !== 'blacklist' &&
									isSelected(playlist._id, 'blacklist')
								"
								class="material-icons stop-icon"
								:content="`This playlist is ${label(
									'past',
									'blacklist'
								)} in this station`"
								v-tippy="{ theme: 'info' }"
								>play_disabled</i
							>
							<quick-confirm
								v-if="
									type !== 'blacklist' &&
									isSelected(playlist._id)
								"
								@confirm="deselectPlaylist(playlist._id)"
							>
								<i
									class="material-icons stop-icon"
									:content="`Stop ${label(
										'present'
									)} songs from this playlist`"
									v-tippy
								>
									stop
								</i>
							</quick-confirm>
							<i
								v-if="
									type !== 'blacklist' &&
									!isSelected(playlist._id) &&
									!isSelected(playlist._id, 'blacklist')
								"
								@click="selectPlaylist(playlist)"
								class="material-icons play-icon"
								:content="`${label(
									'future',
									null,
									true
								)} songs from this playlist`"
								v-tippy
								>play_arrow</i
							>
							<quick-confirm
								v-if="
									type === 'blacklist' &&
									!isSelected(playlist._id, 'blacklist')
								"
								@confirm="selectPlaylist(playlist, 'blacklist')"
							>
								<i
									class="material-icons stop-icon"
									:content="`${label(
										'future',
										null,
										true
									)} Playlist`"
									v-tippy
									>block</i
								>
							</quick-confirm>
							<quick-confirm
								v-if="
									type === 'blacklist' &&
									isSelected(playlist._id, 'blacklist')
								"
								@confirm="deselectPlaylist(playlist._id)"
							>
								<i
									class="material-icons stop-icon"
									:content="`Stop ${label(
										'present'
									)} songs from this playlist`"
									v-tippy
								>
									stop
								</i>
							</quick-confirm>
							<i
								v-if="playlist.createdBy === myUserId"
								@click="
									openModal({
										modal: 'editPlaylist',
										data: { playlistId: playlist._id }
									})
								"
								class="material-icons edit-icon"
								content="Edit Playlist"
								v-tippy
								>edit</i
							>
							<i
								v-if="
									playlist.createdBy !== myUserId &&
									(playlist.privacy === 'public' ||
										hasPermission('playlists.view.others'))
								"
								@click="
									openModal({
										modal: 'editPlaylist',
										data: { playlistId: playlist._id }
									})
								"
								class="material-icons edit-icon"
								content="View Playlist"
								v-tippy
								>visibility</i
							>
						</template>
					</playlist-item>
					<button
						v-if="resultsLeftCount > 0"
						class="button is-primary load-more-button"
						@click="searchForPlaylists(search.page + 1)"
					>
						Load {{ nextPageResultsCount }} more results
					</button>
				</div>
			</div>
			<div class="tab" v-show="tab === 'current'">
				<div v-if="selectedPlaylists().length > 0">
					<playlist-item
						v-for="playlist in selectedPlaylists()"
						:key="`key-${playlist._id}`"
						:playlist="playlist"
						:show-owner="true"
					>
						<template #item-icon>
							<i
								class="material-icons"
								:class="{
									'blacklisted-icon': type === 'blacklist'
								}"
								:content="`This playlist is currently ${label(
									'past'
								)}`"
								v-tippy
							>
								{{
									type === "blacklist"
										? "block"
										: "play_arrow"
								}}
							</i>
						</template>

						<template #actions>
							<quick-confirm
								@confirm="deselectPlaylist(playlist._id)"
							>
								<i
									class="material-icons stop-icon"
									:content="`Stop ${label(
										'present'
									)} songs from this playlist`"
									v-tippy
								>
									stop
								</i>
							</quick-confirm>
							<i
								v-if="playlist.createdBy === myUserId"
								@click="
									openModal({
										modal: 'editPlaylist',
										data: { playlistId: playlist._id }
									})
								"
								class="material-icons edit-icon"
								content="Edit Playlist"
								v-tippy
								>edit</i
							>
							<i
								v-if="
									playlist.createdBy !== myUserId &&
									(playlist.privacy === 'public' ||
										hasPermission('playlists.view.others'))
								"
								@click="
									openModal({
										modal: 'editPlaylist',
										data: { playlistId: playlist._id }
									})
								"
								class="material-icons edit-icon"
								content="View Playlist"
								v-tippy
								>visibility</i
							>
						</template>
					</playlist-item>
				</div>
				<p v-else class="has-text-centered scrollable-list">
					No playlists currently {{ label("present") }}.
				</p>
			</div>
			<div
				v-if="type === 'autorequest' || station.type === 'community'"
				class="tab"
				v-show="tab === 'my-playlists'"
			>
				<button
					class="button is-primary"
					id="create-new-playlist-button"
					@click="openModal('createPlaylist')"
				>
					Create new playlist
				</button>
				<div
					class="menu-list scrollable-list"
					v-if="playlists.length > 0"
				>
					<draggable-list
						v-model:list="playlists"
						item-key="_id"
						@start="drag = true"
						@end="drag = false"
						@update="savePlaylistOrder"
					>
						<template #item="{ element }">
							<playlist-item :playlist="element">
								<template #item-icon>
									<i
										class="material-icons blacklisted-icon"
										v-if="
											isSelected(element._id, 'blacklist')
										"
										:content="`This playlist is currently ${label(
											'past',
											'blacklist'
										)}`"
										v-tippy
									>
										block
									</i>
									<i
										class="material-icons"
										v-else-if="isSelected(element._id)"
										:content="`This playlist is currently ${label(
											'past'
										)}`"
										v-tippy
									>
										play_arrow
									</i>
									<i
										class="material-icons"
										v-else
										:content="`This playlist is currently not ${label(
											'past'
										)}`"
										v-tippy
									>
										{{
											type === "blacklist"
												? "block"
												: "play_disabled"
										}}
									</i>
								</template>

								<template #actions>
									<i
										v-if="
											type !== 'blacklist' &&
											isSelected(element._id, 'blacklist')
										"
										class="material-icons stop-icon"
										:content="`This playlist is ${label(
											'past',
											'blacklist'
										)} in this station`"
										v-tippy="{ theme: 'info' }"
										>play_disabled</i
									>
									<quick-confirm
										v-if="
											type !== 'blacklist' &&
											isSelected(element._id)
										"
										@confirm="deselectPlaylist(element._id)"
									>
										<i
											class="material-icons stop-icon"
											:content="`Stop ${label(
												'present'
											)} songs from this playlist`"
											v-tippy
										>
											stop
										</i>
									</quick-confirm>
									<i
										v-if="
											type !== 'blacklist' &&
											!isSelected(element._id) &&
											!isSelected(
												element._id,
												'blacklist'
											)
										"
										@click="selectPlaylist(element)"
										class="material-icons play-icon"
										:content="`${label(
											'future',
											null,
											true
										)} songs from this playlist`"
										v-tippy
										>play_arrow</i
									>
									<quick-confirm
										v-if="
											type === 'blacklist' &&
											!isSelected(
												element._id,
												'blacklist'
											)
										"
										@confirm="
											selectPlaylist(element, 'blacklist')
										"
									>
										<i
											class="material-icons stop-icon"
											:content="`${label(
												'future',
												null,
												true
											)} Playlist`"
											v-tippy
											>block</i
										>
									</quick-confirm>
									<quick-confirm
										v-if="
											type === 'blacklist' &&
											isSelected(element._id, 'blacklist')
										"
										@confirm="deselectPlaylist(element._id)"
									>
										<i
											class="material-icons stop-icon"
											:content="`Stop ${label(
												'present'
											)} songs from this playlist`"
											v-tippy
										>
											stop
										</i>
									</quick-confirm>
									<i
										@click="
											openModal({
												modal: 'editPlaylist',
												data: {
													playlistId: element._id
												}
											})
										"
										class="material-icons edit-icon"
										content="Edit Playlist"
										v-tippy
										>edit</i
									>
								</template>
							</playlist-item>
						</template>
					</draggable-list>
				</div>

				<p v-else class="has-text-centered scrollable-list">
					You don't have any playlists!
				</p>
			</div>
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

.blacklisted-icon {
	color: var(--dark-red);
}

.playlist-tab-base {
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
			padding: 15px 0;
			border-radius: 0;
			.playlist-item:not(:last-of-type) {
				margin-bottom: 10px;
			}
			.load-more-button {
				width: 100%;
				margin-top: 10px;
			}
		}
	}
}
.draggable-list-transition-move {
	transition: transform 0.5s;
}

.draggable-list-ghost {
	opacity: 0.5;
	filter: brightness(95%);
}
</style>
