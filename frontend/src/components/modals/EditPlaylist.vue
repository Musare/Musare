<template>
	<modal title="Edit Playlist">
		<div slot="body">
			<nav class="level">
				<div class="level-item has-text-centered">
					<div>
						<p class="heading">Total Length</p>
						<p class="title">
							{{ totalLength() }}
						</p>
					</div>
				</div>
			</nav>
			<hr />
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
						:name="!drag ? 'draggable-list-transition' : null"
					>
						<li
							v-for="(song, index) in playlist.songs"
							:key="'key-' + index"
						>
							<a href="#" target="_blank"
								>({{ song.position }}) {{ song.title }}</a
							>
							<div
								class="controls"
								v-if="playlist.isUserModifiable"
							>
								<a href="#" @click="moveSongToTop(index)">
									<i class="material-icons" v-if="index > 0"
										>keyboard_arrow_up</i
									>
									<i
										v-else
										class="material-icons"
										style="opacity: 0"
										>error</i
									>
								</a>
								<a href="#" @click="moveSongToBottom(index)">
									<i
										v-if="
											playlist.songs.length - 1 !== index
										"
										class="material-icons"
										>keyboard_arrow_down</i
									>
									<i
										v-else
										class="material-icons"
										style="opacity: 0"
										>error</i
									>
								</a>
								<a
									href="#"
									@click="removeSongFromPlaylist(song.songId)"
								>
									<i class="material-icons">delete</i>
								</a>
							</div>
						</li>
					</transition-group>
				</draggable>
				<br />
			</aside>
			<div class="control is-grouped" v-if="playlist.isUserModifiable">
				<p class="control is-expanded">
					<input
						v-model="searchSongQuery"
						class="input"
						type="text"
						placeholder="Search for Song to add"
						autofocus
						@keyup.enter="searchForSongs()"
					/>
				</p>
				<p class="control">
					<a class="button is-info" @click="searchForSongs()" href="#"
						>Search</a
					>
				</p>
			</div>
			<table
				v-if="songQueryResults.length > 0 && playlist.isUserModifiable"
				class="table"
			>
				<tbody>
					<tr
						v-for="(result, index) in songQueryResults"
						:key="index"
					>
						<td>
							<img :src="result.thumbnail" />
						</td>
						<td>{{ result.title }}</td>
						<td>
							<a
								class="button is-success"
								href="#"
								@click="addSongToPlaylist(result.id)"
								>Add</a
							>
						</td>
					</tr>
				</tbody>
			</table>
			<div class="control is-grouped" v-if="playlist.isUserModifiable">
				<p class="control is-expanded">
					<input
						v-model="directSongQuery"
						class="input"
						type="text"
						placeholder="Enter a YouTube id or URL directly"
						autofocus
						@keyup.enter="addSong()"
					/>
				</p>
				<p class="control">
					<a class="button is-info" @click="addSong()" href="#"
						>Add</a
					>
				</p>
			</div>
			<div class="control is-grouped" v-if="playlist.isUserModifiable">
				<p class="control is-expanded">
					<input
						v-model="importQuery"
						class="input"
						type="text"
						placeholder="YouTube Playlist URL"
						@keyup.enter="importPlaylist(false)"
					/>
				</p>
				<p class="control">
					<a
						class="button is-info"
						@click="importPlaylist(true)"
						href="#"
						>Import music</a
					>
				</p>
				<p class="control">
					<a
						class="button is-info"
						@click="importPlaylist(false)"
						href="#"
						>Import all</a
					>
				</p>
			</div>
			<button
				class="button is-info"
				@click="shuffle()"
				v-if="playlist.isUserModifiable"
			>
				Shuffle
			</button>
			<h5>Edit playlist details:</h5>
			<div class="control is-grouped" v-if="playlist.isUserModifiable">
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
					<a class="button is-info" @click="renamePlaylist()" href="#"
						>Rename</a
					>
				</p>
			</div>
			<div class="control is-grouped">
				<div class="control select">
					<select v-model="playlist.privacy">
						<option value="private">Private</option>
						<option value="public">Public</option>
					</select>
				</div>
				<p class="control">
					<a class="button is-info" @click="updatePrivacy()" href="#"
						>Update Privacy</a
					>
				</p>
			</div>
		</div>
		<div slot="footer" v-if="playlist.isUserModifiable">
			<a class="button is-danger" @click="removePlaylist()" href="#"
				>Remove Playlist</a
			>
		</div>
	</modal>
</template>

<script>
import { mapState, mapActions } from "vuex";
import draggable from "vuedraggable";

import Toast from "toasters";
import Modal from "../Modal.vue";
import io from "../../io";
import validation from "../../validation";
import utils from "../../../js/utils";

