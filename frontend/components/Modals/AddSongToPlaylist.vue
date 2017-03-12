<template>
	<modal title='Add Song To Playlist'>
		<div slot='body'>
			<aside class="menu">
				<p class="menu-label">
					Playlists
				</p>
				<ul class="menu-list">
					<li v-for='playlist in playlistsArr'>
						<div class='playlist'>
							<span class='icon is-small' @click='removeSongFromPlaylist(playlist._id)' v-if='playlists[playlist._id].hasSong'>
								<i class="material-icons">playlist_add_check</i>
							</span>
							<span class='icon is-small' @click='addSongToPlaylist(playlist._id)' v-else>
								<i class="material-icons">playlist_add</i>
							</span>
							{{ playlist.displayName }}
						</div>
					</li>
				</ul>
				</aside>
		</div>
	</modal>
</template>

<script>
	import { Toast } from 'vue-roaster';
	import Modal from './Modal.vue';
	import io from '../../io';
	import auth from '../../auth';

	export default {
		data() {
			return {
				playlists: {},
				playlistsArr: [],
				songId: null,
				song: null
			}
		},
		methods: {
			addSongToPlaylist: function (playlistId) {
				let _this = this;
				this.socket.emit('playlists.addSongToPlaylist', this.$parent.currentSong.songId, playlistId, res => {
					Toast.methods.addToast(res.message, 4000);
					if (res.status === 'success') {
						_this.playlists[playlistId].songs.push(_this.song);
					}
					_this.recalculatePlaylists();
					//this.$parent.modals.addSongToPlaylist = false;
				});
			},
			removeSongFromPlaylist: function (playlistId) {
				let _this = this;
				this.socket.emit('playlists.removeSongFromPlaylist', _this.songId, playlistId, res => {
					Toast.methods.addToast(res.message, 4000);
					if (res.status === 'success') {
						_this.playlists[playlistId].songs.forEach((song, index) => {
							if (song.songId === _this.songId) _this.playlists[playlistId].songs.splice(index, 1);
						});
					}
					_this.recalculatePlaylists();
					//this.$parent.modals.addSongToPlaylist = false;
				});
			},
			recalculatePlaylists: function() {
				let _this = this;
				_this.playlistsArr = Object.values(_this.playlists).map((playlist) => {
					let hasSong = false;
					for (let i = 0; i < playlist.songs.length; i++) {
						if (playlist.songs[i].songId === _this.songId) {
							hasSong = true;
						}
					}
					playlist.hasSong = hasSong;
					_this.playlists[playlist._id] = playlist;
					return playlist;
				});
			}
		},
		ready: function () {
			let _this = this;
			this.songId = this.$parent.currentSong.songId;
			this.song = this.$parent.currentSong;
			io.getSocket((socket) => {
				_this.socket = socket;
				_this.socket.emit('playlists.indexForUser', res => {
					if (res.status === 'success') {
						res.data.forEach((playlist) => {
							_this.playlists[playlist._id] = playlist;
						});
						_this.recalculatePlaylists();
					}
				});
			});
		},
		events: {
			closeModal: function () {
				this.$parent.modals.addSongToPlaylist = !this.$parent.modals.addSongToPlaylist;
			}
		},
		components: { Modal }
	}
</script>

<style type='scss' scoped>
	.icon.is-small {
		margin-right: 10px !important;
	}
</style>
