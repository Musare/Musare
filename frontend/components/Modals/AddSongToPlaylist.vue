<template>
	<modal title="Add Song To Playlist">
		<template v-slot:body>
			<h4 class="songTitle">
				{{ $parent.currentSong.title }}
			</h4>
			<h5 class="songArtist">
				{{ $parent.currentSong.artists }}
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
		const _this = this;
		this.songId = this.$parent.currentSong.songId;
		this.song = this.$parent.currentSong;
		io.getSocket(socket => {
			_this.socket = socket;
			_this.socket.emit("playlists.indexForUser", res => {
				if (res.status === "success") {
					res.data.forEach(playlist => {
						_this.playlists[playlist._id] = playlist;
					});
					_this.recalculatePlaylists();
				}
			});
		});
	},
	methods: {
		addSongToPlaylist(playlistId) {
			const _this = this;
			this.socket.emit(
				"playlists.addSongToPlaylist",
				this.$parent.currentSong.songId,
				playlistId,
				res => {
					Toast.methods.addToast(res.message, 4000);
					if (res.status === "success") {
						_this.playlists[playlistId].songs.push(_this.song);
					}
					_this.recalculatePlaylists();
					// this.$parent.modals.addSongToPlaylist = false;
				}
			);
		},
		removeSongFromPlaylist(playlistId) {
			const _this = this;
			this.socket.emit(
				"playlists.removeSongFromPlaylist",
				_this.songId,
				playlistId,
				res => {
					Toast.methods.addToast(res.message, 4000);
					if (res.status === "success") {
						_this.playlists[playlistId].songs.forEach(
							(song, index) => {
								if (song.songId === _this.songId)
									_this.playlists[playlistId].songs.splice(
										index,
										1
									);
							}
						);
					}
					_this.recalculatePlaylists();
					// this.$parent.modals.addSongToPlaylist = false;
				}
			);
		},
		recalculatePlaylists() {
			const _this = this;
			_this.playlistsArr = Object.values(_this.playlists).map(
				playlist => {
					let hasSong = false;
					for (let i = 0; i < playlist.songs.length; i += 1) {
						if (playlist.songs[i].songId === _this.songId) {
							hasSong = true;
						}
					}

					playlist.hasSong = hasSong; // eslint-disable-line no-param-reassign
					_this.playlists[playlist._id] = playlist;
					return playlist;
				}
			);
		}
	}
};
</script>

<style lang="scss" scoped>
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
