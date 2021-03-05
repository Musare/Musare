<template>
	<modal
		:title="
			userId === playlist.createdBy ? 'Edit Playlist' : 'View Playlist'
		"
		class="edit-playlist-modal"
	>
		<div
			slot="body"
			:class="{
				'view-only': !isEditable(),
				'edit-playlist-modal-inner-container': true
			}"
		>
			<div id="first-column">
				<div id="playlist-info-section" class="section">
					<h3>{{ playlist.displayName }}</h3>
					<h5>Duration: {{ totalLength() }}</h5>
				</div>

				<div id="playlist-settings-section" class="section">
					<div v-if="isEditable()">
						<h4 class="section-title">Edit Details</h4>

						<p class="section-description">
							Change the display name and privacy of the playlist.
						</p>

						<hr class="section-horizontal-rule" />

						<label class="label"> Change display name </label>

						<div class="control is-grouped input-with-button">
							<p class="control is-expanded">
								<input
									v-model="playlist.displayName"
									class="input"
									type="text"
									placeholder="Playlist Display Name"
									@keyup.enter="renamePlaylist()"
								/>
							</p>
							<p class="control">
								<a
									class="button is-info"
									@click.prevent="renamePlaylist()"
									href="#"
									>Rename</a
								>
							</p>
						</div>
					</div>

					<div v-if="userId === playlist.createdBy">
						<label class="label"> Change privacy </label>
						<div class="control is-grouped input-with-button">
							<div class="control is-expanded select">
								<select v-model="playlist.privacy">
									<option value="private">Private</option>
									<option value="public">Public</option>
								</select>
							</div>
							<p class="control">
								<a
									class="button is-info"
									@click.prevent="updatePrivacy()"
									href="#"
									>Update Privacy</a
								>
							</p>
						</div>
					</div>
				</div>

				<div
					id="import-from-youtube-section"
					class="section"
					v-if="isEditable()"
				>
					<h4 class="section-title">Import from YouTube</h4>

					<p class="section-description">
						Import a playlist or song by searching or using a link
						from YouTube.
					</p>

					<hr class="section-horizontal-rule" />

					<label class="label">
						Search for a playlist from YouTube
					</label>
					<div class="control is-grouped input-with-button">
						<p class="control is-expanded">
							<input
								class="input"
								type="text"
								placeholder="Enter YouTube Playlist URL here..."
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

					<label class="label">
						Search for a song from YouTube
					</label>
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

					<div
						v-if="search.songs.results.length > 0"
						id="song-query-results"
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
										<i
											class="material-icons icon-with-button"
											>done</i
										>
										Added to playlist
									</a>
									<a
										class="button is-dark"
										v-else
										@click.prevent="
											addSongToPlaylist(result.id, index)
										"
										href="#"
										key="add-to-playlist"
									>
										<i
											class="material-icons icon-with-button"
											>add</i
										>
										Add to playlist
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
				</div>
			</div>

			<div id="second-column">
				<div id="rearrange-songs-section" class="section">
					<div v-if="isEditable()">
						<h4 class="section-title">Rearrange Songs</h4>

						<p class="section-description">
							Drag and drop songs to change their order
						</p>

						<hr class="section-horizontal-rule" />
					</div>

					<aside class="menu">
						<draggable
							class="menu-list scrollable-list"
							tag="ul"
							v-if="playlist.songs.length > 0"
							v-model="playlist.songs"
							v-bind="dragOptions"
							@start="drag = true"
							@end="drag = false"
							@change="updateSongPositioning"
						>
							<transition-group
								type="transition"
								:name="
									!drag ? 'draggable-list-transition' : null
								"
							>
								<li
									v-for="(song, index) in playlist.songs"
									:key="'key-' + index"
								>
									<playlist-song-item
										:song="song"
										:class="{
											'item-draggable': isEditable()
										}"
									>
										<div slot="actions">
											<i
												class="material-icons"
												v-if="isEditable() && index > 0"
												@click="moveSongToTop(index)"
												>vertical_align_top</i
											>
											<i
												v-else
												class="material-icons"
												style="opacity: 0"
												>error</i
											>

											<i
												v-if="
													isEditable() &&
														playlist.songs.length -
															1 !==
															index
												"
												@click="moveSongToBottom(index)"
												class="material-icons"
												>vertical_align_bottom</i
											>
											<i
												v-else
												class="material-icons"
												style="opacity: 0"
												>error</i
											>

											<i
												v-if="!song.simpleSong"
												class="material-icons report-icon"
												@click="
													reportSongInPlaylist(song)
												"
											>
												flag
											</i>
											<i
												v-if="!song.simpleSong"
												class="material-icons edit-icon"
												@click="
													editSongInPlaylist(song)
												"
											>
												edit
											</i>

											<i
												v-if="
													userId ===
														playlist.createdBy
												"
												@click="
													removeSongFromPlaylist(
														song.songId
													)
												"
												class="material-icons delete-icon"
												>delete</i
											>
										</div>
									</playlist-song-item>
								</li>
							</transition-group>
						</draggable>
						<p v-else class="nothing-here-text">
							This playlist doesn't have any songs.
						</p>
					</aside>
				</div>
			</div>

			<!--
			
			
			<button
				class="button is-info"
				@click="shuffle()"
				v-if="playlist.isUserModifiable"
			>
				Shuffle
			</button>
			<h5>Edit playlist details:</h5>
			 -->
		</div>
		<div slot="footer">
			<a
				class="button is-default"
				v-if="
					this.userId === this.playlist.createdBy ||
						this.playlist.privacy === 'public'
				"
				@click="downloadPlaylist()"
				href="#"
			>
				Download Playlist
			</a>
			<a
				class="button is-danger"
				@click="removePlaylist()"
				href="#"
				v-if="isEditable()"
			>
				Remove Playlist
			</a>
		</div>
	</modal>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";
