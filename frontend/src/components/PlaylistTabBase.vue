<template>
	<div class="playlist-tab-base">
		<div v-if="$slots.info" class="top-info has-text-centered">
			<slot name="info" />
		</div>
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
					class="button is-default"
					ref="current-tab"
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
					ref="my-playlists-tab"
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
										isAdmin())
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
									(playlist.privacy === 'public' || isAdmin())
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
								v-if="isOwnerOrAdmin()"
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
									(playlist.privacy === 'public' || isAdmin())
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
					<draggable
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
					</draggable>
				</div>

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
import ws from "@/ws";

import { mapModalState } from "@/vuex_helpers";

import PlaylistItem from "@/components/PlaylistItem.vue";

import SortablePlaylists from "@/mixins/SortablePlaylists.vue";

export default {
	components: {
		PlaylistItem
	},
	mixins: [SortablePlaylists],
	props: {
		modalUuid: { type: String, default: "" },
		type: {
			type: String,
			default: ""
		},
		sector: {
			type: String,
			default: "manageStation"
		}
	},
	emits: ["selected"],
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
			},
			featuredPlaylists: []
		};
	},
	computed: {
		station: {
			get() {
				if (this.sector === "manageStation")
					return this.$store.state.modals.manageStation[
						this.modalUuid
					].station;
				return this.$store.state.station.station;
			},
			set(station) {
				if (this.sector === "manageStation")
					this.$store.commit(
						`modals/manageStation/${this.modalUuid}/updateStation`,
						station
					);
				else this.$store.commit("station/updateStation", station);
			}
		},
		blacklist: {
			get() {
				if (this.sector === "manageStation")
					return this.$store.state.modals.manageStation[
						this.modalUuid
					].blacklist;
				return this.$store.state.station.blacklist;
			},
			set(blacklist) {
				if (this.sector === "manageStation")
					this.$store.commit(
						`modals/manageStation/${this.modalUuid}/setBlacklist`,
						blacklist
					);
				else this.$store.commit("station/setBlacklist", blacklist);
			}
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
			userId: state => state.user.auth.userId
		}),
		...mapModalState("modals/manageStation/MODAL_UUID", {
			autofill: state => state.autofill
		}),
		...mapState("station", {
			autoRequest: state => state.autoRequest
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		this.showTab("search");

		ws.onConnect(this.init);
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

			if (this.type === "autofill")
				this.socket.dispatch(
					`stations.getStationAutofillPlaylistsById`,
					this.station._id,
					res => {
						if (res.status === "success") {
							this.station.autofill.playlists =
								res.data.playlists;
						}
					}
				);

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
		label(tense = "future", typeOverwrite = null, capitalize = false) {
			let label = typeOverwrite || this.type;

			if (tense === "past") label = `${label}ed`;
			if (tense === "present") label = `${label}ing`;

			if (capitalize)
				label = `${label.charAt(0).toUpperCase()}${label.slice(1)}`;

			return label;
		},
		selectedPlaylists(typeOverwrite) {
			const type = typeOverwrite || this.type;

			if (type === "autofill") return this.autofill;
			if (type === "blacklist") return this.blacklist;
			if (type === "autorequest") return this.autoRequest;
			return [];
		},
		async selectPlaylist(playlist, typeOverwrite) {
			const type = typeOverwrite || this.type;

			if (this.isSelected(playlist._id, type))
				return new Toast(
					`Error: Playlist already ${this.label("past", type)}.`
				);

			if (type === "autofill")
				return new Promise(resolve => {
					this.socket.dispatch(
						"stations.autofillPlaylist",
						this.station._id,
						playlist._id,
						res => {
							new Toast(res.message);
							this.$emit("selected");
							resolve();
						}
					);
				});
			if (type === "blacklist") {
				if (this.type !== "blacklist" && this.isSelected(playlist._id))
					await this.deselectPlaylist(playlist._id);

				return new Promise(resolve => {
					this.socket.dispatch(
						"stations.blacklistPlaylist",
						this.station._id,
						playlist._id,
						res => {
							new Toast(res.message);
							this.$emit("selected");
							resolve();
						}
					);
				});
			}
			if (type === "autorequest")
				return new Promise(resolve => {
					this.addPlaylistToAutoRequest(playlist);
					new Toast(
						"Successfully selected playlist to auto request songs."
					);
					this.$emit("selected");
					resolve();
				});
			return false;
		},
		deselectPlaylist(playlistId, typeOverwrite) {
			const type = typeOverwrite || this.type;

			if (type === "autofill")
				return new Promise(resolve => {
					this.socket.dispatch(
						"stations.removeAutofillPlaylist",
						this.station._id,
						playlistId,
						res => {
							new Toast(res.message);
							resolve();
						}
					);
				});
			if (type === "blacklist")
				return new Promise(resolve => {
					this.socket.dispatch(
						"stations.removeBlacklistedPlaylist",
						this.station._id,
						playlistId,
						res => {
							new Toast(res.message);
							resolve();
						}
					);
				});
			if (type === "autorequest")
				return new Promise(resolve => {
					this.removePlaylistFromAutoRequest(playlistId);
					new Toast("Successfully deselected playlist.");
					resolve();
				});
			return false;
		},
		isSelected(playlistId, typeOverwrite) {
			const type = typeOverwrite || this.type;
			let selected = false;

			this.selectedPlaylists(type).forEach(playlist => {
				if (playlist._id === playlistId) selected = true;
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
				this.station.type === "official" && this.type !== "autorequest"
					? "playlists.searchOfficial"
					: "playlists.searchCommunity";

			this.search.searchedQuery = this.search.query;
			this.socket.dispatch(action, query, page, res => {
				const { data } = res;
				if (res.status === "success") {
					const { count, pageSize, playlists } = data;
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
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("user/playlists", ["setPlaylists"]),
		...mapActions("station", [
			"addPlaylistToAutoRequest",
			"removePlaylistFromAutoRequest"
		])
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
