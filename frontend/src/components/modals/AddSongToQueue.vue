<template>
	<modal title="Add Song To Queue">
		<div slot="body">
			<div class="vertical-padding">
				<!-- Choosing a song from youtube -->

				<h4 class="section-title">Choose a song</h4>
				<p class="section-description">
					Choose a song by searching or using a link from YouTube.
				</p>

				<br />

				<div class="control is-grouped input-with-button">
					<p class="control is-expanded">
						<input
							class="input"
							type="text"
							placeholder="Enter your YouTube query here..."
							v-model="search.songs.query"
							autofocus
							@keyup.enter="searchForSongs()"
						/>
					</p>
					<p class="control">
						<a
							class="button is-info"
							@click.prevent="searchForSongs()"
							href="#"
							><i class="material-icons icon-with-button"
								>search</i
							>Search</a
						>
					</p>
				</div>

				<!-- Choosing a song from youtube - query results -->

				<div
					id="song-query-results"
					v-if="search.songs.results.length > 0"
				>
					<search-query-item
						v-for="(result, index) in search.songs.results"
						:key="index"
						:result="result"
					>
						<div slot="actions">
							<transition
								name="search-query-actions"
								mode="out-in"
							>
								<a
									class="button is-success"
									v-if="result.isAddedToQueue"
									href="#"
									key="added-to-playlist"
								>
									<i class="material-icons icon-with-button"
										>done</i
									>
									Added to queue
								</a>
								<a
									class="button is-dark"
									v-else
									@click.prevent="
										addSongToQueue(result.id, index)
									"
									href="#"
									key="add-to-queue"
								>
									<i class="material-icons icon-with-button"
										>add</i
									>
									Add to queue
								</a>
							</transition>
						</div>
					</search-query-item>

					<a
						class="button is-default load-more-button"
						@click.prevent="loadMoreSongs()"
						href="#"
					>
						Load more...
					</a>
				</div>

				<!-- Import a playlist from youtube -->

				<div v-if="station.type === 'official'">
					<hr class="section-horizontal-rule" />

					<h4 class="section-title">Import a playlist</h4>
					<p class="section-description">
						Import a playlist by using a link from YouTube.
					</p>

					<br />

					<div class="control is-grouped input-with-button">
						<p class="control is-expanded">
							<input
								class="input"
								type="text"
								placeholder="YouTube Playlist URL"
								v-model="search.playlist.query"
								@keyup.enter="importPlaylist()"
							/>
						</p>
						<p class="control has-addons">
							<span class="select" id="playlist-import-type">
								<select
									v-model="
										search.playlist.isImportingOnlyMusic
									"
								>
									<option :value="false">Import all</option>
									<option :value="true">
										Import only music
									</option>
								</select>
							</span>
							<a
								class="button is-info"
								@click.prevent="importPlaylist()"
								href="#"
								><i class="material-icons icon-with-button"
									>publish</i
								>Import</a
							>
						</p>
					</div>
				</div>

				<!-- Choose a playlist from your account -->

				<div
					v-if="
						loggedIn &&
							station.type === 'community' &&
							playlists.length > 0
					"
				>
					<hr class="section-horizontal-rule" />

					<aside id="playlist-to-queue-selection">
						<h4 class="section-title">Choose a playlist</h4>
						<p class="section-description">
							Choose one of your playlists to add to the queue.
						</p>

						<br />

						<div id="playlists">
							<div
								class="playlist"
								v-for="(playlist, index) in playlists"
								:key="index"
							>
								<playlist-item :playlist="playlist">
									<div slot="actions">
										<a
											class="button is-danger"
											href="#"
											@click.prevent="
												togglePlaylistSelection(
													playlist._id
												)
											"
											v-if="
												isPlaylistSelected(playlist._id)
											"
										>
											<i
												class="material-icons icon-with-button"
												>stop</i
											>
											Stop playing
										</a>
										<a
											class="button is-success"
											@click.prevent="
												togglePlaylistSelection(
													playlist._id
												)
											"
											href="#"
											v-else
											><i
												class="material-icons icon-with-button"
												>play_arrow</i
											>Play in queue
										</a>
									</div>
								</playlist-item>
							</div>
						</div>
					</aside>
				</div>
			</div>
		</div>
	</modal>
</template>

<script>
import { mapState, mapActions } from "vuex";

import Toast from "toasters";

