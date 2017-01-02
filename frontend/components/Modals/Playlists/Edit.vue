<template>
	<modal title='Edit Playlist'>
		<div slot='body'>
			<aside class='menu' v-if='playlist.songs && playlist.songs.length > 0'>
				<ul class='menu-list'>
					<li v-for='song in playlist.songs' track-by='$index'>
						<a :href='' target='_blank'>{{ song.title }}</a>
						<div class='controls'>
							<a href='#' @click='promoteSong(song._id)'>
								<i class='material-icons' v-if='$index > 0'>keyboard_arrow_up</i>
								<i class='material-icons' style='opacity: 0' v-else>error</i>
							</a>
							<a href='#' @click='demoteSong(song._id)'>
								<i class='material-icons' v-if='playlist.songs.length - 1 !== $index'>keyboard_arrow_down</i>
								<i class='material-icons' style='opacity: 0' v-else>error</i>
							</a>
							<a href='#' @click='removeSongFromPlaylist(song._id)'><i class='material-icons'>delete</i></a>
						</div>
					</li>
				</ul>
				<br />
			</aside>
			<div class='control is-grouped'>
				<p class='control is-expanded'>
					<input class='input' type='text' placeholder='Search for Song to add' v-model='songQuery' autofocus @keyup.enter='searchForSongs()'>
				</p>
				<p class='control'>
					<a class='button is-info' @click='searchForSongs()' href="#">Search</a>
				</p>
			</div>
			<table class='table' v-if='songQueryResults.length > 0'>
				<tbody>
				<tr v-for='result in songQueryResults'>
					<td>
						<img :src='result.thumbnail' />
					</td>
					<td>{{ result.title }}</td>
					<td>
						<a class='button is-success' @click='addSongToPlaylist(result.id)' href='#'>
							Add
						</a>
					</td>
				</tr>
				</tbody>
			</table>
			<div class='control is-grouped'>
				<p class='control is-expanded'>
					<input class='input' type='text' placeholder='YouTube Playlist URL' v-model='importQuery' @keyup.enter="importPlaylist()">
				</p>
				<p class='control'>
					<a class='button is-info' @click='importPlaylist()' href="#">Import</a>
				</p>
			</div>
			<h5>Edit playlist details:</h5>
			<div class='control is-grouped'>
				<p class='control is-expanded'>
					<input class='input' type='text' placeholder='Playlist Display Name' v-model='playlist.displayName' @keyup.enter="renamePlaylist()">
				</p>
				<p class='control'>
					<a class='button is-info' @click='renamePlaylist()' href="#">Rename</a>
				</p>
			</div>
		</div>
		<div slot='footer'>
			<a class='button is-danger' @click='removePlaylist()' href="#">Remove Playlist</a>
		</div>
	</modal>
</template>

