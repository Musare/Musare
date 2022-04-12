<template>
	<div class="station-playlists">
		<p class="top-info has-text-centered">
			Search for songs to add to queue or auto request songs from
			playlists
		</p>
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
					v-if="!disableAutoRequest"
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
<script>
import { mapState, mapGetters } from "vuex";

import Toast from "toasters";

import SongItem from "@/components/SongItem.vue";
import SearchQueryItem from "@/components/SearchQueryItem.vue";
import PlaylistTabBase from "@/components/PlaylistTabBase.vue";

import SearchYoutube from "@/mixins/SearchYoutube.vue";
import SearchMusare from "@/mixins/SearchMusare.vue";

export default {
	components: {
		SongItem,
		SearchQueryItem,
		PlaylistTabBase
	},
	mixins: [SearchYoutube, SearchMusare],
	props: {
		modalUuid: { type: String, default: "" },
		sector: { type: String, default: "station" },
		disableAutoRequest: { type: Boolean, default: false }
	},
	data() {
		return {
			tab: "songs",
			sitename: "Musare"
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
		songsList: {
			get() {
				if (this.sector === "manageStation")
					return this.$store.state.modals.manageStation[
						this.modalUuid
					].songsList;
				return this.$store.state.station.songsList;
			},
			set(songsList) {
				if (this.sector === "manageStation")
					this.$store.commit(
						`modals/manageStation/${this.modalUuid}/updateSongsList`,
						songsList
					);
				else this.$store.commit("station/updateSongsList", songsList);
			}
		},
		musareResultsLeftCount() {
			return this.musareSearch.count - this.musareSearch.results.length;
		},
		nextPageMusareResultsCount() {
			return Math.min(
				this.musareSearch.pageSize,
				this.musareResultsLeftCount
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
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	async mounted() {
		this.sitename = await lofig.get("siteSettings.sitename");

		this.showTab("songs");
	},
	methods: {
		showTab(tab) {
			this.$refs[`${tab}-tab`].scrollIntoView({ block: "nearest" });
			this.tab = tab;
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