import SearchYoutube from "../../mixins/SearchYoutube.vue";

import PlaylistItem from "../ui/PlaylistItem.vue";
import SearchQueryItem from "../ui/SearchQueryItem.vue";
import Modal from "../Modal.vue";

import io from "../../io";

export default {
	components: { Modal, PlaylistItem, SearchQueryItem },
	mixins: [SearchYoutube],
	data() {
		return {
			playlists: []
		};
	},
	computed: mapState({
		loggedIn: state => state.user.auth.loggedIn,
		station: state => state.station.station,
		privatePlaylistQueueSelected: state =>
			state.station.privatePlaylistQueueSelected
	}),
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
			this.socket.emit("playlists.indexMyPlaylists", true, res => {
				if (res.status === "success") this.playlists = res.data;
			});
		});
	},
	methods: {
		isPlaylistSelected(playlistId) {
			return this.privatePlaylistQueueSelected === playlistId;
		},
		togglePlaylistSelection(playlistId) {
			if (this.station.type === "community") {
				if (this.isPlaylistSelected(playlistId)) {
					this.updatePrivatePlaylistQueueSelected(null);
				} else {
					this.updatePrivatePlaylistQueueSelected(playlistId);
					this.$parent.addFirstPrivatePlaylistSongToQueue();
					console.log(this.isPlaylistSelected(playlistId));
				}
			}
		},
		addSongToQueue(songId, index) {
			if (this.station.type === "community") {
				this.socket.emit(
					"stations.addToQueue",
					this.station._id,
					songId,
					data => {
						if (data.status !== "success")
							new Toast({
								content: `Error: ${data.message}`,
								timeout: 8000
							});
						else {
							this.search.songs.results[
								index
							].isAddedToQueue = true;

							new Toast({
								content: `${data.message}`,
								timeout: 4000
							});
						}
					}
				);
			} else {
				this.socket.emit("queueSongs.add", songId, data => {
					if (data.status !== "success")
						new Toast({
							content: `Error: ${data.message}`,
							timeout: 8000
						});
					else {
						this.search.songs.results[index].isAddedToQueue = true;

						new Toast({
							content: `${data.message}`,
							timeout: 4000
						});
					}
				});
			}
		},
		importPlaylist() {
			let isImportingPlaylist = true;

			// import query is blank
			if (!this.search.playlist.query)
				return new Toast({
					content: "Please enter a YouTube playlist URL.",
					timeout: 4000
				});

			// don't give starting import message instantly in case of instant error
			setTimeout(() => {
				if (isImportingPlaylist) {
					new Toast({
						content:
							"Starting to import your playlist. This can take some time to do.",
						timeout: 4000
					});
				}
			}, 750);

			return this.socket.emit(
				"queueSongs.addSetToQueue",
				this.search.playlist.query,
				this.search.playlist.isImportingOnlyMusic,
				res => {
					isImportingPlaylist = false;
					return new Toast({ content: res.message, timeout: 20000 });
				}
			);
		},
		...mapActions("station", ["updatePrivatePlaylistQueueSelected"]),
		...mapActions("user/playlists", ["editPlaylist"])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	div {
		color: var(--dark-grey);
	}
}

.song-actions {
	.button {
		height: 36px;
		width: 140px;
	}
}

.song-thumbnail div {
	width: 96px;
	height: 54px;
	background-position: center;
	background-repeat: no-repeat;
}

.table {
	margin-bottom: 0;
	margin-top: 20px;
}

#playlist-to-queue-selection {
	margin-top: 0;

	#playlists {
		font-size: 18px;

		.playlist {
			.button {
				width: 150px;
			}

			i {
				color: var(--white);
			}
		}

		.playlist:not(:last-of-type) {
			margin-bottom: 10px;
		}

		.radio {
			display: flex;
			flex-direction: row;
			align-items: center;

			input {
				transform: scale(1.25);
			}
		}
	}
}

#playlist-import-type {
	&:hover {
		z-index: initial;
	}

	select {
		border-radius: 0;
	}
}

.vertical-padding {
	padding: 20px;
}

#song-query-results {
	padding: 10px;
	max-height: 500px;
	overflow: auto;
	border: 1px solid var(--light-grey-3);
	border-radius: 3px;

	.search-query-item:not(:last-of-type) {
		margin-bottom: 10px;
	}

	.load-more-button {
		width: 100%;
		margin-top: 10px;
	}
}
</style>
