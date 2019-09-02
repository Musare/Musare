<template>
	<modal title="Edit Playlist">
		<div slot="body">
			<nav class="level">
				<div class="level-item has-text-centered">
					<div>
						<p class="heading">
							Total Length
						</p>
						<p class="title">
							{{ totalLength() }}
						</p>
					</div>
				</div>
			</nav>
			<hr />
			<aside class="menu">
				<ul class="menu-list">
					<li v-for="(song, index) in playlist.songs" :key="index">
						<a href="#" target="_blank">{{ song.title }}</a>
						<div class="controls">
							<a href="#" v-on:click="promoteSong(song.songId)">
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
							<a href="#" v-on:click="demoteSong(song.songId)">
								<i
									v-if="playlist.songs.length - 1 !== index"
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
								v-on:click="removeSongFromPlaylist(song.songId)"
							>
								<i class="material-icons">delete</i>
							</a>
						</div>
					</li>
				</ul>
				<br />
			</aside>
			<div class="control is-grouped">
				<p class="control is-expanded">
					<input
						v-model="songQuery"
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
			<table v-if="songQueryResults.length > 0" class="table">
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
			<div class="control is-grouped">
				<p class="control is-expanded">
					<input
						v-model="importQuery"
						class="input"
						type="text"
						placeholder="YouTube Playlist URL"
						@keyup.enter="importPlaylist()"
					/>
				</p>
				<p class="control">
					<a class="button is-info" @click="importPlaylist()" href="#"
						>Import</a
					>
				</p>
			</div>
			<h5>Edit playlist details:</h5>
			<div class="control is-grouped">
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
		</div>
		<div slot="footer">
			<a class="button is-danger" v-on:click="removePlaylist()" href="#"
				>Remove Playlist</a
			>
		</div>
	</modal>
</template>

<script>
import { mapState, mapActions } from "vuex";

import { Toast } from "vue-roaster";
import Modal from "../Modal.vue";
import io from "../../../io";
import validation from "../../../validation";

export default {
	components: { Modal },
	data() {
		return {
			playlist: { songs: [] },
			songQueryResults: [],
			songQuery: "",
			importQuery: ""
		};
	},
	computed: mapState("user/playlists", {
		editing: state => state.editing
	}),
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
			this.socket.on("event:playlist.moveSongToBottom", data => {
				if (this.playlist._id === data.playlistId) {
					let songIndex;
					this.playlist.songs.forEach((song, index) => {
						if (song.songId === data.songId) songIndex = index;
					});
					const song = this.playlist.songs.splice(songIndex, 1)[0];
					this.playlist.songs.push(song);
				}
			});
			this.socket.on("event:playlist.moveSongToTop", data => {
				if (this.playlist._id === data.playlistId) {
					let songIndex;
					this.playlist.songs.forEach((song, index) => {
						if (song.songId === data.songId) songIndex = index;
					});
					const song = this.playlist.songs.splice(songIndex, 1)[0];
					this.playlist.songs.unshift(song);
				}
			});
		});
	},
	methods: {
		formatTime(duration) {
			if (duration <= 0) return "0 seconds";

			const hours = Math.floor(duration / (60 * 60));
			const formatHours = () => {
				if (hours > 0) {
					if (hours > 1) {
						if (hours < 10) return `0${hours} hours `;
						return `${hours} hours `;
					}
					return `0${hours} hour `;
				}
				return "";
			};

			const minutes = Math.floor((duration - hours) / 60);
			const formatMinutes = () => {
				if (minutes > 0) {
					if (minutes > 1) {
						if (minutes < 10) return `0${minutes} minutes `;
						return `${minutes} minutes `;
					}
					return `0${minutes} minute `;
				}
				return "";
			};

			const seconds = Math.floor(
				duration - hours * 60 * 60 - minutes * 60
			);
			const formatSeconds = () => {
				if (seconds > 0) {
					if (seconds > 1) {
						if (seconds < 10) return `0${seconds} seconds `;
						return `${seconds} seconds `;
					}
					return `0${seconds} second `;
				}
				return "";
			};

			return formatHours() + formatMinutes() + formatSeconds();
		},
		totalLength() {
			let length = 0;
			this.playlist.songs.forEach(song => {
				length += song.duration;
			});
			return this.formatTime(length);
		},
		searchForSongs() {
			let query = this.songQuery;
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
					Toast.methods.addToast(res.message, 3000);
			});
		},
		addSongToPlaylist(id) {
			this.socket.emit(
				"playlists.addSongToPlaylist",
				id,
				this.playlist._id,
				res => {
					Toast.methods.addToast(res.message, 4000);
				}
			);
		},
		importPlaylist() {
			Toast.methods.addToast(
				"Starting to import your playlist. This can take some time to do.",
				4000
			);
			this.socket.emit(
				"playlists.addSetToPlaylist",
				this.importQuery,
				this.playlist._id,
				res => {
					if (res.status === "success")
						this.playlist.songs = res.data;
					Toast.methods.addToast(res.message, 4000);
				}
			);
		},
		removeSongFromPlaylist(id) {
			this.socket.emit(
				"playlists.removeSongFromPlaylist",
				id,
				this.playlist._id,
				res => {
					Toast.methods.addToast(res.message, 4000);
				}
			);
		},
		renamePlaylist() {
			const { displayName } = this.playlist;
			if (!validation.isLength(displayName, 2, 32))
				return Toast.methods.addToast(
					"Display name must have between 2 and 32 characters.",
					8000
				);
			if (!validation.regex.azAZ09_.test(displayName))
				return Toast.methods.addToast(
					"Invalid display name format. Allowed characters: a-z, A-Z, 0-9 and _.",
					8000
				);

			return this.socket.emit(
				"playlists.updateDisplayName",
				this.playlist._id,
				this.playlist.displayName,
				res => {
					Toast.methods.addToast(res.message, 4000);
				}
			);
		},
		removePlaylist() {
			this.socket.emit("playlists.remove", this.playlist._id, res => {
				Toast.methods.addToast(res.message, 3000);
				if (res.status === "success") {
					this.closeModal();
				}
			});
		},
		promoteSong(songId) {
			this.socket.emit(
				"playlists.moveSongToTop",
				this.playlist._id,
				songId,
				res => {
					Toast.methods.addToast(res.message, 4000);
				}
			);
		},
		demoteSong(songId) {
			this.socket.emit(
				"playlists.moveSongToBottom",
				this.playlist._id,
				songId,
				res => {
					Toast.methods.addToast(res.message, 4000);
				}
			);
		},
		...mapActions("modals", ["closeModal"])
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.menu {
	padding: 0 20px;
}

.menu-list li {
	display: flex;
	justify-content: space-between;
}

.menu-list a:hover {
	color: $black !important;
}

li a {
	display: flex;
	align-items: center;
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
</style>
