<template>
	<div class="station-playlists">
		<div class="tabs-container">
			<div class="tab-selection">
				<button
					class="button is-default"
					ref="songs-tab"
					:class="{ selected: tab === 'songs' }"
					@click="showTab('songs')"
				>
					Songs
				</button>
				<button
					v-if="sector === 'station'"
					class="button is-default"
					ref="autorequest-tab"
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
			<div
				class="tab"
				v-show="tab === 'songs'"
				v-if="isOwnerOrAdmin() || !station.locked"
			>
				<div class="musare-songs">
					<label class="label"> Search for a song on Musare </label>
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
							v-if="playlistResultsLeftCount > 0"
							class="button is-primary load-more-button"
							@click="searchForMusareSongs(musareSearch.page + 1)"
						>
							Load {{ nextPagePlaylistsResultsCount }} more
							results
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
			<div v-if="sector === 'station'" v-show="tab === 'autorequest'">
				<div class="tab-selection">
					<button
						class="button is-default"
						ref="search-child-tab"
						:class="{ selected: childTab === 'search' }"
						@click="showChildTab('search')"
					>
						Search
					</button>
					<button
						class="button is-default"
						ref="current-child-tab"
						:class="{ selected: childTab === 'current' }"
						@click="showChildTab('current')"
					>
						Current
					</button>
					<button
						class="button is-default"
						ref="my-playlists-child-tab"
						:class="{ selected: childTab === 'my-playlists' }"
						@click="showChildTab('my-playlists')"
					>
						My Playlists
					</button>
				</div>
				<div class="tab" v-show="childTab === 'search'">
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
									class="material-icons"
									v-if="isSelected(featuredPlaylist._id)"
									content="This playlist is currently selected"
									v-tippy
								>
									radio
								</i>
								<i
									class="material-icons blacklisted-icon"
									v-else-if="
										isBlacklisted(featuredPlaylist._id)
									"
									content="This playlist is currently blacklisted"
									v-tippy
								>
									block
								</i>
								<i
									class="material-icons"
									v-else
									content="This playlist is currently not selected or blacklisted"
									v-tippy
								>
									play_disabled
								</i>
							</template>

							<template #actions>
								<i
									v-if="isBlacklisted(featuredPlaylist._id)"
									class="material-icons stop-icon"
									content="This playlist is blacklisted in this station"
									v-tippy="{ theme: 'info' }"
									>play_disabled</i
								>
								<quick-confirm
									v-if="isSelected(featuredPlaylist._id)"
									@confirm="deselect(featuredPlaylist._id)"
								>
									<i
										class="material-icons stop-icon"
										content="Stop playing songs from this playlist"
										v-tippy
									>
										stop
									</i>
								</quick-confirm>
								<i
									v-if="
										!isSelected(featuredPlaylist._id) &&
										!isBlacklisted(featuredPlaylist._id)
									"
									@click="select(featuredPlaylist)"
									class="material-icons play-icon"
									content="Request songs from this playlist"
									v-tippy
									>play_arrow</i
								>
								<quick-confirm
									v-if="
										isOwnerOrAdmin() &&
										!isBlacklisted(featuredPlaylist._id)
									"
									@confirm="
										blacklistPlaylist(featuredPlaylist._id)
									"
								>
									<i
										class="material-icons stop-icon"
										content="Blacklist Playlist"
										v-tippy
										>block</i
									>
								</quick-confirm>
								<quick-confirm
									v-if="
										isOwnerOrAdmin() &&
										isBlacklisted(featuredPlaylist._id)
									"
									@confirm="
										removeBlacklistedPlaylist(
											featuredPlaylist._id
										)
									"
								>
									<i
										class="material-icons stop-icon"
										content="Stop blacklisting songs from this playlist"
										v-tippy
									>
										stop
									</i>
								</quick-confirm>
								<i
									v-if="
										featuredPlaylist.createdBy === myUserId
									"
									@click="showPlaylist(featuredPlaylist._id)"
									class="material-icons edit-icon"
									content="Edit Playlist"
									v-tippy
									>edit</i
								>
								<i
									v-if="
										featuredPlaylist.createdBy !==
											myUserId &&
										(featuredPlaylist.privacy ===
											'public' ||
											isAdmin())
									"
									@click="showPlaylist(featuredPlaylist._id)"
									class="material-icons edit-icon"
									content="View Playlist"
									v-tippy
									>visibility</i
								>
							</template>
						</playlist-item>
						<br />
					</div>
					<label class="label"> Search for a public playlist </label>
					<div class="control is-grouped input-with-button">
						<p class="control is-expanded">
							<input
								class="input"
								type="text"
								placeholder="Enter your playlist query here..."
								v-model="playlistSearch.query"
								@keyup.enter="searchForPlaylists(1)"
							/>
						</p>
						<p class="control">
							<a
								class="button is-info"
								@click="searchForPlaylists(1)"
								><i class="material-icons icon-with-button"
									>search</i
								>Search</a
							>
						</p>
					</div>
					<div v-if="playlistSearch.results.length > 0">
						<playlist-item
							v-for="playlist in playlistSearch.results"
							:key="`searchKey-${playlist._id}`"
							:playlist="playlist"
							:show-owner="true"
						>
							<template #item-icon>
								<i
									class="material-icons"
									v-if="isSelected(playlist._id)"
									content="This playlist is currently selected"
									v-tippy
								>
									radio
								</i>
								<i
									class="material-icons blacklisted-icon"
									v-else-if="isBlacklisted(playlist._id)"
									content="This playlist is currently blacklisted"
									v-tippy
								>
									block
								</i>
								<i
									class="material-icons"
									v-else
									content="This playlist is currently not selected or blacklisted"
									v-tippy
								>
									play_disabled
								</i>
							</template>

							<template #actions>
								<i
									v-if="isBlacklisted(playlist._id)"
									class="material-icons stop-icon"
									content="This playlist is blacklisted in this station"
									v-tippy="{ theme: 'info' }"
									>play_disabled</i
								>
								<quick-confirm
									v-if="isSelected(playlist._id)"
									@confirm="deselect(playlist._id)"
								>
									<i
										class="material-icons stop-icon"
										content="Stop playing songs from this playlist"
										v-tippy
									>
										stop
									</i>
								</quick-confirm>
								<i
									v-if="
										!isSelected(playlist._id) &&
										!isBlacklisted(playlist._id)
									"
									@click="select(playlist)"
									class="material-icons play-icon"
									content="Request songs from this playlist"
									v-tippy
									>play_arrow</i
								>
								<quick-confirm
									v-if="
										isOwnerOrAdmin() &&
										!isBlacklisted(playlist._id)
									"
									@confirm="blacklistPlaylist(playlist._id)"
								>
									<i
										class="material-icons stop-icon"
										content="Blacklist Playlist"
										v-tippy
										>block</i
									>
								</quick-confirm>
								<quick-confirm
									v-if="
										isOwnerOrAdmin() &&
										isBlacklisted(playlist._id)
									"
									@confirm="
										removeBlacklistedPlaylist(playlist._id)
									"
								>
									<i
										class="material-icons stop-icon"
										content="Stop blacklisting songs from this playlist"
										v-tippy
									>
										stop
									</i>
								</quick-confirm>
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
							</template>
						</playlist-item>
						<button
							v-if="playlistResultsLeftCount > 0"
							class="button is-primary load-more-button"
							@click="searchForPlaylists(playlistSearch.page + 1)"
						>
							Load {{ nextPagePlaylistsResultsCount }} more
							results
						</button>
					</div>
				</div>
				<div class="tab" v-show="childTab === 'my-playlists'">
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
											v-if="isSelected(element._id)"
											content="This playlist is currently selected"
											v-tippy
										>
											radio
										</i>
										<i
											class="material-icons blacklisted-icon"
											v-else-if="
												isBlacklisted(element._id)
											"
											content="This playlist is currently blacklisted"
											v-tippy
										>
											block
										</i>
										<i
											class="material-icons"
											v-else
											content="This playlist is currently not selected or blacklisted"
											v-tippy
										>
											play_disabled
										</i>
									</template>

									<template #actions>
										<i
											v-if="!isSelected(element._id)"
											@click="select(element)"
											class="material-icons play-icon"
											content="Request songs from this playlist"
											v-tippy
											>play_arrow</i
										>
										<quick-confirm
											v-if="isSelected(element._id)"
											@confirm="deselect(element._id)"
										>
											<i
												class="material-icons stop-icon"
												content="Stop requesting songs from this playlist"
												v-tippy
												>stop</i
											>
										</quick-confirm>
										<quick-confirm
											v-if="
												isOwnerOrAdmin() &&
												!isBlacklisted(element._id)
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
										</quick-confirm>
										<quick-confirm
											v-if="
												isOwnerOrAdmin() &&
												isBlacklisted(element._id)
											"
											@confirm="
												removeBlacklistedPlaylist(
													element._id
												)
											"
										>
											<i
												class="material-icons stop-icon"
												content="Stop blacklisting songs from this playlist"
												v-tippy
											>
												stop
											</i>
										</quick-confirm>
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
				<div class="tab" v-show="childTab === 'current'">
					<div v-if="autoRequest.length > 0">
						<playlist-item
							v-for="playlist in autoRequest"
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
								<quick-confirm
									v-if="isOwnerOrAdmin()"
									@confirm="deselect(playlist._id)"
								>
									<i
										class="material-icons stop-icon"
										content="Stop playing songs from this playlist"
										v-tippy
									>
										stop
									</i>
								</quick-confirm>
								<quick-confirm
									v-if="isOwnerOrAdmin()"
									@confirm="blacklistPlaylist(playlist._id)"
								>
									<i
										class="material-icons stop-icon"
										content="Blacklist Playlist"
										v-tippy
										>block</i
									>
								</quick-confirm>
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
							</template>
						</playlist-item>
					</div>
					<p v-else class="has-text-centered scrollable-list">
						No playlists currently being played.
					</p>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import { mapActions, mapState, mapGetters } from "vuex";

