<template>
	<div class="station-playlists">
		<div class="tabs-container">
			<div class="tab-selection">
				<button
					class="button is-default"
					ref="search-tab"
					:class="{ selected: tab === 'search' }"
					@click="showTab('search')"
				>
					Search
				</button>
				<button
					v-if="station.type === 'community'"
					class="button is-default"
					ref="my-playlists-tab"
					:class="{ selected: tab === 'my-playlists' }"
					@click="showTab('my-playlists')"
				>
					My Playlists
				</button>
				<button
					class="button is-default"
					ref="party-tab"
					:class="{ selected: tab === 'party' }"
					v-if="isPartyMode()"
					@click="showTab('party')"
				>
					Party
				</button>
				<button
					class="button is-default"
					ref="included-tab"
					:class="{ selected: tab === 'included' }"
					v-if="isPlaylistMode()"
					@click="showTab('included')"
				>
					Included
				</button>
				<button
					class="button is-default"
					ref="excluded-tab"
					:class="{ selected: tab === 'excluded' }"
					@click="showTab('excluded')"
				>
					Excluded
				</button>
			</div>
			<div class="tab" v-show="tab === 'search'">
				<label class="label"> Search for a public playlist </label>
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
								class="material-icons"
								v-if="
									isAllowedToParty() &&
									isSelected(playlist._id)
								"
								content="This playlist is currently selected"
								v-tippy
							>
								radio
							</i>
							<i
								class="material-icons"
								v-else-if="
									isOwnerOrAdmin() &&
									isPlaylistMode() &&
									isIncluded(playlist._id)
								"
								content="This playlist is currently included"
								v-tippy
							>
								play_arrow
							</i>
							<i
								class="material-icons excluded-icon"
								v-else-if="
									isOwnerOrAdmin() && isExcluded(playlist._id)
								"
								content="This playlist is currently excluded"
								v-tippy
							>
								block
							</i>
							<i
								class="material-icons"
								v-else
								:content="
									isPartyMode()
										? 'This playlist is currently not selected or excluded'
										: 'This playlist is currently not included or excluded'
								"
								v-tippy
							>
								play_disabled
							</i>
						</template>

						<template #actions>
							<i
								v-if="isExcluded(playlist._id)"
								class="material-icons stop-icon"
								content="This playlist is blacklisted in this station"
								v-tippy="{ theme: 'info' }"
								>play_disabled</i
							>
							<confirm
								v-if="isPartyMode() && isSelected(playlist._id)"
								@confirm="deselectPartyPlaylist(playlist._id)"
							>
								<i
									class="material-icons stop-icon"
									content="Stop playing songs from this playlist"
									v-tippy
								>
									stop
								</i>
							</confirm>
							<confirm
								v-if="
									isOwnerOrAdmin() &&
									isPlaylistMode() &&
									isIncluded(playlist._id)
								"
								@confirm="removeIncludedPlaylist(playlist._id)"
							>
								<i
									class="material-icons stop-icon"
									content="Stop playing songs from this playlist"
									v-tippy
								>
									stop
								</i>
							</confirm>
							<i
								v-if="
									isPartyMode() &&
									!isSelected(playlist._id) &&
									!isExcluded(playlist._id)
								"
								@click="selectPartyPlaylist(playlist)"
								class="material-icons play-icon"
								content="Request songs from this playlist"
								v-tippy
								>play_arrow</i
							>
							<i
								v-if="
									isOwnerOrAdmin() &&
									isPlaylistMode() &&
									!isIncluded(playlist._id) &&
									!isExcluded(playlist._id)
								"
								@click="includePlaylist(playlist)"
								class="material-icons play-icon"
								:content="'Play songs from this playlist'"
								v-tippy
								>play_arrow</i
							>
							<confirm
								v-if="
									isOwnerOrAdmin() &&
									!isExcluded(playlist._id)
								"
								@confirm="blacklistPlaylist(playlist._id)"
							>
								<i
									class="material-icons stop-icon"
									content="Blacklist Playlist"
									v-tippy
									>block</i
								>
							</confirm>
							<confirm
								v-if="
									isOwnerOrAdmin() && isExcluded(playlist._id)
								"
								@confirm="removeExcludedPlaylist(playlist._id)"
							>
								<i
									class="material-icons stop-icon"
									content="Stop blacklisting songs from this playlist"
									v-tippy
								>
									stop
								</i>
							</confirm>
							<i
								v-if="playlist.createdBy === myUserId"
								@click="showPlaylist(playlist._id)"
								class="material-icons edit-icon"
								content="Edit Playlist"
								v-tippy
								>edit</i
							>
							<i
								v-if="
									playlist.createdBy !== myUserId &&
									(playlist.privacy === 'public' || isAdmin())
								"
								@click="showPlaylist(playlist._id)"
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
			<div
				v-if="station.type === 'community'"
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
					<draggable
						tag="transition-group"
						:component-data="{
							name: !drag ? 'draggable-list-transition' : null
						}"
						item-key="_id"
						v-model="playlists"
						v-bind="dragOptions"
						@start="drag = true"
						@end="drag = false"
						@change="savePlaylistOrder"
					>
						<template #item="{ element }">
							<playlist-item
								class="item-draggable"
								:playlist="element"
							>
								<template #item-icon>
									<i
										class="material-icons"
										v-if="
											isAllowedToParty() &&
											isSelected(element._id)
										"
										content="This playlist is currently selected"
										v-tippy
									>
										radio
									</i>
									<i
										class="material-icons"
										v-else-if="
											isOwnerOrAdmin() &&
											isPlaylistMode() &&
											isIncluded(element._id)
										"
										content="This playlist is currently included"
										v-tippy
									>
										play_arrow
									</i>
									<i
										class="material-icons excluded-icon"
										v-else-if="
											isOwnerOrAdmin() &&
											isExcluded(element._id)
										"
										content="This playlist is currently excluded"
										v-tippy
									>
										block
									</i>
									<i
										class="material-icons"
										v-else
										:content="
											isPartyMode()
												? 'This playlist is currently not selected or excluded'
												: 'This playlist is currently not included or excluded'
										"
										v-tippy
									>
										play_disabled
									</i>
								</template>

								<template #actions>
									<!-- <i
									v-if="isExcluded(playlist._id)"
									class="material-icons stop-icon"
									content="This playlist is blacklisted in this station"
									v-tippy="{ theme: 'info' }"
									>play_disabled</i
								> -->
									<i
										v-if="
											isPartyMode() &&
											!isSelected(element._id)
										"
										@click="selectPartyPlaylist(element)"
										class="material-icons play-icon"
										content="Request songs from this playlist"
										v-tippy
										>play_arrow</i
									>
									<i
										v-if="
											isPlaylistMode() &&
											isOwnerOrAdmin() &&
											!isSelected(element._id)
										"
										@click="includePlaylist(element)"
										class="material-icons play-icon"
										content="Play songs from this playlist"
										v-tippy
										>play_arrow</i
									>
									<confirm
										v-if="
											isPartyMode() &&
											isSelected(element._id)
										"
										@confirm="
											deselectPartyPlaylist(element._id)
										"
									>
										<i
											class="material-icons stop-icon"
											content="Stop requesting songs from this playlist"
											v-tippy
											>stop</i
										>
									</confirm>
									<confirm
										v-if="
											isPlaylistMode() &&
											isOwnerOrAdmin() &&
											isIncluded(element._id)
										"
										@confirm="
											removeIncludedPlaylist(element._id)
										"
									>
										<i
											class="material-icons stop-icon"
											content="Stop playing songs from this playlist"
											v-tippy
											>stop</i
										>
									</confirm>
									<confirm
										v-if="
											isOwnerOrAdmin() &&
											!isExcluded(element._id)
										"
										@confirm="
											blacklistPlaylist(element._id)
										"
									>
										<i
											class="material-icons stop-icon"
											content="Blacklist Playlist"
											v-tippy
											>block</i
										>
									</confirm>
									<confirm
										v-if="
											isOwnerOrAdmin() &&
											isExcluded(element._id)
										"
										@confirm="
											removeExcludedPlaylist(element._id)
										"
									>
										<i
											class="material-icons stop-icon"
											content="Stop blacklisting songs from this playlist"
											v-tippy
										>
											stop
										</i>
									</confirm>
									<i
										@click="showPlaylist(element._id)"
										class="material-icons edit-icon"
										content="Edit Playlist"
										v-tippy
										>edit</i
									>
								</template>
							</playlist-item>
						</template>
					</draggable>
				</div>

				<p v-else class="has-text-centered scrollable-list">
					You don't have any playlists!
				</p>
			</div>
			<div class="tab" v-show="tab === 'party'" v-if="isPartyMode()">
				<div v-if="partyPlaylists.length > 0">
					<playlist-item
						v-for="playlist in partyPlaylists"
						:key="`key-${playlist._id}`"
						:playlist="playlist"
						:show-owner="true"
					>
						<template #item-icon>
							<i
								class="material-icons"
								content="This playlist is currently selected"
								v-tippy
							>
								radio
							</i>
						</template>

						<template #actions>
							<confirm
								v-if="isOwnerOrAdmin()"
								@confirm="deselectPartyPlaylist(playlist._id)"
							>
								<i
									class="material-icons stop-icon"
									content="Stop playing songs from this playlist"
									v-tippy
								>
									stop
								</i>
							</confirm>
							<confirm
								v-if="isOwnerOrAdmin()"
								@confirm="blacklistPlaylist(playlist._id)"
							>
								<i
									class="material-icons stop-icon"
									content="Blacklist Playlist"
									v-tippy
									>block</i
								>
							</confirm>
							<i
								v-if="playlist.createdBy === myUserId"
								@click="showPlaylist(playlist._id)"
								class="material-icons edit-icon"
								content="Edit Playlist"
								v-tippy
								>edit</i
							>
							<i
								v-if="
									playlist.createdBy !== myUserId &&
									(playlist.privacy === 'public' || isAdmin())
								"
								@click="showPlaylist(playlist._id)"
								class="material-icons edit-icon"
								content="View Playlist"
								v-tippy
								>visibility</i
							>
						</template>
					</playlist-item>
				</div>
				<p v-else class="has-text-centered scrollable-list">
					No playlists currently being played.
				</p>
			</div>
			<div
				class="tab"
				v-show="tab === 'included'"
				v-if="isPlaylistMode()"
			>
				<div v-if="includedPlaylists.length > 0">
					<playlist-item
						v-for="playlist in includedPlaylists"
						:key="`key-${playlist._id}`"
						:playlist="playlist"
						:show-owner="true"
					>
						<template #item-icon>
							<i
								class="material-icons"
								content="This playlist is currently included"
								v-tippy
							>
								play_arrow
							</i>
						</template>

						<template #actions>
							<confirm
								v-if="isOwnerOrAdmin()"
								@confirm="removeIncludedPlaylist(playlist._id)"
							>
								<i
									class="material-icons stop-icon"
									content="Stop playing songs from this playlist"
									v-tippy
								>
									stop
								</i>
							</confirm>
							<confirm
								v-if="isOwnerOrAdmin()"
								@confirm="blacklistPlaylist(playlist._id)"
							>
								<i
									class="material-icons stop-icon"
									content="Blacklist Playlist"
									v-tippy
									>block</i
								>
							</confirm>
							<i
								v-if="playlist.createdBy === myUserId"
								@click="showPlaylist(playlist._id)"
								class="material-icons edit-icon"
								content="Edit Playlist"
								v-tippy
								>edit</i
							>
							<i
								v-if="
									playlist.createdBy !== myUserId &&
									(playlist.privacy === 'public' || isAdmin())
								"
								@click="showPlaylist(playlist._id)"
								class="material-icons edit-icon"
								content="View Playlist"
								v-tippy
								>visibility</i
							>
						</template>
					</playlist-item>
				</div>
				<p v-else class="has-text-centered scrollable-list">
					No playlists currently included.
				</p>
			</div>
			<div
				class="tab"
				v-show="tab === 'excluded'"
				v-if="isOwnerOrAdmin()"
			>
				<div v-if="excludedPlaylists.length > 0">
					<playlist-item
						:playlist="playlist"
						v-for="playlist in excludedPlaylists"
						:key="`key-${playlist._id}`"
					>
						<template #item-icon>
							<i
								class="material-icons excluded-icon"
								content="This playlist is currently excluded"
								v-tippy
							>
								block
							</i>
						</template>

						<template #actions>
							<confirm
								@confirm="removeExcludedPlaylist(playlist._id)"
							>
								<i
									class="material-icons stop-icon"
									content="Stop blacklisting songs from this playlist
							"
									v-tippy
									>stop</i
								>
							</confirm>
							<i
								v-if="playlist.createdBy === userId"
								@click="showPlaylist(playlist._id)"
								class="material-icons edit-icon"
								content="Edit Playlist"
								v-tippy
								>edit</i
							>
							<i
								v-else
								@click="showPlaylist(playlist._id)"
								class="material-icons edit-icon"
								content="View Playlist"
								v-tippy
								>visibility</i
							>
						</template>
					</playlist-item>
				</div>
				<p v-else class="has-text-centered scrollable-list">
					No playlists currently excluded.
				</p>
			</div>
		</div>
	</div>
