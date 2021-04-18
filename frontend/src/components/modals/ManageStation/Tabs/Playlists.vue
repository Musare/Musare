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
				<div v-if="includedPlaylists.length > 0">
					<playlist-item
						v-for="(playlist, index) in includedPlaylists"
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
				<p v-else class="nothing-here-text scrollable-list">
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
							@keyup.enter="searchForPlaylists()"
						/>
					</p>
					<p class="control">
						<a class="button is-info" @click="searchForPlaylists()"
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
										!isSelected(playlist._id)
								"
								@click="selectPlaylist(playlist._id)"
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
			</div>
			<div
				v-if="station.type === 'community'"
				class="tab"
				v-show="tab === 'my-playlists'"
			>
				<button
					class="button is-primary"
					id="create-new-playlist-button"
					@click="
						openModal({
							sector: 'station',
							modal: 'createPlaylist'
						})
					"
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
									v-if="
										station.type === 'community' &&
											(isOwnerOrAdmin() ||
												station.partyMode) &&
											!isSelected(playlist._id)
									"
									@click="selectPlaylist(playlist._id)"
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
				<p v-else class="nothing-here-text scrollable-list">
					You don't have any playlists!
				</p>
			</div>
		</div>
	</div>
</template>
<script>
import { mapActions, mapState, mapGetters } from "vuex";

import Toast from "toasters";
import draggable from "vuedraggable";
import PlaylistItem from "@/components/PlaylistItem.vue";
import Confirm from "@/components/Confirm.vue";

import SortablePlaylists from "@/mixins/SortablePlaylists.vue";

export default {
	components: {
		draggable,
		PlaylistItem,
		Confirm
		// CreatePlaylist: () => import("@/components/modals/CreatePlaylist.vue")
	},
	mixins: [SortablePlaylists],
	data() {
		return {
			tab: "current",
			search: {
				query: "",
				results: []
			}
		};
	},
	computed: {
		playlists: {
			get() {
				return this.$store.state.user.playlists.playlists;
			},
			set(playlists) {
				this.$store.commit("user/playlists/setPlaylists", playlists);
			}
		},
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			role: state => state.user.auth.role,
			myUserId: state => state.user.auth.userId,
			userId: state => state.user.auth.userId
		}),
		...mapState("modals/manageStation", {
			station: state => state.station,
			originalStation: state => state.originalStation,
			includedPlaylists: state => state.includedPlaylists,
			excludedPlaylists: state => state.excludedPlaylists
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		this.socket.dispatch("playlists.indexMyPlaylists", true, res => {
			if (res.status === "success") this.playlists = res.data.playlists;
			this.orderOfPlaylists = this.calculatePlaylistOrder(); // order in regards to the database
		});

		this.socket.on("event:playlist.create", res => {
			this.playlists.push(res.data.playlist);
		});

		this.socket.on("event:playlist.delete", res => {
			this.playlists.forEach((playlist, index) => {
				if (playlist._id === res.data.playlistId) {
					this.playlists.splice(index, 1);
				}
			});
		});

		this.socket.on("event:playlist.addSong", res => {
			this.playlists.forEach((playlist, index) => {
				if (playlist._id === res.data.playlistId) {
					this.playlists[index].songs.push(res.data.song);
				}
			});
		});

		this.socket.on("event:playlist.removeSong", res => {
			this.playlists.forEach((playlist, index) => {
				if (playlist._id === res.data.playlistId) {
					this.playlists[index].songs.forEach((song, index2) => {
						if (song.youtubeId === res.data.youtubeId) {
							this.playlists[index].songs.splice(index2, 1);
						}
					});
				}
			});
		});

		this.socket.on("event:playlist.updateDisplayName", res => {
			this.playlists.forEach((playlist, index) => {
				if (playlist._id === res.data.playlistId) {
					this.playlists[index].displayName = res.data.displayName;
				}
			});
		});

		this.socket.on("event:playlist.updatePrivacy", res => {
			this.playlists.forEach((playlist, index) => {
				if (playlist._id === res.data.playlist._id) {
					this.playlists[index].privacy = res.data.playlist.privacy;
				}
			});
		});

		this.socket.on(
			"event:user.orderOfPlaylists.changed",
			orderOfPlaylists => {
				const sortedPlaylists = [];

				this.playlists.forEach(playlist => {
					sortedPlaylists[
						orderOfPlaylists.indexOf(playlist._id)
					] = playlist;
				});

				this.playlists = sortedPlaylists;
				this.orderOfPlaylists = this.calculatePlaylistOrder();
			}
		);

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
			this.openModal({ sector: "station", modal: "editPlaylist" });
		},
		selectPlaylist(id) {
			if (this.station.type === "community" && this.station.partyMode) {
				new Toast(
					"Error: Party mode playlist selection not added yet."
				);
			} else {
				this.socket.dispatch(
					"stations.includePlaylist",
					this.station._id,
					id,
					res => {
						new Toast(res.message);
					}
				);
			}
		},
		deselectPlaylist(id) {
			if (this.station.type === "community" && this.station.partyMode) {
				new Toast(
					"Error: Party mode playlist selection not added yet."
				);
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
			if (this.station.type === "community" && this.station.partyMode) {
				// Party mode playlist selection not added yet.
				return false;
			}
			// TODO Also change this once it changes for a station
			let selected = false;
			this.includedPlaylists.forEach(playlist => {
				if (playlist._id === id) selected = true;
			});
			return selected;
		},
		searchForPlaylists() {
			const { query } = this.search;
			const action =
				this.station.type === "official"
					? "playlists.searchOfficial"
					: "playlists.searchCommunity";

			this.socket.dispatch(action, query, res => {
				if (res.status === "success") {
					this.search.results = res.data.playlists;
				} else if (res.status === "error") {
					this.search.results = [];
					new Toast(res.message);
				}
			});
		},
		blacklistPlaylist(id) {
			if (this.isSelected(id)) {
				this.deselectPlaylist(id);
			}
			this.socket.dispatch(
				"stations.excludePlaylist",
				this.station._id,
				id,
				res => {
					new Toast(res.message);
				}
			);
		},
		...mapActions("station", ["updatePrivatePlaylistQueueSelected"]),
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