import Toast from "toasters";
import ws from "@/ws";

import QuickConfirm from "@/components/QuickConfirm.vue";
import SongItem from "@/components/SongItem.vue";
import PlaylistItem from "@/components/PlaylistItem.vue";
import SearchQueryItem from "@/components/SearchQueryItem.vue";

import SortablePlaylists from "@/mixins/SortablePlaylists.vue";
import SearchYoutube from "@/mixins/SearchYoutube.vue";
import SearchMusare from "@/mixins/SearchMusare.vue";

export default {
	components: {
		QuickConfirm,
		SongItem,
		PlaylistItem,
		SearchQueryItem
	},
	mixins: [SortablePlaylists, SearchYoutube, SearchMusare],
	props: {
		sector: { type: String, default: "station" }
	},
	data() {
		return {
			tab: "songs",
			childTab: "search",
			playlistSearch: {
				query: "",
				searchedQuery: "",
				page: 0,
				count: 0,
				resultsLeft: 0,
				results: []
			},
			featuredPlaylists: []
		};
	},
	computed: {
		playlistResultsLeftCount() {
			return (
				this.playlistSearch.count - this.playlistSearch.results.length
			);
		},
		nextPagePlaylistSearchResultsCount() {
			return Math.min(
				this.playlistSearch.pageSize,
				this.playlistResultsLeftCount
			);
		},
		songsInQueue() {
			if (this.station.currentSong)
				return this.songsList
					.map(song => song.youtubeId)
					.concat(this.station.currentSong.youtubeId);
			return this.songsList.map(song => song.youtubeId);
		},
		currentUserQueueSongs() {
			return this.songsList.filter(
				queueSong => queueSong.requestedBy === this.userId
			).length;
		},
		...mapState("user", {
			loggedIn: state => state.auth.loggedIn,
			role: state => state.auth.role,
			userId: state => state.auth.userId
		}),
		...mapState("station", {
			station: state => state.station,
			songsList: state => state.songsList,
			autoRequest: state => state.autoRequest,
			autoRequestLock: state => state.autoRequestLock,
			blacklist: state => state.blacklist
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		this.showTab("songs");

		ws.onConnect(this.init);

		this.socket.on("event:station.queue.updated", () =>
			this.autoRequestSong()
		);
	},
	methods: {
		init() {
			this.socket.dispatch("playlists.indexMyPlaylists", res => {
				if (res.status === "success")
					this.setPlaylists(res.data.playlists);
				this.orderOfPlaylists = this.calculatePlaylistOrder(); // order in regards to the database
			});

			this.socket.dispatch("playlists.indexFeaturedPlaylists", res => {
				if (res.status === "success")
					this.featuredPlaylists = res.data.playlists;
			});

			this.socket.dispatch(
				`stations.getStationBlacklistById`,
				this.station._id,
				res => {
					if (res.status === "success") {
						this.station.blacklist = res.data.playlists;
					}
				}
			);
		},
		showTab(tab) {
			this.$refs[`${tab}-tab`].scrollIntoView({ block: "nearest" });
			this.tab = tab;
		},
		showChildTab(tab) {
			this.$refs[`${tab}-child-tab`].scrollIntoView({ block: "nearest" });
			this.childTab = tab;
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
		showPlaylist(playlistId) {
			this.editPlaylist(playlistId);
			this.openModal("editPlaylist");
		},
		select(playlist) {
			if (!this.isSelected(playlist.id)) {
				this.autoRequest.push(playlist);
				this.autoRequestSong();
				new Toast(
					"Successfully selected playlist to auto request songs."
				);
			} else {
				new Toast("Error: Playlist already selected.");
			}
		},
		deselect(id) {
			return new Promise(resolve => {
				let selected = false;
				this.autoRequest.forEach((playlist, index) => {
					if (playlist._id === id) {
						selected = true;
						this.autoRequest.splice(index, 1);
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
		removeBlacklistedPlaylist(id) {
			return new Promise(resolve => {
				this.socket.dispatch(
					"stations.removeBlacklistedPlaylist",
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
			this.autoRequest.forEach(playlist => {
				if (playlist._id === id) selected = true;
			});
			return selected;
		},
		isBlacklisted(id) {
			let selected = false;
			this.blacklist.forEach(playlist => {
				if (playlist._id === id) selected = true;
			});
			return selected;
		},
		searchForPlaylists(page) {
			if (
				this.playlistSearch.page >= page ||
				this.playlistSearch.searchedQuery !== this.playlistSearch.query
			) {
				this.playlistSearch.results = [];
				this.playlistSearch.page = 0;
				this.playlistSearch.count = 0;
				this.playlistSearch.resultsLeft = 0;
				this.playlistSearch.pageSize = 0;
			}

			const { query } = this.playlistSearch;
			const action =
				this.station.type === "official"
					? "playlists.searchOfficial"
					: "playlists.searchCommunity";

			this.playlistSearch.searchedQuery = this.playlistSearch.query;
			this.socket.dispatch(action, query, page, res => {
				const { data } = res;
				if (res.status === "success") {
					const { count, pageSize, playlists } = data;
					this.playlistSearch.results = [
						...this.playlistSearch.results,
						...playlists
					];
					this.playlistSearch.page = page;
					this.playlistSearch.count = count;
					this.playlistSearch.resultsLeft =
						count - this.playlistSearch.results.length;
					this.playlistSearch.pageSize = pageSize;
				} else if (res.status === "error") {
					this.playlistSearch.results = [];
					this.playlistSearch.page = 0;
					this.playlistSearch.count = 0;
					this.playlistSearch.resultsLeft = 0;
					this.playlistSearch.pageSize = 0;
					new Toast(res.message);
				}
			});
		},
		async blacklistPlaylist(id) {
			// if (this.isIncluded(id)) await this.removeIncludedPlaylist(id);

			this.socket.dispatch(
				"stations.blacklistPlaylist",
				this.station._id,
				id,
				res => {
					new Toast(res.message);
				}
			);
		},
		autoRequestSong() {
			if (
				!this.autoRequestLock &&
				this.songsList.length < 50 &&
				this.currentUserQueueSongs <
					this.station.requests.limit * 0.5 &&
				this.autoRequest.length > 0
			) {
				const selectedPlaylist =
					this.autoRequest[
						Math.floor(Math.random() * this.autoRequest.length)
					];
				if (selectedPlaylist._id && selectedPlaylist.songs.length > 0) {
					const selectedSong =
						selectedPlaylist.songs[
							Math.floor(
								Math.random() * selectedPlaylist.songs.length
							)
						];
					if (selectedSong.youtubeId) {
						this.updateAutoRequestLock(true);
						this.socket.dispatch(
							"stations.addToQueue",
							this.station._id,
							selectedSong.youtubeId,
							data => {
								this.updateAutoRequestLock(false);
								if (data.status !== "success")
									this.autoRequestSong();
							}
						);
					}
				}
			}
		},
		addSongToQueue(youtubeId, index) {
			this.socket.dispatch(
				"stations.addToQueue",
				this.station._id,
				youtubeId,
				res => {
					if (res.status !== "success")
						new Toast(`Error: ${res.message}`);
					else {
						if (index)
							this.youtubeSearch.songs.results[
								index
							].isAddedToQueue = true;

						new Toast(res.message);
					}
				}
			);
		},
		...mapActions("station", ["updateAutoRequest"]),
		...mapActions("station", [
			"updateAutoRequest",
			"updateAutoRequestLock"
		]),
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("user/playlists", ["editPlaylist", "setPlaylists"])
	}
};
</script>

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

.included-icon {
	color: var(--green);
}

.selected-icon {
	color: var(--purple);
}

#create-new-playlist-button {
	width: 100%;
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
		& > div > .tab-selection .button {
			margin-top: 5px;
			font-size: 12px;
			height: 28px;
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