</template>
<script>
import { mapActions, mapState, mapGetters } from "vuex";

import Toast from "toasters";
import PlaylistItem from "@/components/PlaylistItem.vue";
import Confirm from "@/components/Confirm.vue";

import SortablePlaylists from "@/mixins/SortablePlaylists.vue";

export default {
	components: {
		PlaylistItem,
		Confirm
	},
	mixins: [SortablePlaylists],
	data() {
		return {
			tab: "included",
			search: {
				query: "",
				searchedQuery: "",
				page: 0,
				count: 0,
				resultsLeft: 0,
				results: []
			}
		};
	},
	computed: {
		resultsLeftCount() {
			return this.search.count - this.search.results.length;
		},
		nextPageResultsCount() {
			return Math.min(this.search.pageSize, this.resultsLeftCount);
		},
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			role: state => state.user.auth.role,
			userId: state => state.user.auth.userId,
			partyPlaylists: state => state.station.partyPlaylists
		}),
		...mapState("modals/manageStation", {
			parentTab: state => state.tab,
			originalStation: state => state.originalStation,
			station: state => state.station,
			includedPlaylists: state => state.includedPlaylists,
			excludedPlaylists: state => state.excludedPlaylists,
			songsList: state => state.songsList
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	watch: {
		// eslint-disable-next-line func-names
		parentTab(value) {
			if (value === "playlists") {
				if (this.tab === "included" && this.isPartyMode()) {
					this.showTab("party");
				} else if (this.tab === "party" && this.isPlaylistMode()) {
					this.showTab("included");
				}
			}
		}
	},
	mounted() {
		if (this.station.type === "community" && this.station.partyMode)
			this.showTab("search");

		this.socket.dispatch("playlists.indexMyPlaylists", true, res => {
			if (res.status === "success") this.setPlaylists(res.data.playlists);
			this.orderOfPlaylists = this.calculatePlaylistOrder(); // order in regards to the database
		});

		this.socket.dispatch(
			`stations.getStationIncludedPlaylistsById`,
			this.station._id,
			res => {
				if (res.status === "success") {
					this.station.includedPlaylists = res.data.playlists;
					this.originalStation.includedPlaylists = res.data.playlists;
				}
			}
		);

		this.socket.dispatch(
			`stations.getStationExcludedPlaylistsById`,
			this.station._id,
			res => {
				if (res.status === "success") {
					this.station.excludedPlaylists = res.data.playlists;
					this.originalStation.excludedPlaylists = res.data.playlists;
				}
			}
		);
	},
	methods: {
		showTab(tab) {
			this.$refs[`${tab}-tab`].scrollIntoView();
			this.tab = tab;
		},
		isOwner() {
			return (
				this.loggedIn &&
				this.station &&
				this.userId === this.station.owner
			);
		},
		isAdmin() {
			return this.loggedIn && this.role === "admin";
		},
		isOwnerOrAdmin() {
			return this.isOwner() || this.isAdmin();
		},
		isPartyMode() {
			return (
				this.station &&
				this.station.type === "community" &&
				this.station.partyMode
			);
		},
		isAllowedToParty() {
			return (
				this.station &&
				this.isPartyMode() &&
				(!this.station.locked || this.isOwnerOrAdmin()) &&
				this.loggedIn
			);
		},
		isPlaylistMode() {
			return this.station && !this.isPartyMode();
		},
		showPlaylist(playlistId) {
			this.editPlaylist(playlistId);
			this.openModal("editPlaylist");
		},
		selectPartyPlaylist(playlist) {
			if (!this.isSelected(playlist.id)) {
				this.partyPlaylists.push(playlist);
				this.addPartyPlaylistSongToQueue();
				new Toast(
					"Successfully selected playlist to auto request songs."
				);
			} else {
				new Toast("Error: Playlist already selected.");
			}
		},
		includePlaylist(playlist) {
			this.socket.dispatch(
				"stations.includePlaylist",
				this.station._id,
				playlist._id,
				res => {
					new Toast(res.message);
				}
			);
		},
		deselectPartyPlaylist(id) {
			return new Promise(resolve => {
				let selected = false;
				this.partyPlaylists.forEach((playlist, index) => {
					if (playlist._id === id) {
						selected = true;
						this.partyPlaylists.splice(index, 1);
					}
				});
				if (selected) {
					new Toast("Successfully deselected playlist.");
					resolve();
				} else {
					new Toast("Playlist not selected.");
					resolve();
				}
			});
		},
		removeIncludedPlaylist(id) {
			return new Promise(resolve => {
				this.socket.dispatch(
					"stations.removeIncludedPlaylist",
					this.station._id,
					id,
					res => {
						new Toast(res.message);
						resolve();
					}
				);
			});
		},
		removeExcludedPlaylist(id) {
			return new Promise(resolve => {
				this.socket.dispatch(
					"stations.removeExcludedPlaylist",
					this.station._id,
					id,
					res => {
						new Toast(res.message);
						resolve();
					}
				);
			});
		},
		isSelected(id) {
			let selected = false;
			this.partyPlaylists.forEach(playlist => {
				if (playlist._id === id) selected = true;
			});
			return selected;
		},
		isIncluded(id) {
			let included = false;
			this.includedPlaylists.forEach(playlist => {
				if (playlist._id === id) included = true;
			});
			return included;
		},
		isExcluded(id) {
			let selected = false;
			this.excludedPlaylists.forEach(playlist => {
				if (playlist._id === id) selected = true;
			});
			return selected;
		},
		searchForPlaylists(page) {
			if (
				this.search.page >= page ||
				this.search.searchedQuery !== this.search.query
			) {
				this.search.results = [];
				this.search.page = 0;
				this.search.count = 0;
				this.search.resultsLeft = 0;
				this.search.pageSize = 0;
			}

			const { query } = this.search;
			const action =
				this.station.type === "official"
					? "playlists.searchOfficial"
					: "playlists.searchCommunity";

			this.search.searchedQuery = this.search.query;
			this.socket.dispatch(action, query, page, res => {
				const { data } = res;
				const { count, pageSize, playlists } = data;
				if (res.status === "success") {
					this.search.results = [
						...this.search.results,
						...playlists
					];
					this.search.page = page;
					this.search.count = count;
					this.search.resultsLeft =
						count - this.search.results.length;
					this.search.pageSize = pageSize;
				} else if (res.status === "error") {
					this.search.results = [];
					this.search.page = 0;
					this.search.count = 0;
					this.search.resultsLeft = 0;
					this.search.pageSize = 0;
					new Toast(res.message);
				}
			});
		},
		async blacklistPlaylist(id) {
			if (this.isIncluded(id)) await this.removeIncludedPlaylist(id);

			this.socket.dispatch(
				"stations.excludePlaylist",
				this.station._id,
				id,
				res => {
					new Toast(res.message);
				}
			);
		},
		addPartyPlaylistSongToQueue() {
			let isInQueue = false;
			if (
				this.station.type === "community" &&
				this.station.partyMode === true
			) {
				this.songsList.forEach(queueSong => {
					if (queueSong.requestedBy === this.userId) isInQueue = true;
				});
				if (!isInQueue && this.partyPlaylists) {
					const selectedPlaylist =
						this.partyPlaylists[
							Math.floor(
								Math.random() * this.partyPlaylists.length
							)
						];
					if (
						selectedPlaylist._id &&
						selectedPlaylist.songs.length > 0
					) {
						const selectedSong =
							selectedPlaylist.songs[
								Math.floor(
									Math.random() *
										selectedPlaylist.songs.length
								)
							];
						if (selectedSong.youtubeId) {
							this.socket.dispatch(
								"stations.addToQueue",
								this.station._id,
								selectedSong.youtubeId,
								data => {
									if (data.status !== "success")
										new Toast("Error auto queueing song");
								}
							);
						}
					}
				}
			}
		},
		...mapActions("station", ["updatePartyPlaylists"]),
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("user/playlists", ["editPlaylist", "setPlaylists"])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.tabs-container .tab-selection .button {
		background: var(--dark-grey) !important;
		color: var(--white) !important;
	}
}

.excluded-icon {
	color: var(--red);
}

.included-icon {
	color: var(--green);
}

.selected-icon {
	color: var(--purple);
}

.station-playlists {
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
			.playlist-item:not(:last-of-type),
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
.draggable-list-transition-move {
	transition: transform 0.5s;
}

.draggable-list-ghost {
	opacity: 0.5;
	filter: brightness(95%);
}
</style>
