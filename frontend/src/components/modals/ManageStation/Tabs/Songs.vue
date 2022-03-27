<template>
	<div class="songs">
		<div class="tabs-container">
			<div class="tab-selection">
				<button
					class="button is-default"
					:class="{ selected: tab === 'search' }"
					v-if="isAllowedToParty()"
					@click="showTab('search')"
				>
					Search
				</button>
				<button
					class="button is-default"
					:class="{ selected: tab === 'included' }"
					v-if="isOwnerOrAdmin() && isPlaylistMode()"
					@click="showTab('included')"
				>
					Included
				</button>
				<button
					class="button is-default"
					:class="{ selected: tab === 'excluded' }"
					v-if="isOwnerOrAdmin()"
					@click="showTab('excluded')"
				>
					Excluded
				</button>
			</div>
			<div
				class="tab"
				v-show="tab === 'search'"
				v-if="
					station.type === 'community' &&
					station.partyMode &&
					(isOwnerOrAdmin() || !station.locked)
				"
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
							v-if="resultsLeftCount > 0"
							class="button is-primary load-more-button"
							@click="searchForMusareSongs(musareSearch.page + 1)"
						>
							Load {{ nextPageResultsCount }} more results
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
			<div
				class="tab"
				v-show="tab === 'included'"
				v-if="
					isOwnerOrAdmin() &&
					!(station.type === 'community' && station.partyMode)
				"
			>
				<div v-if="stationPlaylist.songs.length > 0">
					<div id="playlist-info-section">
						<h5>Song Count: {{ stationPlaylist.songs.length }}</h5>
						<h5>Duration: {{ totalLength(stationPlaylist) }}</h5>
					</div>
					<song-item
						v-for="song in stationPlaylist.songs"
						:key="song._id"
						:song="song"
					>
					</song-item>
				</div>
				<p v-else class="has-text-centered scrollable-list">
					No songs currently included. To include songs, include a
					playlist.
				</p>
			</div>
			<div
				class="tab"
				v-show="tab === 'excluded'"
				v-if="isOwnerOrAdmin()"
			>
				<div v-if="excludedSongs.length > 0">
					<div id="playlist-info-section" class="section">
						<h5>Song Count: {{ excludedSongs.length }}</h5>
					</div>
					<song-item
						v-for="song in excludedSongs"
						:key="song._id"
						:song="song"
					>
					</song-item>
				</div>
				<p v-else class="has-text-centered scrollable-list">
					No songs currently excluded. To excluded songs, exclude a
					playlist.
				</p>
			</div>
		</div>
	</div>
</template>

<script>
import { mapState, mapGetters } from "vuex";

import Toast from "toasters";
import SearchYoutube from "@/mixins/SearchYoutube.vue";
import SearchMusare from "@/mixins/SearchMusare.vue";

import SongItem from "@/components/SongItem.vue";
import SearchQueryItem from "../../../SearchQueryItem.vue";

import utils from "../../../../../js/utils";

export default {
	components: {
		SongItem,
		SearchQueryItem
	},
	mixins: [SearchYoutube, SearchMusare],
	data() {
		return {
			utils,
			tab: "search"
		};
	},
	computed: {
		excludedSongs() {
			return this.excludedPlaylists
				.map(playlist => playlist.songs)
				.flat()
				.filter((song, index, self) => self.indexOf(song) === index);
		},
		excludedSongIds() {
			return this.excludedSongs.map(excludedSong => excludedSong._id);
		},
		songsInQueue() {
			if (this.station.currentSong)
				return this.songsList
					.map(song => song.youtubeId)
					.concat(this.station.currentSong.youtubeId);
			return this.songsList.map(song => song.youtubeId);
		},
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			userId: state => state.user.auth.userId,
			role: state => state.user.auth.role
		}),
		...mapState("modals/manageStation", {
			parentTab: state => state.tab,
			station: state => state.station,
			originalStation: state => state.originalStation,
			songsList: state => state.songsList,
			excludedPlaylists: state => state.excludedPlaylists,
			stationPlaylist: state => state.stationPlaylist
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	watch: {
		// eslint-disable-next-line func-names
		parentTab(value) {
			if (value === "songs") {
				if (this.tab === "search" && this.isPlaylistMode()) {
					this.showTab("included");
				} else if (this.tab === "included" && this.isPartyMode()) {
					this.showTab("search");
				}
			}
		}
	},
	methods: {
		showTab(tab) {
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
		totalLength(playlist) {
			let length = 0;
			playlist.songs.forEach(song => {
				length += song.duration;
			});
			return this.utils.formatTimeLong(length);
		},
		addSongToQueue(youtubeId, index) {
			if (this.station.type === "community") {
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
			} else {
				this.socket.dispatch("songs.request", youtubeId, res => {
					if (res.status !== "success")
						new Toast(`Error: ${res.message}`);
					else {
						this.youtubeSearch.songs.results[
							index
						].isAddedToQueue = true;

						new Toast(res.message);
					}
				});
			}
		}
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

.songs {
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

	.musare-songs,
	.universal-item:not(:last-of-type) {
		margin-bottom: 10px;
	}
	.load-more-button {
		width: 100%;
		margin-top: 10px;
	}

	#playlist-info-section {
		border: 1px solid var(--light-grey-3);
		border-radius: @border-radius;
		padding: 15px !important;
		margin-bottom: 16px;

		h3 {
			font-weight: 600;
			font-size: 30px;
		}

		h5 {
			font-size: 18px;
		}

		h3,
		h5 {
			margin: 0;
		}
	}
}
</style>
