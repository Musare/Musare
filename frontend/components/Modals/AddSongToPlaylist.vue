<template>
	<modal title='Add Song To Playlist'>
		<div slot='body'>
			<aside class="menu">
				<p class="menu-label">
					Playlists
				</p>
				<ul class="menu-list">
					<li v-for='playlist in playlists'>
						<div class='playlist'>
							<span class='icon is-small' @click='removeSongFromPlaylist(playlist._id)' v-if='playlistContains(playlist._id)'>
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
				playlists: {}
			}
		},
		methods: {
			playlistContains: function (playlistId) {
				let _this = this;
				let toReturn = false;

				let playlist = this.playlists.filter(playlist => {
				    return playlist._id === playlistId;
				})[0];

				for (let i = 0; i < playlist.songs.length; i++) {
					if (playlist.songs[i].songId === _this.$parent.currentSong.songId) {
						toReturn = true;
					}
				}

				return toReturn;
			},
			addSongToPlaylist: function (playlistId) {
				let _this = this;
				this.socket.emit('playlists.addSongToPlaylist', this.$parent.currentSong.songId, playlistId, res => {
					Toast.methods.addToast(res.message, 4000);
					this.$parent.modals.addSongToPlaylist = false;
				});
			},
			removeSongFromPlaylist: function (playlistId) {
				let _this = this;
				this.socket.emit('playlists.removeSongFromPlaylist', this.$parent.currentSong.songId, playlistId, res => {
					Toast.methods.addToast(res.message, 4000);
					this.$parent.modals.addSongToPlaylist = false;
				});
			}
		},
		ready: function () {
			let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;
				_this.socket.emit('playlists.indexForUser', res => {
					if (res.status === 'success') _this.playlists = res.data;
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