<script>
	import { Toast } from 'vue-roaster';
	import Modal from '../Modal.vue';
	import io from '../../../io';

	export default {
		components: { Modal },
		data() {
			return {
				playlist: {},
				songQueryResults: [],
				songQuery: '',
				importQuery: ''
			}
		},
		methods: {
			searchForSongs: function () {
				let _this = this;
				let query = _this.songQuery;
				if (query.indexOf('&index=') !== -1) {
					query = query.split('&index=');
					query.pop();
					query = query.join('');
				}
				if (query.indexOf('&list=') !== -1) {
					query = query.split('&list=');
					query.pop();
					query = query.join('');
				}
				_this.socket.emit('apis.searchYoutube', query, res => {
					if (res.status == 'success') {
						_this.songQueryResults = [];
						for (let i = 0; i < res.data.items.length; i++) {
							_this.songQueryResults.push({
								id: res.data.items[i].id.videoId,
								url: `https://www.youtube.com/watch?v=${this.id}`,
								title: res.data.items[i].snippet.title,
								thumbnail: res.data.items[i].snippet.thumbnails.default.url
							});
						}
					} else if (res.status === 'error') Toast.methods.addToast(res.message, 3000);
				});
			},
			addSongToPlaylist: function (id) {
				let _this = this;
				_this.socket.emit('playlists.addSongToPlaylist', id, _this.playlist._id, res => {
					Toast.methods.addToast(res.message, 4000);
				});
			},
			importPlaylist: function () {
				let _this = this;
				Toast.methods.addToast('Starting to import your playlist. This can take some time to do.', 4000);
				this.socket.emit('playlists.addSetToPlaylist', _this.importQuery, _this.playlist._id, res => {
					if (res.status === 'success') _this.playlist.songs = res.data;
					Toast.methods.addToast(res.message, 4000);
				});
			},
			removeSongFromPlaylist: function (id) {
				let _this = this;
				this.socket.emit('playlists.removeSongFromPlaylist', id, _this.playlist._id, res => {
					Toast.methods.addToast(res.message, 4000);
				});
			},
			renamePlaylist: function () {
				this.socket.emit('playlists.updateDisplayName', this.playlist._id, this.playlist.displayName, res => {
					Toast.methods.addToast(res.message, 4000);
				});
			},
			removePlaylist: function () {
				let _this = this;
				_this.socket.emit('playlists.remove', _this.playlist._id, res => {
					Toast.methods.addToast(res.message, 3000);
					if (res.status === 'success') {
						_this.$parent.modals.editPlaylist = !_this.$parent.modals.editPlaylist;
					}
				});
			},
			promoteSong: function (songId) {
				let _this = this;
				_this.socket.emit('playlists.moveSongToTop', _this.playlist._id, songId, res => {
					Toast.methods.addToast(res.message, 4000);
				});
			},
			demoteSong: function (songId) {
				let _this = this;
				_this.socket.emit('playlists.moveSongToBottom', _this.playlist._id, songId, res => {
					Toast.methods.addToast(res.message, 4000);
				});
			}
		},
		ready: function () {
			let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;
				_this.socket.emit('playlists.getPlaylist', _this.$parent.playlistBeingEdited, res => {
					if (res.status == 'success') _this.playlist = res.data; _this.playlist.oldId = res.data._id;
				});
				_this.socket.on('event:playlist.addSong', (data) => {
					if (_this.playlist._id === data.playlistId) _this.playlist.songs.push(data.song);
				});
				_this.socket.on('event:playlist.removeSong', (data) => {
					if (_this.playlist._id === data.playlistId) {
						_this.playlist.songs.forEach((song, index) => {
							if (song._id === data.songId) _this.playlist.songs.splice(index, 1);
						});
					}
				});
				_this.socket.on('event:playlist.updateDisplayName', (data) => {
					if (_this.playlist._id === data.playlistId) _this.playlist.displayName = data.displayName;
				});
				_this.socket.on('event:playlist.moveSongToBottom', (data) => {
					if (_this.playlist._id === data.playlistId) {
						let songIndex;
						_this.playlist.songs.forEach((song, index) => {
							if (song._id === data.songId) songIndex = index;
						});
						let song = _this.playlist.songs.splice(songIndex, 1)[0];
						_this.playlist.songs.push(song);
					}
				});
				_this.socket.on('event:playlist.moveSongToTop', (data) => {
					if (_this.playlist._id === data.playlistId) {
						let songIndex;
						_this.playlist.songs.forEach((song, index) => {
							if (song._id === data.songId) songIndex = index;
						});
						let song = _this.playlist.songs.splice(songIndex, 1)[0];
						_this.playlist.songs.unshift(song);
					}
				});
			});
		},
		events: {
			closeModal: function() {
				this.$parent.modals.editPlaylist = !this.$parent.modals.editPlaylist;
			}
		}
	}
</script>

<style type='scss' scoped>
	.menu { padding: 0 20px; }

	.menu-list li {
		display: flex;
		justify-content: space-between;
	}

	.menu-list a:hover { color: #000 !important; }

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

	h5 { padding: 20px 0; }
</style>