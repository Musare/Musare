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
							v-model="querySearch"
							autofocus
							@keyup.enter="submitQuery()"
						/>
					</p>
					<p class="control">
						<a
							class="button is-info"
							@click="submitQuery()"
							href="#"
							><i class="material-icons icon-with-button"
								>search</i
							>Search</a
						>
					</p>
				</div>

				<!-- Choosing a song from youtube - query results -->

				<table
					class="table"
					style="margin-top: 20px;"
					v-if="queryResults.length > 0"
				>
					<tbody>
						<tr
							v-for="(result, index) in queryResults"
							:key="index"
						>
							<td class="song-thumbnail">
								<div
									:style="
										`background-image: url('${result.thumbnail}'`
									"
								></div>
							</td>
							<td><strong v-html="result.title"></strong></td>
							<td class="song-actions">
								<transition
									name="song-actions-transition"
									mode="out-in"
								>
									<a
										class="button is-success"
										v-if="result.isAddedToQueue"
										href="#"
										key="added-to-queue"
									>
										<i
											class="material-icons icon-with-button"
											>done</i
										>
										Added to queue
									</a>
									<a
										class="button is-dark"
										v-else
										@click="
											addSongToQueue(result.id, index)
										"
										href="#"
										key="add-to-queue"
									>
										<i
											class="material-icons icon-with-button"
											>add</i
										>
										Add to queue
									</a>
								</transition>
							</td>
						</tr>
					</tbody>
				</table>

				<!-- Import a playlist from youtube -->

				<div v-if="station.type === 'official'">
					<hr style="margin: 30px 0;" />

					<h4 class="section-title">
						Import a playlist
					</h4>
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
								v-model="importQuery"
								@keyup.enter="importPlaylist()"
							/>
						</p>
						<p class="control has-addons">
							<span class="select" id="playlist-import-type">
								<select
									v-model="isImportingOnlyMusicOfPlaylist"
								>
									<option :value="false">Import all</option>
									<option :value="true"
										>Import only music</option
									>
								</select>
							</span>
							<a
								class="button is-info"
								@click="importPlaylist()"
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
					<hr style="margin: 30px 0;" />

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
											@click="
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
											@click="
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

import PlaylistItem from "../../components/ui/PlaylistItem.vue";
import Modal from "../../components/Modal.vue";

import io from "../../io";

export default {
	components: { Modal, PlaylistItem },
	data() {
		return {
			querySearch: "",
			queryResults: [],
			playlists: [],
			importQuery: "",
			isImportingOnlyMusicOfPlaylist: false
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
			this.socket.emit("playlists.indexForUser", res => {
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
							this.queryResults[index].isAddedToQueue = true;
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
						this.queryResults[index].isAddedToQueue = true;
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
			if (!this.importQuery)
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
				this.importQuery,
				this.isImportingOnlyMusicOfPlaylist,
				res => {
					isImportingPlaylist = false;
					return new Toast({ content: res.message, timeout: 4000 });
				}
			);
		},
		submitQuery() {
			let query = this.querySearch;

			if (!this.querySearch)
				return new Toast({
					content: "Please input a search query or a YouTube link",
					timeout: 4000
				});

			if (query.indexOf("&index=") !== -1) {
				query = query.split("&index=");
				query.pop();
				query = query.join("");
			}

			if (query.indexOf("&list=") !== -1) {
				query = query.split("&list=");
				query.pop();
				query = query.join("");
			}

			return this.socket.emit("apis.searchYoutube", query, res => {
				if (res.status === "failure")
					return new Toast({
						content: "Error searching on YouTube",
						timeout: 4000
					});

				const { data } = res;
				this.queryResults = [];

				console.log(res.data);

				for (let i = 0; i < data.items.length; i += 1) {
					this.queryResults.push({
						id: data.items[i].id.videoId,
						url: `https://www.youtube.com/watch?v=${this.id}`,
						title: data.items[i].snippet.title,
						thumbnail: data.items[i].snippet.thumbnails.default.url,
						isAddedToQueue: false
					});
				}

				return this.queryResults;
			});
		},
		...mapActions("station", ["updatePrivatePlaylistQueueSelected"]),
		...mapActions("user/playlists", ["editPlaylist"])
	}
};
</script>

<style lang="scss" scoped>
@import "../../styles/global.scss";

.night-mode {
	tr {
		background-color: #222;
	}
}

tr td {
	vertical-align: middle;
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
}

.night-mode {
	div {
		color: #4d4d4d;
	}
}

#playlist-to-queue-selection {
	margin-top: 0;

	#playlists {
		font-size: 18px;

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

#playlists {
	.playlist {
		.button {
			width: 146px;
		}
	}
}

.song-actions-transition-enter-active {
	transition: all 0.2s ease;
}

.song-actions-transition-leave-active {
	transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.song-actions-transition-enter {
	transform: translateX(-20px);
	opacity: 0;
}

.song-actions-transition-leave-to {
	transform: translateX(20px);
	opacity: 0;
}
</style>
