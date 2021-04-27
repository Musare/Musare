<template>
	<div class="station-playlists">
		<div class="tabs-container">
			<div class="tab-selection">
				<button
					class="button is-default"
					:class="{ selected: tab === 'current' }"
					@click="showTab('current')"
				>
					Current
				</button>
				<button
					class="button is-default"
					:class="{ selected: tab === 'search' }"
					@click="showTab('search')"
				>
					Search
				</button>
				<button
					v-if="station.type === 'community'"
					class="button is-default"
					:class="{ selected: tab === 'my-playlists' }"
					@click="showTab('my-playlists')"
				>
					My Playlists
				</button>
			</div>
			<div class="tab" v-show="tab === 'current'">
				<div v-if="currentPlaylists.length > 0">
					<playlist-item
						v-for="(playlist, index) in currentPlaylists"
						:key="'key-' + index"
						:playlist="playlist"
						:show-owner="true"
					>
						<div class="icons-group" slot="actions">
							<confirm
								v-if="isOwnerOrAdmin()"
								@confirm="deselectPlaylist(playlist._id)"
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
										(playlist.privacy === 'public' ||
											isAdmin())
								"
								@click="showPlaylist(playlist._id)"
								class="material-icons edit-icon"
								content="View Playlist"
								v-tippy
								>visibility</i
							>
						</div>
					</playlist-item>
				</div>
				<p v-else class="has-text-centered scrollable-list">
					No playlists currently selected.
				</p>
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
						v-for="(playlist, index) in search.results"
						:key="'searchKey-' + index"
						:playlist="playlist"
						:show-owner="true"
					>
						<div class="icons-group" slot="actions">
							<i
								v-if="isExcluded(playlist._id)"
								class="material-icons stop-icon"
								content="This playlist is blacklisted in this station"
								v-tippy
								>play_disabled</i
							>
							<confirm
								v-if="
									(isOwnerOrAdmin() ||
										(station.type === 'community' &&
											station.partyMode)) &&
										isSelected(playlist._id)
								"
								@confirm="deselectPlaylist(playlist._id)"
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
									(isOwnerOrAdmin() ||
										(station.type === 'community' &&
											station.partyMode)) &&
										!isSelected(playlist._id) &&
										!isExcluded(playlist._id)
								"
								@click="selectPlaylist(playlist)"
								class="material-icons play-icon"
								:content="
									station.partyMode
										? 'Request songs from this playlist'
										: 'Play songs from this playlist'
								"
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
										(playlist.privacy === 'public' ||
											isAdmin())
								"
								@click="showPlaylist(playlist._id)"
								class="material-icons edit-icon"
								content="View Playlist"
								v-tippy
								>visibility</i
							>
						</div>
					</playlist-item>
					<button
						v-if="resultsLeftCount > 0"
						class="button is-primary"
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
				<draggable
					class="menu-list scrollable-list"
					v-if="playlists.length > 0"
					v-model="playlists"
					v-bind="dragOptions"
					@start="drag = true"
					@end="drag = false"
					@change="savePlaylistOrder"
				>
					<transition-group
						type="transition"
						:name="!drag ? 'draggable-list-transition' : null"
					>
						<playlist-item
							class="item-draggable"
							v-for="playlist in playlists"
							:key="playlist._id"
							:playlist="playlist"
						>
							<div slot="actions">
								<i
									v-if="isExcluded(playlist._id)"
									class="material-icons stop-icon"
									content="This playlist is blacklisted in this station"
									v-tippy
									>play_disabled</i
								>
								<i
									v-if="
										station.type === 'community' &&
											(isOwnerOrAdmin() ||
												station.partyMode) &&
											!isSelected(playlist._id) &&
											!isExcluded(playlist._id)
									"
									@click="selectPlaylist(playlist)"
									class="material-icons play-icon"
									:content="
										station.partyMode
											? 'Request songs from this playlist'
											: 'Play songs from this playlist'
									"
									v-tippy
									>play_arrow</i
								>
								<confirm
									v-if="
										station.type === 'community' &&
											(isOwnerOrAdmin() ||
												station.partyMode) &&
											isSelected(playlist._id)
									"
									@confirm="deselectPlaylist(playlist._id)"
								>
									<i
										class="material-icons stop-icon"
										:content="
											station.partyMode
												? 'Stop requesting songs from this playlist'
												: 'Stop playing songs from this playlist'
										"
										v-tippy
										>stop</i
									>
								</confirm>
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
								<i
									@click="showPlaylist(playlist._id)"
									class="material-icons edit-icon"
									content="Edit Playlist"
									v-tippy
									>edit</i
								>
							</div>
						</playlist-item>
					</transition-group>
				</draggable>
				<p v-else class="has-text-centered scrollable-list">
					You don't have any playlists!
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
			tab: "current",
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
		currentPlaylists() {
			if (this.station.type === "community" && this.station.partyMode) {
				return this.partyPlaylists;
			}
			return this.includedPlaylists;
		},
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
			originalStation: state => state.originalStation,
			includedPlaylists: state => state.includedPlaylists,
			excludedPlaylists: state => state.excludedPlaylists,
			songsList: state => state.songsList
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
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
			this.tab = tab;
		},
		isOwner() {
			return this.loggedIn && this.userId === this.station.owner;
		},
		isAdmin() {
			return this.loggedIn && this.role === "admin";
		},
		isOwnerOrAdmin() {
			return this.isOwner() || this.isAdmin();
		},
		showPlaylist(playlistId) {
			this.editPlaylist(playlistId);
			this.openModal("editPlaylist");
		},
		selectPlaylist(playlist) {
			if (this.station.type === "community" && this.station.partyMode) {
				if (!this.isSelected(playlist.id)) {
					this.partyPlaylists.push(playlist);
					this.addPartyPlaylistSongToQueue();
					new Toast(
						"Successfully selected playlist to auto request songs."
					);
				} else {
					new Toast("Error: Playlist already selected.");
				}
			} else {
				this.socket.dispatch(
					"stations.includePlaylist",
					this.station._id,
					playlist._id,
					res => {
						new Toast(res.message);
					}
				);
			}
		},
		deselectPlaylist(id) {
			if (this.station.type === "community" && this.station.partyMode) {
				let selected = false;
				this.currentPlaylists.forEach((playlist, index) => {
					if (playlist._id === id) {
						selected = true;
						this.partyPlaylists.splice(index, 1);
					}
				});
				if (selected) {
					new Toast("Successfully deselected playlist.");
				} else {
					new Toast("Playlist not selected.");
				}
			} else {
				this.socket.dispatch(
					"stations.removeIncludedPlaylist",
					this.station._id,
					id,
					res => {
						new Toast(res.message);
					}
				);
			}
		},
		isSelected(id) {
			let selected = false;
			this.currentPlaylists.forEach(playlist => {
				if (playlist._id === id) selected = true;
			});
			return selected;
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
		blacklistPlaylist(id) {
			if (this.isSelected(id)) this.deselectPlaylist(id);

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
					const selectedPlaylist = this.partyPlaylists[
						Math.floor(Math.random() * this.partyPlaylists.length)
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
.station-playlists {
	.tabs-container {
		.tab-selection {
			display: flex;
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
				background-color: var(--dark-grey-3) !important;
				color: var(--white) !important;
			}
		}
		.tab {
			padding: 15px 0;
			border-radius: 0;
			.playlist-item:not(:last-of-type),
			.item.item-draggable:not(:last-of-type) {
				margin-bottom: 10px;
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
