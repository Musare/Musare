<template>
	<modal title="Add Song To Playlist">
		<template v-slot:body>
			<h4 class="songTitle">
				{{ currentSong.title }}
			</h4>
			<h5 class="songArtist">
				{{ currentSong.artists }}
			</h5>
			<aside class="menu">
				<p class="menu-label">
					Playlists
				</p>
				<ul class="menu-list">
					<li v-for="(playlist, index) in playlistsArr" :key="index">
						<div class="playlist">
							<span
								v-if="playlists[playlist._id].hasSong"
								class="icon is-small"
								@click="removeSongFromPlaylist(playlist._id)"
							>
								<i class="material-icons">playlist_add_check</i>
							</span>
							<span
								v-else
								class="icon"
								@click="addSongToPlaylist(playlist._id)"
							>
								<i class="material-icons">playlist_add</i>
							</span>
							{{ playlist.displayName }}
						</div>
					</li>
				</ul>
			</aside>
		</template>
	</modal>
</template>

<script>
import { mapState } from "vuex";

import { Toast } from "vue-roaster";
import Modal from "./Modal.vue";
import io from "../../io";

export default {
	components: { Modal },
	data() {
		return {
			playlists: {},
			playlistsArr: [],
			songId: null,
			song: null
		};
	},
	mounted() {
		this.songId = this.currentSong.songId;
		this.song = this.currentSong;
		io.getSocket(socket => {
			this.socket = socket;
			this.socket.emit("playlists.indexForUser", res => {
				if (res.status === "success") {
					res.data.forEach(playlist => {
						this.playlists[playlist._id] = playlist;
					});
					this.recalculatePlaylists();
				}
			});
		});
	},
	computed: {
		...mapState("station", {
			currentSong: state => state.currentSong
		})
	},
	methods: {
		addSongToPlaylist(playlistId) {
			this.socket.emit(
				"playlists.addSongToPlaylist",
				this.currentSong.songId,
				playlistId,
				res => {
					Toast.methods.addToast(res.message, 4000);
					if (res.status === "success") {
						this.playlists[playlistId].songs.push(this.song);
					}
					this.recalculatePlaylists();
				}
			);
		},
		removeSongFromPlaylist(playlistId) {
			this.socket.emit(
				"playlists.removeSongFromPlaylist",
				this.songId,
				playlistId,
				res => {
					Toast.methods.addToast(res.message, 4000);
					if (res.status === "success") {
						this.playlists[playlistId].songs.forEach(
							(song, index) => {
								if (song.songId === this.songId)
									this.playlists[playlistId].songs.splice(
										index,
										1
									);
							}
						);
					}
					this.recalculatePlaylists();
				}
			);
		},
		recalculatePlaylists() {
			this.playlistsArr = Object.values(this.playlists).map(playlist => {
				let hasSong = false;
				for (let i = 0; i < playlist.songs.length; i += 1) {
					if (playlist.songs[i].songId === this.songId) {
						hasSong = true;
					}
				}

				playlist.hasSong = hasSong; // eslint-disable-line no-param-reassign
				this.playlists[playlist._id] = playlist;
				return playlist;
			});
		}
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.icon.is-small {
	margin-right: 10px !important;
}
.songTitle {
	font-size: 22px;
	padding: 0 10px;
}
.songArtist {
	font-size: 19px;
	font-weight: 200;
	padding: 0 10px;
}
.menu-label {
	font-size: 16px;
}
</style>