import draggable from "vuedraggable";
import Toast from "toasters";

import SearchYoutube from "../../../mixins/SearchYoutube.vue";

import Modal from "../../Modal.vue";
import SearchQueryItem from "../../ui/SearchQueryItem.vue";
import PlaylistSongItem from "./components/PlaylistSongItem.vue";

import validation from "../../../validation";
import utils from "../../../../js/utils";

export default {
	components: { Modal, draggable, SearchQueryItem, PlaylistSongItem },
	mixins: [SearchYoutube],
	data() {
		return {
			utils,
			drag: false,
			serverDomain: "",
			playlist: { songs: [] }
		};
	},

	computed: {
		...mapState("user/playlists", {
			editing: state => state.editing
		}),
		...mapState({ userId: state => state.user.auth.userId }),
		dragOptions() {
			return {
				animation: 200,
				group: "description",
				disabled: !this.isEditable(),
				ghostClass: "draggable-list-ghost"
			};
		},
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	watch: {
		"search.songs.results": function checkIfSongInPlaylist(songs) {
			songs.forEach((searchItem, index) =>
				this.playlist.songs.find(song => {
					if (song.songId === searchItem.id)
						this.search.songs.results[index].isAddedToQueue = true;

					return song.songId === searchItem.id;
				})
			);
		}
	},
	mounted() {
		this.socket.dispatch("playlists.getPlaylist", this.editing, res => {
			if (res.status === "success") {
				this.playlist = res.data;
				this.playlist.songs.sort((a, b) => a.position - b.position);
			}

			this.playlist.oldId = res.data._id;
		});

		this.socket.on("event:playlist.addSong", data => {
			if (this.playlist._id === data.playlistId)
				this.playlist.songs.push(data.song);
		});

		this.socket.on("event:playlist.removeSong", data => {
			if (this.playlist._id === data.playlistId) {
				// remove song from array of playlists
				this.playlist.songs.forEach((song, index) => {
					if (song.songId === data.songId)
						this.playlist.songs.splice(index, 1);
				});

				// if this song is in search results, mark it available to add to the playlist again
				this.search.songs.results.forEach((searchItem, index) => {
					if (data.songId === searchItem.id) {
						this.search.songs.results[index].isAddedToQueue = false;
					}
				});
			}
		});

		this.socket.on("event:playlist.updateDisplayName", data => {
			if (this.playlist._id === data.playlistId)
				this.playlist.displayName = data.displayName;
		});

		this.socket.on("event:playlist.repositionSongs", data => {
			if (this.playlist._id === data.playlistId) {
				// for each song that has a new position
				data.songsBeingChanged.forEach(changedSong => {
					this.playlist.songs.forEach((song, index) => {
						// find song locally
						if (song.songId === changedSong.songId) {
							// change song position attribute
							this.playlist.songs[index].position =
								changedSong.position;

							// reposition in array if needed
							if (index !== changedSong.position - 1)
								this.playlist.songs.splice(
									changedSong.position - 1,
									0,
									this.playlist.songs.splice(index, 1)[0]
								);
						}
					});
				});
			}
		});
	},
	methods: {
		editSongInPlaylist(song) {
			this.$parent.editingSongId = song._id;
			this.openModal({ sector: "station", modal: "editSong" });
		},
		reportSongInPlaylist(song) {
			this.reportSong(song);
			this.openModal({ sector: "station", modal: "report" });
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

			return this.socket.dispatch(
				"playlists.addSetToPlaylist",
				this.search.playlist.query,
				this.playlist._id,
				this.search.playlist.isImportingOnlyMusic,
				res => {
					new Toast({ content: res.message, timeout: 20000 });
					if (res.status === "success") {
						isImportingPlaylist = false;
						if (this.search.playlist.isImportingOnlyMusic) {
							new Toast({
								content: `${res.stats.songsInPlaylistTotal} of the ${res.stats.videosInPlaylistTotal} videos in the playlist were songs.`,
								timeout: 20000
							});
						}
					}
				}
			);
		},
		isEditable() {
			return (
				this.playlist.isUserModifiable &&
				this.userId === this.playlist.createdBy
			);
		},
		updateSongPositioning({ moved }) {
			if (!moved) return; // we only need to update when song is moved

			const songsBeingChanged = [];

			this.playlist.songs.forEach((song, index) => {
				if (song.position !== index + 1)
					songsBeingChanged.push({
						songId: song.songId,
						position: index + 1
					});
			});

			this.socket.dispatch(
				"playlists.repositionSongs",
				this.playlist._id,
				songsBeingChanged,
				res => {
					new Toast({ content: res.message, timeout: 4000 });
				}
			);
		},
		totalLength() {
			let length = 0;
			this.playlist.songs.forEach(song => {
				length += song.duration;
			});
			return this.utils.formatTimeLong(length);
		},
		shuffle() {
			this.socket.dispatch(
				"playlists.shuffle",
				this.playlist._id,
				res => {
					new Toast({ content: res.message, timeout: 4000 });
					if (res.status === "success") {
						this.playlist.songs = res.data.songs.sort(
							(a, b) => a.position - b.position
						);
					}
				}
			);
		},
		addSongToPlaylist(id, index) {
			this.socket.dispatch(
				"playlists.addSongToPlaylist",
				false,
				id,
				this.playlist._id,
				res => {
					new Toast({ content: res.message, timeout: 4000 });
					if (res.status === "success")
						this.search.songs.results[index].isAddedToQueue = true;
				}
			);
		},
		removeSongFromPlaylist(id) {
			if (this.playlist.displayName === "Liked Songs") {
				this.socket.dispatch("songs.unlike", id, res => {
					new Toast({ content: res.message, timeout: 4000 });
				});
			}
			if (this.playlist.displayName === "Disliked Songs") {
				this.socket.dispatch("songs.undislike", id, res => {
					new Toast({ content: res.message, timeout: 4000 });
				});
			} else {
				this.socket.dispatch(
					"playlists.removeSongFromPlaylist",
					id,
					this.playlist._id,
					res => {
						new Toast({ content: res.message, timeout: 4000 });
					}
				);
			}
		},
		renamePlaylist() {
			const { displayName } = this.playlist;
			if (!validation.isLength(displayName, 2, 32))
				return new Toast({
					content:
						"Display name must have between 2 and 32 characters.",
					timeout: 8000
				});
			if (!validation.regex.ascii.test(displayName))
				return new Toast({
					content:
						"Invalid display name format. Only ASCII characters are allowed.",
					timeout: 8000
				});

			return this.socket.dispatch(
				"playlists.updateDisplayName",
				this.playlist._id,
				this.playlist.displayName,
				res => {
					new Toast({ content: res.message, timeout: 4000 });
				}
			);
		},
		removePlaylist() {
			this.socket.dispatch("playlists.remove", this.playlist._id, res => {
				new Toast({ content: res.message, timeout: 3000 });
				if (res.status === "success") {
					this.closeModal({
						sector: "station",
						modal: "editPlaylist"
					});
				}
			});
		},
		async downloadPlaylist() {
			if (this.serverDomain === "")
				this.serverDomain = await lofig.get("serverDomain");

			fetch(
				`${this.serverDomain}/export/privatePlaylist/${this.playlist._id}`,
				{ credentials: "include" }
			)
				.then(res => res.blob())
				.then(blob => {
					const url = window.URL.createObjectURL(blob);

					const a = document.createElement("a");
					a.style.display = "none";
					a.href = url;

					a.download = `musare-privateplaylist-${
						this.playlist._id
					}-${new Date().toISOString()}.json`;

					document.body.appendChild(a);
					a.click();
					window.URL.revokeObjectURL(url);

					new Toast({
						content: "Successfully downloaded playlist.",
						timeout: 3000
					});
				})
				.catch(
					() =>
						new Toast({
							content: "Failed to export and download playlist.",
							timeout: 3000
						})
				);
		},
		moveSongToTop(index) {
			this.playlist.songs.splice(
				0,
				0,
				this.playlist.songs.splice(index, 1)[0]
			);

			this.updateSongPositioning({ moved: {} });
		},
		moveSongToBottom(index) {
			this.playlist.songs.splice(
				this.playlist.songs.length,
				0,
				this.playlist.songs.splice(index, 1)[0]
			);

			this.updateSongPositioning({ moved: {} });
		},
		updatePrivacy() {
			const { privacy } = this.playlist;
			if (privacy === "public" || privacy === "private") {
				this.socket.dispatch(
					"playlists.updatePrivacy",
					this.playlist._id,
					privacy,
					res => {
						new Toast({ content: res.message, timeout: 4000 });
					}
				);
			}
		},
		...mapActions("modals/report", ["reportSong"]),
		...mapActions("modalVisibility", ["openModal", "closeModal"])
	}
};
</script>

<style lang="scss">
.edit-playlist-modal {
	.modal-card {
		width: 1300px;

		.modal-card-body {
			padding: 16px;
		}
	}

	.modal-card-foot {
		justify-content: flex-end;
	}
}
</style>

<style lang="scss" scoped>
.night-mode {
	.section {
		background-color: var(--dark-grey-3) !important;
	}

	.label,
	p,
	strong {
		color: var(--light-grey-2);
	}
}

.menu-list li {
	display: flex;
	justify-content: space-between;

	&:not(:last-of-type) {
		margin-bottom: 10px;
	}

	a {
		display: flex;
	}
}

.controls {
	display: flex;

	a {
		display: flex;
		align-items: center;
	}
}

@media screen and (max-width: 1300px) {
	.edit-playlist-modal .edit-playlist-modal-inner-container {
		height: auto !important;

		#import-from-youtube-section #song-query-results,
		.section {
			max-width: 100% !important;
		}
	}
}

.edit-playlist-modal {
	.edit-playlist-modal-inner-container {
		display: flex;
		flex-wrap: wrap;
		height: 100%;

		&.view-only {
			height: auto !important;

			#first-column {
				break-after: always;
			}

			.section {
				max-width: 100% !important;
			}
		}
	}

	.nothing-here-text {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.section {
		padding: 15px !important;
		margin: 0 10px;
		max-width: 600px;
		display: flex;
		flex-direction: column;
		flex-grow: 1;
	}

	.label {
		font-size: 1rem;
		font-weight: normal;
	}

	.input-with-button .button {
		width: 150px;
	}

	#first-column {
		max-width: 100%;
		height: 100%;
		overflow-y: auto;
		flex-grow: 1;

		.section {
			width: auto;
		}

		#playlist-info-section {
			border: 1px solid var(--light-grey-3);
			border-radius: 3px;
			padding: 15px !important;

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

		#import-from-youtube-section {
			#playlist-import-type select {
				border-radius: 0;
			}

			#song-query-results {
				padding: 10px;
				margin-top: 10px;
				border: 1px solid var(--light-grey-3);
				border-radius: 3px;
				max-width: 565px;

				.search-query-item:not(:last-of-type) {
					margin-bottom: 10px;
				}
			}

			.load-more-button {
				width: 100%;
				margin-top: 10px;
			}
		}
	}

	#second-column {
		max-width: 100%;
		height: 100%;
		overflow-y: auto;
		flex-grow: 1;
	}
}
</style>