export default {
	components: { Modal, draggable },
	data() {
		return {
			utils,
			drag: false,
			interval: null,
			playlist: { songs: [] },
			songQueryResults: [],
			searchSongQuery: "",
			directSongQuery: "",
			importQuery: ""
		};
	},
	computed: {
		...mapState("user/playlists", {
			editing: state => state.editing
		}),
		dragOptions() {
			return {
				animation: 200,
				group: "description",
				disabled: false,
				ghostClass: "draggable-list-ghost"
			};
		}
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;

			this.socket.emit("playlists.getPlaylist", this.editing, res => {
				if (res.status === "success") this.playlist = res.data;
				this.playlist.oldId = res.data._id;
			});

			this.socket.on("event:playlist.addSong", data => {
				if (this.playlist._id === data.playlistId)
					this.playlist.songs.push(data.song);
			});

			this.socket.on("event:playlist.removeSong", data => {
				if (this.playlist._id === data.playlistId) {
					this.playlist.songs.forEach((song, index) => {
						if (song.songId === data.songId)
							this.playlist.songs.splice(index, 1);
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
		});
	},
	methods: {
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

			this.socket.emit(
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
		searchForSongs() {
			let query = this.searchSongQuery;
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
			this.socket.emit("apis.searchYoutube", query, res => {
				if (res.status === "success") {
					this.songQueryResults = [];
					for (let i = 0; i < res.data.items.length; i += 1) {
						this.songQueryResults.push({
							id: res.data.items[i].id.videoId,
							url: `https://www.youtube.com/watch?v=${this.id}`,
							title: res.data.items[i].snippet.title,
							thumbnail:
								res.data.items[i].snippet.thumbnails.default.url
						});
					}
				} else if (res.status === "error")
					new Toast({ content: res.message, timeout: 3000 });
			});
		},
		addSongToPlaylist(id) {
			this.socket.emit(
				"playlists.addSongToPlaylist",
				false,
				id,
				this.playlist._id,
				res => {
					new Toast({ content: res.message, timeout: 4000 });
				}
			);
		},
		/* eslint-disable prefer-destructuring */
		addSong() {
			let id = "";

			if (this.directSongQuery.length === 11) id = this.directSongQuery;
			else {
				const match = this.directSongQuery.match("v=([0-9A-Za-z_-]+)");
				if (match.length > 0) id = match[1];
			}

			this.addSongToPlaylist(id);
		},
		/* eslint-enable prefer-destructuring */
		shuffle() {
			this.socket.emit("playlists.shuffle", this.playlist._id, res => {
				new Toast({ content: res.message, timeout: 4000 });
				if (res.status === "success") {
					this.playlist = res.data;
				}
			});
		},
		importPlaylist(musicOnly) {
			new Toast({
				content:
					"Starting to import your playlist. This can take some time to do.",
				timeout: 4000
			});
			this.socket.emit(
				"playlists.addSetToPlaylist",
				this.importQuery,
				this.playlist._id,
				musicOnly,
				res => {
					new Toast({ content: res.message, timeout: 20000 });
					if (res.status === "success") {
						if (musicOnly) {
							new Toast({
								content: `${res.stats.songsInPlaylistTotal} of the ${res.stats.videosInPlaylistTotal} videos in the playlist were songs.`,
								timeout: 20000
							});
						}
					}
				}
			);
		},
		removeSongFromPlaylist(id) {
			this.socket.emit(
				"playlists.removeSongFromPlaylist",
				id,
				this.playlist._id,
				res => {
					new Toast({ content: res.message, timeout: 4000 });
				}
			);
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

			return this.socket.emit(
				"playlists.updateDisplayName",
				this.playlist._id,
				this.playlist.displayName,
				res => {
					new Toast({ content: res.message, timeout: 4000 });
				}
			);
		},
		removePlaylist() {
			this.socket.emit("playlists.remove", this.playlist._id, res => {
				new Toast({ content: res.message, timeout: 3000 });
				if (res.status === "success") {
					this.closeModal({
						sector: "station",
						modal: "editPlaylist"
					});
				}
			});
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
				this.socket.emit(
					"playlists.updatePrivacy",
					this.playlist._id,
					privacy,
					res => {
						new Toast({ content: res.message, timeout: 4000 });
					}
				);
			}
		},
		...mapActions("modalVisibility", ["closeModal"])
	}
};
</script>

<style lang="scss" scoped>
@import "../../styles/global.scss";

.menu {
	padding: 0 20px;
}

.menu-list li {
	display: flex;
	justify-content: space-between;

	a {
		display: flex;
		align-items: center;
		cursor: move;

		&:hover {
			color: $black !important;
		}
	}
}

.controls {
	display: flex;

	a {
		display: flex;
		align-items: center;
	}
}

.table {
	margin-bottom: 0;
}

h5 {
	padding: 20px 0;
}

.control.select {
	flex-grow: 1;
	select {
		width: 100%;
	}
}
</style>
